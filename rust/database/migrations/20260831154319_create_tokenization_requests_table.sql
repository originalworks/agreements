CREATE TABLE IF NOT EXISTS tokenization.tokenization_requests (
    sequence_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    tokenization_id TEXT PRIMARY KEY,
    token_standard TEXT NOT NULL,
    rwa_id TEXT NOT NULL,
    tokenization_status TEXT NOT NULL,
    status_reason TEXT,
    chain_id BIGINT NOT NULL REFERENCES tokenization.tokenization_networks(chain_id),
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
BEFORE UPDATE ON tokenization.tokenization_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

