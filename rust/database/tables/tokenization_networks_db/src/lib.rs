use network::TokenizationNetwork;
use sqlx::{Pool, Postgres};

#[derive(Debug, Clone)]
pub struct TokenizationNetworkRepo {
    pub pool: Pool<Postgres>,
}

impl TokenizationNetworkRepo {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn select_all(&self) -> anyhow::Result<Vec<TokenizationNetwork>> {
        let networks = sqlx::query_as!(
            TokenizationNetwork,
            r#"
            SELECT
                tn.chain_id,
                tn.rpc_url,
                tn.agreement_factory_address,
                tn.fee_manager_address,
                n.contract_address as tx_executor_address
            FROM tokenization.tokenization_networks AS tn
            INNER JOIN public.networks AS n
                ON n.chain_id = tn.chain_id
        "#
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(networks)
    }
}
