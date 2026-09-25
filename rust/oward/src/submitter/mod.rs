#[cfg(feature = "aws")]
pub mod aa_aws;

use crate::{config::validation::ValidationConfig, parser::strings_to_addresses};
use alloy::primitives::Address;
use request::TokenizationRequest;

#[allow(async_fn_in_trait)]
pub trait AcceptedDdexSubmittersBuilder {
    async fn get_accepted_submitters(
        &self,
        tokenization_request: &TokenizationRequest,
    ) -> anyhow::Result<Vec<Address>>;
}

#[derive(Clone)]
pub struct AcceptedDdexSubmittersBuilderForCli {
    pub accept_other_submitters: bool,
    pub other_submitters: Vec<Address>,
    pub wallet_address: Address,
}

impl AcceptedDdexSubmittersBuilderForCli {
    pub fn build(config: &ValidationConfig, wallet_address: &Address) -> Self {
        let other_submitters: Vec<Address> = match config.other_submitters.clone() {
            Some(list) => {
                if config.accept_other_submitters {
                    strings_to_addresses(&list)
                } else {
                    Vec::new()
                }
            }
            None => Vec::new(),
        };
        Self {
            accept_other_submitters: config.accept_other_submitters,
            other_submitters,
            wallet_address: wallet_address.clone(),
        }
    }
}

impl AcceptedDdexSubmittersBuilder for AcceptedDdexSubmittersBuilderForCli {
    async fn get_accepted_submitters(
        &self,
        _: &TokenizationRequest,
    ) -> anyhow::Result<Vec<Address>> {
        let mut accepted_submitters = Vec::new();

        let mut other_submitters = self.other_submitters.clone();

        accepted_submitters.push(self.wallet_address.clone());
        accepted_submitters.append(&mut other_submitters);

        Ok(accepted_submitters)
    }
}
