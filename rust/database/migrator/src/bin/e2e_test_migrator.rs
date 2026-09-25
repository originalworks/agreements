use std::env;

use migrator::e2e_test::migrate_for_tests;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let database_url = env::var("DATABASE_URL").expect("Missing 'DATABASE_URL' env variable");
    migrate_for_tests(&database_url).await?;
    Ok(())
}
