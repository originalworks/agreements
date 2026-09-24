use std::env;

pub struct TestEnvVars {
    pub rpc_url: String,
    pub anvil_port: i64,
    pub anvil_chain_id: i64,
}

impl TestEnvVars {
    pub fn build() -> anyhow::Result<Self> {
        Ok(Self {
            rpc_url: get_env_var("RPC_URL"),
            anvil_port: get_env_var("ANVIL_PORT").parse::<i64>()?,
            anvil_chain_id: get_env_var("ANVIL_CHAIN_ID").parse::<i64>()?,
        })
    }
}

pub fn get_env_var(key: &str) -> String {
    env::var(key).expect(format!("Missing env variable: {key}").as_str())
}
