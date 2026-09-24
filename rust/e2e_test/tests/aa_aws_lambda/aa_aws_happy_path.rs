use aa_network_db::networks::NetworkRepo;
use alloy::signers::local::PrivateKeySigner;
use aws_lambda_events::sqs::SqsMessage;
use e2e_test::{
    aws::{
        aws_config::build_aws_sdk_config,
        sqs::{BuildForTest, build_lambda_sqs_event, create_queue_if_not_exist},
    },
    contracts::E2eTestContractAddresses,
    env_vars::{TestEnvVars, get_env_var},
    indexer_mock::GraphqlServerMock,
    input::tokenization_request::CreateRandomTokenizationRequest,
    network::{AddAnvilToNetworks, AddAnvilToTokenizationNetworks},
};
use ow_registry_indexer::track::TrackProcessedWithSubmitter;
use oward::{
    config::{
        aa_aws_lambda::{AaAwsLambdaConfig, LambdaEnvVars},
        environment::Environment,
        indexers::IndexersUrls,
        validation::ValidationConfig,
    },
    orchestrator::worker::AwsWithAaOrchestrator,
};
use request::{TokenStandard, TokenizationRequest};
use sqlx::PgPool;
use std::env;
use tokenization_networks_db::TokenizationNetworkRepo;

pub async fn aa_aws_happy_path() -> anyhow::Result<()> {
    let aws_config: aws_config::SdkConfig = build_aws_sdk_config().await?;
    let sqs_client = aws_sdk_sqs::Client::new(&aws_config);

    let aa_queue = create_queue_if_not_exist(
        &sqs_client,
        "aa-standard-queue.fifo".to_string(),
        get_env_var("AA_TX_REQUEST_QUEUE_MESSAGE_GROUP_ID"),
    )
    .await?;

    unsafe {
        env::set_var("AA_TX_REQUEST_QUEUE_URL", &aa_queue.queue_url);
    }

    let rwa_id = "AB1234567890".to_string();
    let test_env_vars = TestEnvVars::build()?;

    let tokenization_request = TokenizationRequest::create_random(
        test_env_vars.anvil_chain_id,
        &TokenStandard::ERC20,
        &rwa_id,
    );
    let message = SqsMessage::build_for_test(&serde_json::to_string(&tokenization_request)?, None);
    let event = build_lambda_sqs_event(vec![message])?;

    let network_tx_executor = PrivateKeySigner::random().address();
    let aws_config = build_aws_sdk_config().await?;
    let env_vars = LambdaEnvVars::build();
    let contract_addresses = E2eTestContractAddresses::from_file()?;

    let pool = PgPool::connect(&env_vars.database_url).await?;
    let network_repo = NetworkRepo::new(pool.clone());
    let tokenization_network_repo: TokenizationNetworkRepo =
        TokenizationNetworkRepo::new(pool.clone());

    network_repo
        .add_anvil(
            network_tx_executor.to_string(),
            test_env_vars.anvil_chain_id,
        )
        .await?;
    tokenization_network_repo
        .add_anvil(&contract_addresses, test_env_vars.anvil_chain_id)
        .await?;

    let track = TrackProcessedWithSubmitter {
        submitters: vec![network_tx_executor],
        isrc: rwa_id,
    };
    let graphql_server_mock = GraphqlServerMock::build(vec![], vec![track]).await;

    graphql_server_mock.mount_agreements_mock().await;
    graphql_server_mock.mount_registry_mock().await;

    let aa_aws_lambda_config = AaAwsLambdaConfig {
        validation_config: ValidationConfig {
            accept_other_submitters: false,
            other_submitters: None,
            ignore_existing_agreements: false,
        },
        env_vars: LambdaEnvVars::build(),

        indexers_urls: IndexersUrls {
            registry_indexer_url: graphql_server_mock.registry_endpoint(),
            agreements_indexer_url: graphql_server_mock.agreements_endpoint(),
        },

        environment: Environment::Test,
    };

    let orchestrator =
        AwsWithAaOrchestrator::build(&pool, &aws_config, &aa_aws_lambda_config).await?;

    orchestrator.lambda_function_handler(event).await.unwrap();

    // assert_eq!(executed_batches)

    Ok(())
}
