-- Dossiês gerados (E5): metadados + PDF (bytea; mover para S3/MinIO se o
-- volume crescer — a interface do store já isola essa decisão).
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
    trace_hash TEXT NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    pdf BYTEA,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_facility_idx ON reports (facility_id, created_at DESC);
