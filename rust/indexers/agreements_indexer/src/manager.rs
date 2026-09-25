use anyhow::bail;
use serde::Deserialize;
use serde_json::json;

use crate::agreement::IndexerConnectedAgreement;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct GraphqlResponseData {
    pub ConnectedAgreement: Vec<IndexerConnectedAgreement>,
}

#[derive(Debug, Deserialize)]
pub struct GraphqlResponse {
    pub data: Option<GraphqlResponseData>,
    pub errors: Option<serde_json::Value>,
}

pub struct AgreementsIndexerManager {
    client: reqwest::Client,
    agreements_indexer_url: String,
}

impl AgreementsIndexerManager {
    pub fn build(agreements_indexer_url: &String) -> Self {
        Self {
            client: reqwest::Client::new(),
            agreements_indexer_url: agreements_indexer_url.clone(),
        }
    }

    pub async fn find_agreements_by_isrc(
        &self,
        isrc: &String,
    ) -> anyhow::Result<Option<Vec<IndexerConnectedAgreement>>> {
        let query = Self::build_get_agreement_by_isrc_query(&isrc)?;

        let response = self
            .client
            .post(&self.agreements_indexer_url)
            .json(&query)
            .send()
            .await?
            .json::<GraphqlResponse>()
            .await?;

        if let Some(error) = response.errors {
            bail!(error)
        }

        if let Some(data) = response.data {
            if data.ConnectedAgreement.is_empty() {
                return Ok(None);
            } else {
                return Ok(Some(data.ConnectedAgreement));
            }
        }

        Ok(None)
    }
    pub fn build_get_agreement_by_isrc_query(isrc: &String) -> anyhow::Result<serde_json::Value> {
        let query = r#"
            query GetAgreementByIsrc($isrc: String) {
                ConnectedAgreement (where: { agreementMetadata: { isrc: {_eq: $isrc }}}){
                    agreementMetadata {
                        isrc
                    }
                    agreement {
                        address
                        network
                    }
                }
            }
        "#;

        let variables = json!({
            "isrc": isrc
        });

        Ok(json!({
            "query": query,
            "variables": variables
        }))
    }
}
