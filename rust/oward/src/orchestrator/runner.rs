use crate::{
    config::cli::CliConfig,
    contract::ContractManager,
    submitter::AcceptedDdexSubmittersBuilderForCli,
    validator::{TokenizationRequestValidator, ValidatorResult},
};
use network::store::NetworkStore;
use ow_wallet_adapter::{OwWalletConfig, wallet::OwWallet};
use request::{
    TokenizationRequest,
    batch::{ExecutedTokenizationBatch, sort_into_batches},
};
use std::{
    path::Path,
    sync::{Arc, Mutex},
};

pub struct CliOrchestrator {
    pub input_file_path: String,
    pub network_store: Arc<Mutex<NetworkStore>>,
    pub contract_manager: ContractManager,
    pub accepted_submitters_builder: AcceptedDdexSubmittersBuilderForCli,
    pub tokenization_request_validator: TokenizationRequestValidator,
}

impl CliOrchestrator {
    pub async fn build(
        cli_config: &CliConfig,
        wallet_config: &OwWalletConfig,
    ) -> anyhow::Result<Self> {
        let wallet = OwWallet::build(wallet_config).await?;
        let wallet_address = &wallet.get_address()?;

        let contract_manager = ContractManager::build(wallet).await?;
        let accepted_submitters_builder = AcceptedDdexSubmittersBuilderForCli::build(
            &cli_config.validation_config,
            wallet_address,
        );

        let network_store = Arc::new(Mutex::new(NetworkStore::build(&cli_config.networks)?));
        let tokenization_request_validator = TokenizationRequestValidator::build(
            &cli_config.validation_config,
            &cli_config.indexers_urls,
            Arc::clone(&network_store),
        );

        Ok(Self {
            input_file_path: cli_config.input_file_path.clone(),
            network_store,
            contract_manager,
            accepted_submitters_builder,
            tokenization_request_validator,
        })
    }

    pub async fn run(&self) -> anyhow::Result<Vec<ExecutedTokenizationBatch>> {
        let tokenization_requests =
            TokenizationRequest::from_file(Path::new(&self.input_file_path))?;

        let validator_result = self
            .tokenization_request_validator
            .filter_invalid_networks(tokenization_requests)
            .await?;
        let tokenization_requests = Self::handle_rejected(validator_result);

        let validator_result = self
            .tokenization_request_validator
            .filter_duplicates(tokenization_requests)
            .await?;

        let tokenization_requests = Self::handle_rejected(validator_result);

        let validator_result = self
            .tokenization_request_validator
            .filter_mismatched_submitters(
                tokenization_requests,
                self.accepted_submitters_builder.clone(),
            )
            .await?;
        let tokenization_requests = Self::handle_rejected(validator_result);

        let tokenization_request_batches = sort_into_batches(&tokenization_requests)?;
        let mut executed_batches = Vec::new();

        for mut tokenization_request_batch in tokenization_request_batches {
            let network;
            {
                let mut network_store = self
                    .network_store
                    .lock()
                    .expect("Failed to lock network store");
                network = network_store
                    .try_network_by_chain_id(tokenization_request_batch.chain_id)
                    .await?;
            }
            let executed_batch = self
                .contract_manager
                .send_tokenization_batch(&mut tokenization_request_batch, network)
                .await?;
            executed_batches.push(executed_batch);
        }
        Ok(executed_batches)
    }

    pub fn handle_rejected(validator_result: ValidatorResult) -> Vec<TokenizationRequest> {
        for rejected_request in validator_result.rejected {
            println!(
                "Request rejected: {:?}. Reason: {}",
                rejected_request.tokenization_request, rejected_request.reason
            );
        }
        validator_result.accepted
    }
}
