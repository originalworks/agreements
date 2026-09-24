use crate::constants::CONFIG_FILE_PATHS;
use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct ValidationConfig {
    pub accept_other_submitters: bool,
    pub other_submitters: Option<Vec<String>>,
    pub ignore_existing_agreements: bool,
}

impl ValidationConfig {
    pub fn build() -> anyhow::Result<Self> {
        let config_file: ValidationConfig =
            toml::from_str(&fs::read_to_string(CONFIG_FILE_PATHS.validation)?)?;

        Ok(config_file)
    }
}
