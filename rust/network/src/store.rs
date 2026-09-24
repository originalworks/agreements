use crate::{NetworkContext, TokenizationNetwork};
use alloy::primitives::Address;
use anyhow::bail;
use contract_bindings::FeeManager;
use std::{collections::HashMap, str::FromStr};

pub struct NetworkStore {
    network_by_chain_id: HashMap<i64, NetworkContext>,
}

impl NetworkStore {
    pub fn build(networks: &Vec<TokenizationNetwork>) -> anyhow::Result<Self> {
        let mut network_by_chain_id = HashMap::new();
        for network in networks {
            network_by_chain_id.insert(network.chain_id, NetworkContext::default(network)?);
        }
        Ok(Self {
            network_by_chain_id,
        })
    }

    pub async fn try_network_by_chain_id(
        &mut self,
        chain_id: i64,
    ) -> anyhow::Result<NetworkContext> {
        let Some(network) = self.network_by_chain_id.get_mut(&chain_id) else {
            bail!("Network for chain id: {} not found", chain_id);
        };
        if network.creation_fee.is_some() {
            return Ok(network.clone());
        } else {
            let fee_manager_contract = FeeManager::new(
                Address::from_str(&network.network.fee_manager_address.as_str())?,
                &network.root_provider,
            );
            let creation_fee = fee_manager_contract.creationFee().call().await?.to::<i64>();
            network.creation_fee = Some(creation_fee);
            return Ok(network.clone());
        }
    }

    pub async fn try_network_tx_executor_address(
        &mut self,
        chain_id: i64,
    ) -> anyhow::Result<Address> {
        let network = self.try_network_by_chain_id(chain_id).await?;
        let tx_executor_address = Address::from_str(network.network.tx_executor_address.as_str())?;
        Ok(tx_executor_address)
    }
}
