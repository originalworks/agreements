use crate::track::TrackProcessedWithSubmitter;
use alloy::primitives::Address;
use anyhow::bail;
use serde::Deserialize;
use serde_json::json;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct Data {
    pub trackProcessedWithSubmitters: Vec<TrackProcessedWithSubmitter>,
}

#[derive(Debug, Deserialize)]
pub struct GraphqlResponse {
    pub data: Option<Data>,
    pub errors: Option<serde_json::Value>,
}

pub struct RegistryIndexerManager {
    client: reqwest::Client,
    registry_indexer_url: String,
}

impl RegistryIndexerManager {
    pub fn build(registry_indexer_url: &String) -> Self {
        Self {
            client: reqwest::Client::new(),
            registry_indexer_url: registry_indexer_url.clone(),
        }
    }

    pub async fn find_isrc_submitters(
        &self,
        isrc: &String,
    ) -> anyhow::Result<Option<Vec<Address>>> {
        let query = Self::build_get_submitters_query(&isrc)?;

        let response = self
            .client
            .post(&self.registry_indexer_url)
            .json(&query)
            .send()
            .await?
            .json::<GraphqlResponse>()
            .await?;

        if let Some(error) = response.errors {
            bail!(error)
        }

        if let Some(data) = response.data {
            if let Some(processed_track) = data.trackProcessedWithSubmitters.first() {
                return Ok(Some(processed_track.submitters.clone()));
            } else {
                return Ok(None);
            }
        }

        Ok(None)
    }

    pub fn build_get_submitters_query(isrc: &String) -> anyhow::Result<serde_json::Value> {
        let query = r#"
        query GetSubmitters($isrc: String) {
          trackProcessedWithSubmitters(where: { isrc: $isrc }) {
            submitters
            isrc
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
