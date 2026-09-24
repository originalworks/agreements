use crate::{
    config::{indexers::IndexersUrls, validation::ValidationConfig},
    submitter::AcceptedDdexSubmittersBuilder,
};
use agreements_indexer::manager::AgreementsIndexerManager;
use alloy::primitives::Address;
use network::store::NetworkStore;
use ow_registry_indexer::manager::RegistryIndexerManager;
use request::{TokenizationRequest, TokenizationTxInput};
use std::sync::{Arc, Mutex};

pub struct RejectedRequestWithReason {
    pub reason: String,
    pub tokenization_request: TokenizationRequest,
}

pub struct ValidatorResult {
    pub accepted: Vec<TokenizationRequest>,
    pub rejected: Vec<RejectedRequestWithReason>,
}

pub struct TokenizationRequestValidator {
    pub agreements_indexer_manager: AgreementsIndexerManager,
    pub registry_indexer_manager: RegistryIndexerManager,
    pub ignore_existing_agreements: bool,
    pub network_store: Arc<Mutex<NetworkStore>>,
}

impl TokenizationRequestValidator {
    pub fn build(
        validation_config: &ValidationConfig,
        indexers_urls: &IndexersUrls,
        network_store: Arc<Mutex<NetworkStore>>,
    ) -> Self {
        let agreements_indexer_manager =
            AgreementsIndexerManager::build(&indexers_urls.agreements_indexer_url);
        let registry_indexer_manager =
            RegistryIndexerManager::build(&indexers_urls.registry_indexer_url);

        Self {
            agreements_indexer_manager,
            registry_indexer_manager,
            ignore_existing_agreements: validation_config.ignore_existing_agreements,
            network_store,
        }
    }

    pub async fn filter_mismatched_submitters<F: AcceptedDdexSubmittersBuilder>(
        &self,
        tokenization_requests: Vec<TokenizationRequest>,
        accepted_submitters_builder: F,
    ) -> anyhow::Result<ValidatorResult> {
        let mut accepted = Vec::new();
        let mut rejected = Vec::new();

        for tokenization_request in tokenization_requests {
            let isrc = tokenization_request.get_isrc();
            let Some(ddex_submitters) = self
                .registry_indexer_manager
                .find_isrc_submitters(&isrc)
                .await?
            else {
                println!("RwaID not found in the registry: {}", isrc);
                rejected.push(RejectedRequestWithReason {
                    reason: format!("RwaID not found in the registry: {}", isrc),
                    tokenization_request,
                });
                continue;
            };

            let accepted_submitters: Vec<Address> = accepted_submitters_builder
                .get_accepted_submitters(&tokenization_request)
                .await?;

            let mut submitters_match = false;
            for accepted_submitter in accepted_submitters.clone() {
                if ddex_submitters.contains(&accepted_submitter) {
                    submitters_match = true;
                    break;
                }
            }
            if submitters_match == true {
                accepted.push(tokenization_request);
            } else {
                rejected.push(RejectedRequestWithReason {
                    reason: format!(
                        "Mismatched submitters. Accepted: {:?}; Actual: {:?}",
                        accepted_submitters, ddex_submitters
                    ),
                    tokenization_request: tokenization_request.clone(),
                });
            }
        }
        Ok(ValidatorResult { accepted, rejected })
    }

    pub async fn filter_duplicates(
        &self,
        tokenization_requests: Vec<TokenizationRequest>,
    ) -> anyhow::Result<ValidatorResult> {
        if self.ignore_existing_agreements == true {
            return Ok(ValidatorResult {
                accepted: tokenization_requests,
                rejected: vec![],
            });
        }

        let mut accepted = Vec::new();
        let mut rejected = Vec::new();

        for tokenization_request in tokenization_requests {
            let isrc = tokenization_request.get_isrc();
            if let Some(existing_agreements) = self
                .agreements_indexer_manager
                .find_agreements_by_isrc(&isrc)
                .await?
            {
                println!(
                    "Warning! This ISRC is already tokenized. Request: {:?}; tokenized agreements {:?}",
                    tokenization_request, existing_agreements
                );

                rejected.push(RejectedRequestWithReason {
                    reason: format!(
                        "This ISRC is already tokenized. Tokenized agreements: {:?}",
                        existing_agreements
                    ),
                    tokenization_request: tokenization_request.clone(),
                });
            } else {
                accepted.push(tokenization_request);
            }
        }
        Ok(ValidatorResult { accepted, rejected })
    }

    pub async fn filter_invalid_tx_input(
        &self,
        tokenization_requests: Vec<TokenizationRequest>,
    ) -> anyhow::Result<ValidatorResult> {
        let mut accepted = Vec::new();
        let mut rejected = Vec::new();

        for tokenization_request in &tokenization_requests {
            let holders = match tokenization_request.tx_input.clone() {
                TokenizationTxInput::ERC1155(input) => input.holders,
                TokenizationTxInput::ERC20(input) => input.holders,
            };
            if holders.is_empty() {
                rejected.push(RejectedRequestWithReason {
                    tokenization_request: tokenization_request.clone(),
                    reason: format!(
                        "No holders defined in the request {:?}",
                        tokenization_request
                    ),
                });
                continue;
            }
            let first_holder = holders.first().expect("Missing first holder");
            if first_holder.isAdmin == false {
                rejected.push(RejectedRequestWithReason {
                    tokenization_request: tokenization_request.clone(),
                    reason: format!("First holder must be an admin {:?}", tokenization_request),
                });
                continue;
            }
            accepted.push(tokenization_request.clone());
        }
        Ok(ValidatorResult { accepted, rejected })
    }

    pub async fn filter_invalid_networks(
        &self,
        tokenization_requests: Vec<TokenizationRequest>,
    ) -> anyhow::Result<ValidatorResult> {
        let mut accepted = Vec::new();
        let mut rejected = Vec::new();

        let mut network_store = self
            .network_store
            .lock()
            .expect("Failed to acquire lock on network_store");

        for tokenization_request in tokenization_requests {
            match network_store
                .try_network_by_chain_id(tokenization_request.chain_id)
                .await
            {
                Ok(_) => {
                    accepted.push(tokenization_request);
                }
                Err(err) => {
                    rejected.push(RejectedRequestWithReason {
                        reason: format!(
                            "Invalid network for chain_id {}: {:?}",
                            tokenization_request.chain_id, err
                        ),
                        tokenization_request: tokenization_request.clone(),
                    });
                }
            }
        }
        Ok(ValidatorResult { accepted, rejected })
    }
}
