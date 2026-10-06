use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseSecretsJson {
    password: String,
    port: u16,
    host: String,
    username: String,
}

pub async fn read_database_url_from_secrets_manager(
    aws_config: &aws_config::SdkConfig,
) -> anyhow::Result<String> {
    let db_secrets_name = get_env_var("DB_SECRETS_NAME");
    let database_name = get_env_var("DATABASE_NAME");

    let client = aws_sdk_secretsmanager::Client::new(&aws_config);
    let response = client
        .get_secret_value()
        .secret_id(db_secrets_name)
        .send()
        .await?;

    let secrets_json_string = response
        .secret_string()
        .expect("Could not retrieve secret string from AWS SM");
    let database_secrets: DatabaseSecretsJson = serde_json::from_str(secrets_json_string)?;
    let database_url = format!(
        "postgresql://{}:{}@{}:{}/{}",
        database_secrets.username,
        database_secrets.password,
        database_secrets.host,
        database_secrets.port,
        database_name
    );

    Ok(database_url)
}
pub fn get_env_var(key: &str) -> String {
    env::var(key).expect(format!("Missing env variable: {key}").as_str())
}
