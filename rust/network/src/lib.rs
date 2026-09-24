pub mod store;

use std::{fs, path::Path};

use alloy::providers::{
    Identity, ProviderBuilder,
    fillers::{BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller},
};
use anyhow::bail;
use serde::{Deserialize, Serialize};

type RootProviderWithFillers = FillProvider<
    JoinFill<
        Identity,
        JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
    >,
    alloy::providers::RootProvider,
>;

#[derive(Debug, sqlx::FromRow, Clone, Deserialize, Serialize)]
pub struct TokenizationNetwork {
    pub chain_id: i64,
    pub rpc_url: String,
    pub agreement_factory_address: String,
    pub fee_manager_address: String,
    #[serde(default)]
    pub tx_executor_address: String,
}

#[derive(Deserialize, Serialize)]
pub struct NetworkTomlFile {
    networks: Vec<TokenizationNetwork>,
}

impl TokenizationNetwork {
    pub fn read_from_file(file_path: &Path) -> anyhow::Result<Vec<Self>> {
        let config_file: NetworkTomlFile = toml::from_str(&fs::read_to_string(file_path)?)?;

        Ok(config_file.networks)
    }
}

#[derive(Clone)]
pub struct NetworkContext {
    pub network: TokenizationNetwork,
    creation_fee: Option<i64>,
    pub root_provider: RootProviderWithFillers,
}

impl NetworkContext {
    pub fn default(network: &TokenizationNetwork) -> anyhow::Result<Self> {
        let root_provider = ProviderBuilder::new().connect_http(network.rpc_url.parse()?);
        Ok(Self {
            root_provider,
            network: network.clone(),
            creation_fee: None,
        })
    }
    pub fn try_creation_fee(&self) -> anyhow::Result<i64> {
        if let Some(creation_fee) = self.creation_fee {
            return Ok(creation_fee);
        } else {
            bail!("Creation fee should be known at this point");
        };
    }
}
