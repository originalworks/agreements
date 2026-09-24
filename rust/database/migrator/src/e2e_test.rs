use sqlx::PgPool;

use crate::run_migration;

pub async fn migrate_for_tests(database_url: &String) -> anyhow::Result<()> {
    create_tokenization_schema(database_url).await?;
    migrate_account_abstraction_db(database_url).await?;
    migrate_tokenization_db(database_url).await?;
    Ok(())
}

pub async fn migrate_tokenization_db(database_url: &String) -> anyhow::Result<()> {
    let tokenization_database_url = format!("{}?options=-c search_path=tokenization", database_url);
    let tokenization_db_pool = PgPool::connect(&tokenization_database_url).await?;
    run_migration(&tokenization_db_pool).await?;
    Ok(())
}

pub async fn migrate_account_abstraction_db(database_url: &String) -> anyhow::Result<()> {
    let aa_database_url = format!("{}?options=-c search_path=public", database_url);
    let aa_db_pool = PgPool::connect(&aa_database_url).await?;
    aa_db_migrator::run_migration(&aa_db_pool).await?;

    Ok(())
}

pub async fn create_tokenization_schema(database_url: &String) -> anyhow::Result<()> {
    let pool = PgPool::connect(&database_url).await?;
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS tokenization;"#)
        .execute(&pool)
        .await?;
    Ok(())
}
