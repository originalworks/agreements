use alloy::primitives::Address;
use network::store::NetworkStore;
use request::TokenizationRequest;
use std::sync::{Arc, Mutex};

use crate::{
    config::validation::ValidationConfig,
    submitter::{AcceptedDdexSubmittersBuilder, strings_to_addresses},
};

#[derive(Clone)]
pub struct AcceptedDdexSubmittersBuilderForAa {
    pub accept_other_submitters: bool,
    pub other_submitters: Vec<Address>,
    pub network_store: Arc<Mutex<NetworkStore>>,
}

impl AcceptedDdexSubmittersBuilderForAa {
    pub fn build(
        validation_config: &ValidationConfig,
        network_store: Arc<Mutex<NetworkStore>>,
    ) -> Self {
        let other_submitters = match validation_config.other_submitters.clone() {
            Some(list) => {
                if validation_config.accept_other_submitters {
                    strings_to_addresses(&list)
                } else {
                    Vec::new()
                }
            }
            None => Vec::new(),
        };

        Self {
            accept_other_submitters: validation_config.accept_other_submitters,
            other_submitters,
            network_store,
        }
    }
}

impl AcceptedDdexSubmittersBuilder for AcceptedDdexSubmittersBuilderForAa {
    async fn get_accepted_submitters(
        &self,
        tokenization_request: &TokenizationRequest,
    ) -> anyhow::Result<Vec<Address>> {
        let mut accepted_submitters = Vec::new();
        let mut other_submitters = self.other_submitters.clone();

        let default_network_tx_submitter;
        {
            let mut network_store = self
                .network_store
                .lock()
                .expect("Failed to lock network store");
            default_network_tx_submitter = network_store
                .try_network_tx_executor_address(tokenization_request.chain_id)
                .await?;
        }

        accepted_submitters.push(default_network_tx_submitter);
        accepted_submitters.append(&mut other_submitters);

        Ok(accepted_submitters)
    }
}
