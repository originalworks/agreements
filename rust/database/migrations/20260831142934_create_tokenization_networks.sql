CREATE SCHEMA IF NOT EXISTS tokenization;


CREATE TABLE IF NOT EXISTS tokenization.tokenization_networks (
    rpc_url TEXT NOT NULL,
    chain_id BIGINT PRIMARY KEY REFERENCES public.networks(chain_id),
    agreement_factory_address TEXT NOT NULL,
    fee_manager_address TEXT NOT NULL,
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
BEFORE UPDATE ON tokenization.tokenization_networks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();