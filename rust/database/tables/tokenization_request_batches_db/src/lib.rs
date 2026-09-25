use request::{TokenizationRequestStatus, batch::TokenizationRequestBatch};
use sqlx::PgPool;
use tokenization_requests_db::TokenizationRequestRepo;

#[derive(Debug, Clone)]
pub struct TokenizationRequestBatchRepo {
    pool: PgPool,
}

impl TokenizationRequestBatchRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_batch_in_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        batch: &TokenizationRequestBatch,
    ) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
                INSERT INTO tokenization.tokenization_request_batches
                    (id, chain_id, tx_value, token_standard)
                VALUES ($1, $2, $3, $4)
            "#,
            batch.batch_id,
            batch.chain_id,
            batch.try_batch_creation_fee()?,
            batch.token_standard.to_string(),
        )
        .execute(&mut **tx)
        .await?;

        for tokenization_request in batch.tokenization_requests.clone() {
            sqlx::query!(
                r#"
                    INSERT INTO tokenization.tokenization_request_batch_items
                        (id, tokenization_request_batch_id, tokenization_request_id)
                    VALUES ($1, $2, $3)
                "#,
                uuid::Uuid::new_v4(),
                batch.batch_id,
                tokenization_request.tokenization_id,
            )
            .execute(&mut **tx)
            .await?;
        }

        Ok(())
    }
    pub async fn insert_many(&self, batches: &Vec<TokenizationRequestBatch>) -> anyhow::Result<()> {
        if batches.is_empty() {
            return Ok(());
        }
        let mut tx = self.pool.begin().await?;

        for batch in batches {
            self.create_batch_in_tx(&mut tx, batch).await?;
            TokenizationRequestRepo::update_status_for_many_with_tx(
                &mut tx,
                batch.get_tokenization_ids(),
                TokenizationRequestStatus::BATCHED,
            )
            .await?;
        }

        tx.commit().await?;

        Ok(())
    }
}
