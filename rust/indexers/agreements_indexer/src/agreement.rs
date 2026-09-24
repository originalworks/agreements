use alloy::primitives::Address;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IndexerAgreementMetadata {
    pub isrc: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IndexerAgreement {
    pub address: Address,
    pub network: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IndexerConnectedAgreement {
    pub agreement_metadata: IndexerAgreementMetadata,
    pub agreement: IndexerAgreement,
}
