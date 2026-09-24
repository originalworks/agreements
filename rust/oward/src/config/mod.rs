use std::env;

pub mod aa_aws_lambda;
pub mod cli;
pub mod environment;
pub mod indexers;
pub mod networks;
pub mod validation;

pub struct NetworkConfigFilePaths {
    pub prod: &'static str,
    pub stage: &'static str,
    pub dev: &'static str,
    pub test: &'static str,
}

pub struct ConfigFilePaths {
    pub networks: NetworkConfigFilePaths,
    pub indexers: &'static str,
    pub validation: &'static str,
}

pub fn get_env_var(key: &str) -> String {
    env::var(key).expect(format!("Missing env variable: {key}").as_str())
}
