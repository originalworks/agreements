use agreements_indexer::agreement::IndexerConnectedAgreement;
use ow_registry_indexer::track::TrackProcessedWithSubmitter;
use serde_json::json;
use wiremock::{
    Mock, MockServer, Request, ResponseTemplate,
    matchers::{method, path},
};

pub struct GraphqlServerMock {
    server: MockServer,
    agreements: Vec<IndexerConnectedAgreement>,
    tracks_with_submitters: Vec<TrackProcessedWithSubmitter>,
}

const REGISTRY_GRAPHQL_MOCK_PATH: &str = "/registry-graphql-mock";
const AGREEMENTS_GRAPHQL_MOCK_PATH: &str = "/agreements-graphql-mock";

impl GraphqlServerMock {
    pub async fn build(
        agreements: Vec<IndexerConnectedAgreement>,
        tracks_with_submitters: Vec<TrackProcessedWithSubmitter>,
    ) -> Self {
        let server = MockServer::start().await;

        Self {
            server,
            agreements,
            tracks_with_submitters,
        }
    }

    pub fn registry_endpoint(&self) -> String {
        format!("{}{}", self.server.uri(), REGISTRY_GRAPHQL_MOCK_PATH)
    }

    pub fn agreements_endpoint(&self) -> String {
        format!("{}{}", self.server.uri(), AGREEMENTS_GRAPHQL_MOCK_PATH)
    }

    pub async fn mount_agreements_mock(&self) {
        let agreements = self.agreements.clone();
        Mock::given(method("POST"))
            .and(path(AGREEMENTS_GRAPHQL_MOCK_PATH))
            .respond_with(move |request: &Request| {
                let variables = extract_variables(request);

                let filtered: Vec<_> = match variables.get("isrc").and_then(|v| v.as_str()) {
                    Some(isrc) => agreements
                        .iter()
                        .filter(|a| a.agreement_metadata.isrc == isrc)
                        .cloned()
                        .collect(),
                    None => agreements.clone(),
                };

                ResponseTemplate::new(200)
                    .insert_header("content-type", "application/json")
                    .set_body_json(json!({
                        "data": { "ConnectedAgreement": filtered }
                    }))
            })
            .mount(&self.server)
            .await;
    }

    pub async fn mount_registry_mock(&self) {
        let tracks = self.tracks_with_submitters.clone();

        Mock::given(method("POST"))
            .and(path(REGISTRY_GRAPHQL_MOCK_PATH))
            .respond_with(move |request: &Request| {
                let variables = extract_variables(request);

                let filtered: Vec<TrackProcessedWithSubmitter> =
                    match variables.get("isrc").and_then(|v| v.as_str()) {
                        Some(isrc) => tracks.iter().filter(|t| t.isrc == isrc).cloned().collect(),
                        None => tracks.clone(),
                    };

                ResponseTemplate::new(200)
                    .insert_header("content-type", "application/json")
                    .set_body_json(json!({
                        "data": {
                            "trackProcessedWithSubmitters": filtered

                        }
                    }))
            })
            .mount(&self.server)
            .await;
    }
}

fn extract_variables(request: &Request) -> serde_json::Value {
    serde_json::from_slice::<serde_json::Value>(&request.body)
        .ok()
        .and_then(|body| body.get("variables").cloned())
        .unwrap_or(json!({}))
}
