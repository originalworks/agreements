CREATE TABLE IF NOT EXISTS tokenization.tokenization_request_batches (
    id TEXT PRIMARY KEY,
    chain_id BIGINT NOT NULL REFERENCES tokenization.tokenization_networks(chain_id),
    tx_value BIGINT NOT NULL,
    token_standard TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON tokenization.tokenization_request_batches
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();