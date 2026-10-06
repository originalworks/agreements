#![cfg(feature = "aws")]
use aws_config::{BehaviorVersion, meta::region::RegionProviderChain};
use lambda_runtime::{run, service_fn, tracing};
use oward::{
    config::aa_aws_lambda::AaAwsLambdaConfig, orchestrator::worker::AwsWithAaOrchestrator,
};
use sqlx::Pool;

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    tracing::info!("Cold start");
    tracing::init_default_subscriber();

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let aws_config = aws_config::defaults(BehaviorVersion::latest())
        .region(region_provider)
        .load()
        .await;
    let aa_aws_lambda_config = AaAwsLambdaConfig::build(&aws_config).await?;
    let pool = Pool::connect(&aa_aws_lambda_config.env_vars.database_url).await?;
    let orchestrator =
        AwsWithAaOrchestrator::build(&pool, &aws_config, &aa_aws_lambda_config).await?;

    run(service_fn(|event| {
        orchestrator.lambda_function_handler(event)
    }))
    .await
}
