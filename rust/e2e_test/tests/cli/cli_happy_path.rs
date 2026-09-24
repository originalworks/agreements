use alloy::{primitives::Address, signers::local::PrivateKeySigner};
use e2e_test::{
    contracts::E2eTestContractAddresses, env_vars::TestEnvVars, indexer_mock::GraphqlServerMock,
};
use network::TokenizationNetwork;
use ow_registry_indexer::track::TrackProcessedWithSubmitter;
use ow_wallet_adapter::OwWalletConfig;
use oward::{
    config::{
        cli::CliConfig, environment::Environment, indexers::IndexersUrls,
        validation::ValidationConfig,
    },
    orchestrator::runner::CliOrchestrator,
};

pub async fn cli_e2e_happy_path_erc20() -> anyhow::Result<()> {
    let rwa_id = "AB1234567890".to_string();
    let contract_addresses = E2eTestContractAddresses::from_file()?;
    let wallet_config = OwWalletConfig::build()?;
    let wallet_signer_address: Address = wallet_config
        .private_key
        .clone()
        .expect("Fail to parse Private Key")
        .parse::<PrivateKeySigner>()?
        .address();

    let test_env_vars = TestEnvVars::build()?;
    let track = TrackProcessedWithSubmitter {
        submitters: vec![wallet_signer_address],
        isrc: rwa_id,
    };
    let graphql_server_mock = GraphqlServerMock::build(vec![], vec![track]).await;

    graphql_server_mock.mount_agreements_mock().await;
    graphql_server_mock.mount_registry_mock().await;

    let cli_config = CliConfig {
        validation_config: ValidationConfig {
            accept_other_submitters: false,
            other_submitters: None,
            ignore_existing_agreements: false,
        },
        networks: vec![TokenizationNetwork {
            chain_id: test_env_vars.anvil_chain_id,
            rpc_url: test_env_vars.rpc_url,
            agreement_factory_address: contract_addresses.agreement_factory_address,
            fee_manager_address: contract_addresses.fee_manager_address,
            tx_executor_address: "".to_string(),
        }],
        indexers_urls: IndexersUrls {
            registry_indexer_url: graphql_server_mock.registry_endpoint(),
            agreements_indexer_url: graphql_server_mock.agreements_endpoint(),
        },
        input_file_path: "cli-test-input.json".to_string(),
        environment: Environment::Test,
    };

    let orchestrator = CliOrchestrator::build(&cli_config, &wallet_config).await?;

    let executed_batches = orchestrator.run().await?;

    // assert_eq!(executed_batches)

    Ok(())
}
