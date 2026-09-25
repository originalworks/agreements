use aa_network_db::networks::{NetworkRepo, NewNetwork};
use tokenization_networks_db::TokenizationNetworkRepo;

use crate::contracts::E2eTestContractAddresses;

#[allow(async_fn_in_trait)]
pub trait AddAnvilToNetworks {
    async fn add_anvil(&self, network_tx_executor: String, chain_id: i64) -> anyhow::Result<()>;
}

impl AddAnvilToNetworks for NetworkRepo {
    async fn add_anvil(&self, network_tx_executor: String, chain_id: i64) -> anyhow::Result<()> {
        self.insert_new_network(&NewNetwork {
            rpc_url: "http://anvil:8545".to_string(),
            chain_id,
            contract_address: network_tx_executor,
            chain_name: "anvil".to_string(),
            min_operator_wallet_balance: 1_000_000,
            gas_estimation_buffer_ppm: 1_200_000,
            blob_gas_estimation_buffer_ppm: 1_000_000,
            max_retry_attempts: 3,
            tx_max_age_sec: 3600,
        })
        .await?;
        Ok(())
    }
}

#[allow(async_fn_in_trait)]
pub trait AddAnvilToTokenizationNetworks {
    async fn add_anvil(
        &self,
        contract_addresses: &E2eTestContractAddresses,
        chain_id: i64,
    ) -> anyhow::Result<()>;
}

impl AddAnvilToTokenizationNetworks for TokenizationNetworkRepo {
    async fn add_anvil(
        &self,
        contract_addresses: &E2eTestContractAddresses,
        chain_id: i64,
    ) -> anyhow::Result<()> {
        let result = sqlx::query!(
            r#"
            INSERT INTO tokenization.tokenization_networks (
                chain_id,
                rpc_url,
                agreement_factory_address,
                fee_manager_address
            )
            VALUES ($1, $2, $3, $4)"#,
            chain_id,
            "http://anvil:8545".to_string(),
            contract_addresses.agreement_factory_address,
            contract_addresses.fee_manager_address,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
