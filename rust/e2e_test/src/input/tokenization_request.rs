use contract_bindings::{
    IAgreement::Holder, IAgreementERC20::CreateERC20Params, IAgreementERC1155::CreateERC1155Params,
};
use request::{TokenStandard, TokenizationRequest};

use crate::input::holder::CreateRandomHolder;

pub trait CreateRandomTokenizationRequest {
    fn create_random(
        chain_id: i64,
        token_standard: &TokenStandard,
        rwa_id: &String,
    ) -> TokenizationRequest;
}

impl CreateRandomTokenizationRequest for TokenizationRequest {
    fn create_random(
        chain_id: i64,
        token_standard: &TokenStandard,
        rwa_id: &String,
    ) -> TokenizationRequest {
        let tokenization_id = uuid::Uuid::new_v4();
        let tx_input = match token_standard.clone() {
            TokenStandard::ERC1155 => request::TokenizationTxInput::ERC1155(CreateERC1155Params {
                tokenUri: "Token uri".to_string(),
                contractURI: "Contract uri".to_string(),
                unassignedRwaId: rwa_id.clone(),
                holders: vec![
                    Holder::create_random(),
                    Holder::create_random(),
                    Holder::create_random(),
                ],
            }),
            TokenStandard::ERC20 => request::TokenizationTxInput::ERC20(CreateERC20Params {
                unassignedRwaId: rwa_id.clone(),
                holders: vec![
                    Holder::create_random(),
                    Holder::create_random(),
                    Holder::create_random(),
                ],
            }),
        };
        TokenizationRequest {
            tokenization_id: tokenization_id.to_string(),
            chain_id,
            tx_input,
        }
    }
}
