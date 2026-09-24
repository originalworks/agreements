use request::{TokenizationRequest, TokenizationRequestStatus};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TokenizationRequestRow {
    sequence_id: i64,
    tokenization_id: String,
    token_standard: String,
    rwa_id: String,
    tokenization_status: TokenizationRequestStatus,
    status_reason: Option<String>,
    chain_id: i64,
    created_at: OffsetDateTime,
    updated_at: OffsetDateTime,
}

#[derive(Debug, Clone)]
pub struct TokenizationRequestRepo {
    pool: PgPool,
}

impl TokenizationRequestRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn update_status_for_many(
        &self,
        tokenization_ids: &Vec<String>,
        tokenization_status: TokenizationRequestStatus,
    ) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
                UPDATE tokenization.tokenization_requests
                SET
                    tokenization_status = $2
                WHERE tokenization_id = ANY($1)
            "#,
            &tokenization_ids,
            tokenization_status.to_string()
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_status_for_many_with_tx(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        tokenization_ids: Vec<String>,
        tokenization_status: TokenizationRequestStatus,
    ) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
                UPDATE tokenization.tokenization_requests
                SET
                    tokenization_status = $2
                WHERE tokenization_id = ANY($1)
        "#,
            &tokenization_ids,
            tokenization_status.to_string()
        )
        .execute(&mut **tx)
        .await?;
        Ok(())
    }

    pub async fn update_rejected_with_reason(
        &self,
        tokenization_id: &String,
        error_string: String,
    ) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
                UPDATE tokenization.tokenization_requests
                SET
                    tokenization_status = 'REJECTED',
                    status_reason = $2
                WHERE tokenization_id = $1
        "#,
            tokenization_id,
            error_string
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_many_rejected_with_reason(
        &self,
        tokenization_ids: &Vec<String>,
        error_string: String,
    ) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
                UPDATE tokenization.tokenization_requests
                SET
                    tokenization_status = 'REJECTED',
                    status_reason = $2
                WHERE tokenization_id = ANY($1)
        "#,
            tokenization_ids,
            error_string
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn insert_many(
        &self,
        tokenization_requests: Vec<TokenizationRequest>,
    ) -> anyhow::Result<Vec<TokenizationRequest>> {
        if tokenization_requests.is_empty() {
            return Ok(Vec::new());
        }
        let mut tokenization_ids = Vec::new();
        let mut token_standards = Vec::new();
        let mut rwa_ids = Vec::new();
        let mut tokenization_statuses = Vec::new();
        let mut chain_ids = Vec::new();

        for tokenization_request in &tokenization_requests {
            tokenization_ids.push(tokenization_request.tokenization_id.clone());
            token_standards.push(tokenization_request.get_token_standard().to_string());
            rwa_ids.push(tokenization_request.get_isrc());
            tokenization_statuses.push(TokenizationRequestStatus::SAVED);
            chain_ids.push(tokenization_request.chain_id);
        }

        let rows = sqlx::query_as::<_, TokenizationRequestRow>(
            r#"
                INSERT INTO 
                    tokenization.tokenization_requests 
                    (tokenization_id, token_standard, rwa_id, tokenization_status, chain_id)
                SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[], $4::text[], $5::bigint[])
                ON CONFLICT (tokenization_id) DO NOTHING
                RETURNING 
                    sequence_id, 
                    tokenization_id, 
                    token_standard, 
                    rwa_id,
                    tokenization_status, 
                    status_reason,
                    chain_id, 
                    created_at, 
                    updated_at
        "#,
        )
        .bind(&tokenization_ids)
        .bind(&token_standards)
        .bind(&rwa_ids)
        .bind(&tokenization_statuses)
        .bind(&chain_ids)
        .fetch_all(&self.pool)
        .await?;

        let inserted_ids = rows
            .iter()
            .map(|row| row.tokenization_id.clone())
            .collect::<Vec<String>>();

        let inserted_tokenization_requests = tokenization_requests
            .into_iter()
            .filter(|request| inserted_ids.contains(&request.tokenization_id))
            .collect();

        Ok(inserted_tokenization_requests)
    }
}
