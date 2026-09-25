pub mod batch;

use anyhow::bail;
use contract_bindings::{
    IAgreementERC20::CreateERC20Params, IAgreementERC1155::CreateERC1155Params,
};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use std::{fs, path::Path};

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq, Clone, Hash, Type)]
#[sqlx(type_name = "text")]
pub enum TokenStandard {
    ERC20,
    ERC1155,
}

impl std::fmt::Display for TokenStandard {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenStandard::ERC20 => write!(f, "ERC20"),
            TokenStandard::ERC1155 => write!(f, "ERC1155"),
        }
    }
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub enum TokenizationTxInput {
    ERC20(CreateERC20Params),
    ERC1155(CreateERC1155Params),
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct TokenizationRequest {
    pub tokenization_id: String,
    pub tx_input: TokenizationTxInput,
    pub chain_id: i64,
}

impl TokenizationRequest {
    pub fn from_file(file_path: &Path) -> anyhow::Result<Vec<Self>> {
        let file_body = fs::read_to_string(file_path)?;
        let requests: Vec<TokenizationRequest> = serde_json::from_str(&file_body)?;
        Ok(requests)
    }

    pub fn from_string(body: String) -> anyhow::Result<TokenizationRequest> {
        let tokenization_request = match serde_json::from_str::<TokenizationRequest>(body.as_str())
        {
            Ok(request) => request,
            Err(err) => {
                bail!(
                    "Invalid tokenization request body: {:?}, err: {:?}",
                    body,
                    err
                );
            }
        };

        Ok(tokenization_request)
    }

    pub fn get_isrc(&self) -> String {
        match self.tx_input {
            TokenizationTxInput::ERC1155(ref input) => input.unassignedRwaId.clone(),
            TokenizationTxInput::ERC20(ref input) => input.unassignedRwaId.clone(),
        }
    }

    pub fn get_token_standard(&self) -> TokenStandard {
        match self.tx_input {
            TokenizationTxInput::ERC1155(_) => TokenStandard::ERC1155,
            TokenizationTxInput::ERC20(_) => TokenStandard::ERC20,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Type)]
#[sqlx(type_name = "text")]
pub enum TokenizationRequestStatus {
    REJECTED,
    SAVED,
    BATCHED,
    SUBMITTED,
}

impl std::fmt::Display for TokenizationRequestStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenizationRequestStatus::REJECTED => write!(f, "REJECTED"),
            TokenizationRequestStatus::SUBMITTED => write!(f, "SUBMITTED"),
            TokenizationRequestStatus::SAVED => write!(f, "SAVED"),
            TokenizationRequestStatus::BATCHED => write!(f, "BATCHED"),
        }
    }
}
