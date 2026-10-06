#![cfg(feature = "aws")]
use aws_config::{BehaviorVersion, meta::region::RegionProviderChain};
use aws_secrets_manager::read_database_url_from_secrets_manager;
use lambda_runtime::{LambdaEvent, run, service_fn, tracing};
use migrator::run_migration;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Deserialize)]
pub struct MigrationEvent {
    pub source: Option<String>,
    pub run_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MigrationResponse {
    pub success: bool,
    pub message: String,
    pub error: Option<String>,
}

const TOKENIZATION_DB_NAMESPACE: &str = "tokenization";

async fn function_handler(
    _event: LambdaEvent<MigrationEvent>,
) -> anyhow::Result<MigrationResponse, lambda_runtime::Error> {
    tracing::info!("Cold start");
    tracing::init_default_subscriber();

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let aws_config = aws_config::defaults(BehaviorVersion::latest())
        .region(region_provider)
        .load()
        .await;

    let database_url = read_database_url_from_secrets_manager(&aws_config).await?;
    let database_url = format!(
        "{}?options=-c search_path={}",
        database_url, TOKENIZATION_DB_NAMESPACE
    );

    let pool = PgPool::connect(&database_url).await?;
    match run_migration(&pool).await {
        Ok(_) => {
            return Ok(MigrationResponse {
                success: true,
                message: "Migration completed".to_string(),
                error: None,
            });
        }
        Err(err) => {
            tracing::error!(%err);
            return Ok(MigrationResponse {
                success: false,
                message: "Migration failed".to_string(),
                error: Some(err.to_string()),
            });
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    println!("Cold start");
    tracing::init_default_subscriber();
    run(service_fn(function_handler)).await
}
