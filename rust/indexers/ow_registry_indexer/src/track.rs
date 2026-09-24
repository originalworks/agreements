use alloy::primitives::Address;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TrackProcessedWithSubmitter {
    pub submitters: Vec<Address>,
    pub isrc: String,
}
