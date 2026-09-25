use std::fs;

use serde::Deserialize;

use crate::{config::environment::Environment, constants::CONFIG_FILE_PATHS};

#[derive(Debug, Deserialize)]
pub struct IndexersUrls {
    pub registry_indexer_url: String,
    pub agreements_indexer_url: String,
}

#[derive(Debug, Deserialize)]
pub struct IndexersConfigTomlFile {
    pub prod: IndexersUrls,
    pub stage: IndexersUrls,
    pub dev: IndexersUrls,
    pub test: IndexersUrls,
}

impl IndexersConfigTomlFile {
    pub fn read_indexers_urls(environment: &Environment) -> anyhow::Result<IndexersUrls> {
        let config_file: IndexersConfigTomlFile =
            toml::from_str(&fs::read_to_string(CONFIG_FILE_PATHS.indexers)?)?;

        let indexers_urls = match environment {
            Environment::Prod => config_file.prod,
            Environment::Stage => config_file.stage,
            Environment::Dev => config_file.dev,
            Environment::Test => config_file.test,
        };
        Ok(indexers_urls)
    }
}
