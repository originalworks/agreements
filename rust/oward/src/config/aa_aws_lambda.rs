use crate::config::{
    environment::{Environment, read_environment},
    get_env_var,
    indexers::{IndexersConfigTomlFile, IndexersUrls},
    validation::ValidationConfig,
};

#[derive(Debug)]
pub struct LambdaEnvVars {
    pub aa_tx_request_queue_url: String,
    pub aa_tx_request_queue_message_group_id: String,
    pub oward_instance_name: String,
    pub database_url: String,
}

impl LambdaEnvVars {
    pub fn build() -> Self {
        let aa_tx_request_queue_url = get_env_var("AA_TX_REQUEST_QUEUE_URL");
        let aa_tx_request_queue_message_group_id: String =
            get_env_var("AA_TX_REQUEST_QUEUE_MESSAGE_GROUP_ID");
        let oward_instance_name = get_env_var("OWARD_INSTANCE_NAME");
        let database_url = get_env_var("DATABASE_URL");

        Self {
            aa_tx_request_queue_url,
            aa_tx_request_queue_message_group_id,
            oward_instance_name,
            database_url,
        }
    }
}

pub struct AaAwsLambdaConfig {
    pub validation_config: ValidationConfig,
    pub indexers_urls: IndexersUrls,
    pub env_vars: LambdaEnvVars,
    pub environment: Environment,
}

impl AaAwsLambdaConfig {
    pub fn build() -> anyhow::Result<Self> {
        let environment = read_environment();
        let validation_config = ValidationConfig::build()?;
        let indexers_urls = IndexersConfigTomlFile::read_indexers_urls(&environment)?;
        let env_vars = LambdaEnvVars::build();

        Ok(Self {
            validation_config,
            indexers_urls,
            environment,
            env_vars,
        })
    }
}
