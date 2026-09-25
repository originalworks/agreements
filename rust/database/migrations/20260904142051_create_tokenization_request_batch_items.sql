CREATE TABLE IF NOT EXISTS tokenization.tokenization_request_batch_items (
    id UUID PRIMARY KEY,
    tokenization_request_batch_id TEXT NOT NULL REFERENCES tokenization.tokenization_request_batches(id),
    tokenization_request_id TEXT NOT NULL REFERENCES tokenization.tokenization_requests(tokenization_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tokenization_request_batch_id, tokenization_request_id)
);