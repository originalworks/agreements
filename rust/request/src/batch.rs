use alloy::primitives::keccak256;
use anyhow::bail;

use crate::{TokenStandard, TokenizationRequest};
use std::collections::HashMap;

#[derive(Clone)]
pub struct ExecutedTokenizationBatch {
    pub batch: TokenizationRequestBatch,
    pub tx_hash: String,
    pub success: bool,
}

#[derive(Clone)]
pub struct TokenizationRequestBatch {
    pub chain_id: i64,
    pub token_standard: TokenStandard,
    pub tokenization_requests: Vec<TokenizationRequest>,
    pub batch_id: String,
    pub batch_creation_fee: Option<i64>,
}

impl TokenizationRequestBatch {
    pub fn build(
        chain_id: i64,
        token_standard: TokenStandard,
        tokenization_requests: Vec<TokenizationRequest>,
    ) -> Self {
        TokenizationRequestBatch {
            chain_id,
            token_standard,
            batch_id: Self::build_batch_tx_id(&tokenization_requests),
            tokenization_requests,
            batch_creation_fee: None,
        }
    }

    pub fn try_batch_creation_fee(&self) -> anyhow::Result<i64> {
        let Some(batch_creation_fee) = self.batch_creation_fee else {
            bail!("Batch creation fee is not set");
        };
        Ok(batch_creation_fee)
    }

    pub fn calculate_batch_creation_fee(&mut self, creation_fee: i64) -> anyhow::Result<i64> {
        let batch_creation_fee = i64::try_from(self.tokenization_requests.len())? * creation_fee;
        self.batch_creation_fee = Some(batch_creation_fee);
        Ok(batch_creation_fee)
    }

    fn build_batch_tx_id(tokenization_requests: &Vec<TokenizationRequest>) -> String {
        let tokenization_ids: Vec<String> = tokenization_requests
            .iter()
            .map(|r| r.tokenization_id.clone())
            .collect();
        let combined_tokenization_ids_string = tokenization_ids.join("");
        let batch_id = keccak256(combined_tokenization_ids_string.as_bytes());
        batch_id.to_string()
    }

    pub fn get_tokenization_ids(&self) -> Vec<String> {
        self.tokenization_requests
            .iter()
            .map(|r| r.tokenization_id.clone())
            .collect()
    }
}

pub fn sort_into_batches(
    tokenization_requests: &Vec<TokenizationRequest>,
) -> anyhow::Result<Vec<TokenizationRequestBatch>> {
    let mut grouped: HashMap<i64, HashMap<TokenStandard, Vec<TokenizationRequest>>> =
        HashMap::new();

    for request in tokenization_requests {
        let token_standard = request.get_token_standard();
        grouped
            .entry(request.chain_id)
            .or_default()
            .entry(token_standard)
            .or_default()
            .push(request.clone());
    }

    let mut batches: Vec<TokenizationRequestBatch> = Vec::new();

    for (chain_id, token_standard_map) in grouped {
        for (token_standard, tokenization_requests) in token_standard_map {
            batches.push(TokenizationRequestBatch::build(
                chain_id,
                token_standard,
                tokenization_requests,
            ));
        }
    }

    Ok(batches)
}
