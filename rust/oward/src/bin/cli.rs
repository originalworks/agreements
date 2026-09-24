use ow_wallet_adapter::OwWalletConfig;
use oward::{config::cli::CliConfig, orchestrator::runner::CliOrchestrator};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("HellOWARDl!");
    dotenvy::dotenv()?;
    let cli_config = CliConfig::build()?;
    let wallet_config = OwWalletConfig::build()?;

    let cli_orchestrator = CliOrchestrator::build(&cli_config, &wallet_config).await?;
    cli_orchestrator.run().await?;
    Ok(())
}
