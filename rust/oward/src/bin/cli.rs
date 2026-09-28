use oward::{config::cli::CliConfig, orchestrator::runner::CliOrchestrator};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("HellOWARDl!");
    dotenvy::dotenv()?;
    let cli_config = CliConfig::build()?;
    let wallet_config = CliOrchestrator::build_wallet_config(
        cli_config.networks.first().expect("No network configured"),
    )?;

    let cli_orchestrator = CliOrchestrator::build(&cli_config, &wallet_config).await?;
    cli_orchestrator.run().await?;
    Ok(())
}
