use std::fs;

use serde::{Deserialize, Serialize};

const CONTRACT_ADDRESSES_PATH_FILE: &str = "../../contracts/e2e-test-contracts.json";

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct E2eTestContractAddresses {
    pub agreement_factory_address: String,
    pub fee_manager_address: String,
}

impl E2eTestContractAddresses {
    pub fn from_file() -> anyhow::Result<Self> {
        let file_body = fs::read_to_string(CONTRACT_ADDRESSES_PATH_FILE)?;

        let addresses: E2eTestContractAddresses = serde_json::from_str(&file_body)?;
        Ok(addresses)
    }
}
