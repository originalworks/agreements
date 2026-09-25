use crate::{
    config::aa_aws_lambda::AaAwsLambdaConfig,
    contract::aws::build_aa_tx_request,
    parser::parse_tokenization_requests,
    submitter::aa_aws::AcceptedDdexSubmittersBuilderForAa,
    validator::{TokenizationRequestValidator, ValidatorResult},
};
use aa_sqs_queue::{message_body::ToJsonString, queue::SqsQueue};
use aws_lambda_events::sqs::SqsEvent;
use lambda_runtime::{LambdaEvent, tracing};
use network::{NetworkContext, store::NetworkStore};
use request::{
    TokenizationRequest, TokenizationRequestStatus,
    batch::{TokenizationRequestBatch, sort_into_batches},
};
use std::sync::{Arc, Mutex};
use tokenization_networks_db::TokenizationNetworkRepo;
use tokenization_request_batches_db::TokenizationRequestBatchRepo;
use tokenization_requests_db::TokenizationRequestRepo;

pub struct AwsWithAaOrchestrator {
    pub network_store: Arc<Mutex<NetworkStore>>,
    pub tokenization_request_repo: TokenizationRequestRepo,
    pub tokenization_request_batch_repo: TokenizationRequestBatchRepo,
    pub oward_instance_name: String,
    pub aa_tx_request_queue: SqsQueue,
    pub tokenization_request_validator: TokenizationRequestValidator,
    pub accepted_ddex_submitters_builder: AcceptedDdexSubmittersBuilderForAa,
}

impl AwsWithAaOrchestrator {
    pub async fn build(
        pool: &sqlx::Pool<sqlx::Postgres>,
        aws_config: &aws_config::SdkConfig,
        aa_aws_lambda_config: &AaAwsLambdaConfig,
    ) -> anyhow::Result<Self> {
        let tokenization_network_repo = TokenizationNetworkRepo::new(pool.clone());
        let tokenization_request_repo = TokenizationRequestRepo::new(pool.clone());
        let tokenization_request_batch_repo = TokenizationRequestBatchRepo::new(pool.clone());
        let networks = tokenization_network_repo.select_all().await?;
        let network_store = Arc::new(Mutex::new(NetworkStore::build(&networks)?));
        let accepted_ddex_submitters_builder = AcceptedDdexSubmittersBuilderForAa::build(
            &aa_aws_lambda_config.validation_config,
            Arc::clone(&network_store),
        );

        let sqs_client = aws_sdk_sqs::Client::new(&aws_config);
        let sqs_queue = SqsQueue::build(
            &sqs_client,
            &aa_aws_lambda_config.env_vars.aa_tx_request_queue_url,
            &aa_aws_lambda_config
                .env_vars
                .aa_tx_request_queue_message_group_id,
        )?;
        let tokenization_request_validator = TokenizationRequestValidator::build(
            &aa_aws_lambda_config.validation_config,
            &aa_aws_lambda_config.indexers_urls,
            Arc::clone(&network_store),
        );

        Ok(Self {
            network_store: Arc::clone(&network_store),
            tokenization_request_repo,
            oward_instance_name: aa_aws_lambda_config.env_vars.oward_instance_name.clone(),
            aa_tx_request_queue: sqs_queue,
            tokenization_request_batch_repo,
            tokenization_request_validator,
            accepted_ddex_submitters_builder,
        })
    }

    pub async fn lambda_function_handler(
        &self,
        event: LambdaEvent<SqsEvent>,
    ) -> anyhow::Result<(), lambda_runtime::Error> {
        let tokenization_requests = parse_tokenization_requests(event)?;
        let tokenization_requests = self
            .tokenization_request_validator
            .filter_invalid_networks(tokenization_requests)
            .await?
            .accepted;

        let tokenization_requests = self
            .tokenization_request_repo
            .insert_many(tokenization_requests)
            .await?;

        let validator_result = self
            .tokenization_request_validator
            .filter_invalid_tx_input(tokenization_requests)
            .await?;
        let tokenization_requests = self.handle_rejected(validator_result).await?;

        let validator_result = self
            .tokenization_request_validator
            .filter_duplicates(tokenization_requests)
            .await?;
        let tokenization_requests = self.handle_rejected(validator_result).await?;

        let validator_result = self
            .tokenization_request_validator
            .filter_mismatched_submitters(
                tokenization_requests,
                self.accepted_ddex_submitters_builder.clone(),
            )
            .await?;
        let tokenization_requests = self.handle_rejected(validator_result).await?;

        let tokenization_request_batches = match sort_into_batches(&tokenization_requests) {
            Ok(mut batches) => {
                self.calculate_batch_creation_fee_for_many(&mut batches)
                    .await?;
                self.tokenization_request_batch_repo
                    .insert_many(&batches)
                    .await?;
                batches
            }
            Err(err) => {
                self.tokenization_request_repo
                    .update_many_rejected_with_reason(
                        &tokenization_requests
                            .iter()
                            .map(|r| r.tokenization_id.clone())
                            .collect(),
                        err.to_string(),
                    )
                    .await?;
                tracing::warn!("Error while creating batches: {:?}", tokenization_requests);
                return Ok(());
            }
        };

        for mut tokenization_request_batch in tokenization_request_batches {
            match self
                .process_tokenization_request_batch(&mut tokenization_request_batch)
                .await
            {
                Ok(_) => {
                    self.tokenization_request_repo
                        .update_status_for_many(
                            &tokenization_request_batch.get_tokenization_ids(),
                            TokenizationRequestStatus::SUBMITTED,
                        )
                        .await?;
                }
                Err(err) => {
                    tracing::warn!("Error while processing batch: {:?}", err);
                    self.tokenization_request_repo
                        .update_many_rejected_with_reason(
                            &tokenization_request_batch.get_tokenization_ids(),
                            err.to_string(),
                        )
                        .await?;
                }
            };
        }
        Ok(())
    }

    async fn calculate_batch_creation_fee_for_many(
        &self,
        batches: &mut Vec<TokenizationRequestBatch>,
    ) -> anyhow::Result<()> {
        for batch in batches.iter_mut() {
            let creation_fee = self
                .try_netwrok_by_chain_id(batch.chain_id)
                .await?
                .try_creation_fee()?;
            batch.calculate_batch_creation_fee(creation_fee)?;
        }
        Ok(())
    }

    pub async fn try_netwrok_by_chain_id(&self, chain_id: i64) -> anyhow::Result<NetworkContext> {
        let network;

        {
            let mut network_store = self
                .network_store
                .lock()
                .expect("Failed to acquire lock on network_store");
            network = network_store.try_network_by_chain_id(chain_id).await?;
        }
        Ok(network)
    }

    pub async fn process_tokenization_request_batch(
        &self,
        tokenization_request_batch: &mut TokenizationRequestBatch,
    ) -> anyhow::Result<()> {
        let network = self
            .try_netwrok_by_chain_id(tokenization_request_batch.chain_id)
            .await?;

        let aa_tx_request_body = build_aa_tx_request(
            &self.oward_instance_name,
            tokenization_request_batch,
            &network,
        )?;

        self.aa_tx_request_queue
            .send_new(&aa_tx_request_body.to_json_string()?)
            .await?;

        Ok(())
    }

    pub async fn handle_rejected(
        &self,
        result: ValidatorResult,
    ) -> anyhow::Result<Vec<TokenizationRequest>> {
        for rejected in result.rejected {
            self.tokenization_request_repo
                .update_rejected_with_reason(
                    &rejected.tokenization_request.tokenization_id,
                    rejected.reason,
                )
                .await?;
        }
        Ok(result.accepted)
    }
}
