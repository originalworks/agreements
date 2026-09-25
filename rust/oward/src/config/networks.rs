use crate::{config::environment::Environment, constants::CONFIG_FILE_PATHS};
use network::TokenizationNetwork;
use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct NetworksConfigTomlFile {
    pub networks: Vec<TokenizationNetwork>,
}

impl NetworksConfigTomlFile {
    pub fn read_networks(environment: &Environment) -> anyhow::Result<Vec<TokenizationNetwork>> {
        let config_file_path = match environment {
            Environment::Prod => CONFIG_FILE_PATHS.networks.prod,
            Environment::Stage => CONFIG_FILE_PATHS.networks.stage,
            Environment::Dev => CONFIG_FILE_PATHS.networks.dev,
            Environment::Test => CONFIG_FILE_PATHS.networks.test,
        };
        let config_file: NetworksConfigTomlFile =
            toml::from_str(&fs::read_to_string(config_file_path)?)?;

        Ok(config_file.networks)
    }
}
