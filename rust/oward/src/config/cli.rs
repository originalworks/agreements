use network::TokenizationNetwork;

use crate::{
    config::{
        environment::{Environment, read_environment},
        indexers::{IndexersConfigTomlFile, IndexersUrls},
        networks::NetworksConfigTomlFile,
        validation::ValidationConfig,
    },
    constants::INPUT_FILE_PATH,
};

pub struct CliConfig {
    pub validation_config: ValidationConfig,
    pub networks: Vec<TokenizationNetwork>,
    pub indexers_urls: IndexersUrls,
    pub input_file_path: String,
    pub environment: Environment,
}

impl CliConfig {
    pub fn build() -> anyhow::Result<Self> {
        let mut args = std::env::args();
        args.next();
        let input_file_path = args.next().unwrap_or_else(|| INPUT_FILE_PATH.to_string());

        let environment = read_environment();
        let validation_config = ValidationConfig::build()?;
        let networks = NetworksConfigTomlFile::read_networks(&environment)?;
        let indexers_urls = IndexersConfigTomlFile::read_indexers_urls(&environment)?;

        Ok(Self {
            validation_config,
            networks,
            indexers_urls,
            input_file_path,
            environment,
        })
    }
}
