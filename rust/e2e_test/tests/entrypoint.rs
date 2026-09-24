pub mod aa_aws_lambda;
pub mod cli;

use crate::{
    aa_aws_lambda::aa_aws_happy_path::aa_aws_happy_path,
    cli::cli_happy_path::cli_e2e_happy_path_erc20,
};

#[tokio::test]
async fn cli_e2e_tests() -> anyhow::Result<()> {
    cli_e2e_happy_path_erc20().await?;
    Ok(())
}

#[tokio::test]
async fn aws_lambda_e2e_tests() -> anyhow::Result<()> {
    aa_aws_happy_path().await?;
    Ok(())
}
