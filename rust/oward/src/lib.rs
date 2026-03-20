use alloy::primitives::Address;

pub enum TokenStandard {
    ERC20,
    ERC1155,
}

pub struct Holders {
    pub balance: u128,
    pub is_admin: bool,
    pub account: Address,
}

pub struct TokenizationRequest {
    pub token_standard: TokenStandard,
    pub isrc: String,
    pub chain_id: i64,
    pub holders: Vec<Holders>,
}
