-- Análise Quantitativa (E3): AOIs, jobs e séries temporais.
CREATE TABLE IF NOT EXISTS aois (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    geom geometry(Polygon, 4326) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aois_geom_idx ON aois USING GIST (geom);

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id TEXT PRIMARY KEY,
    aoi_id TEXT NOT NULL REFERENCES aois(id) ON DELETE CASCADE,
    gas TEXT NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending|running|done|error
    product TEXT,                            -- rastreabilidade (fonte/algoritmo/qa)
    error TEXT,
    result JSONB,                            -- série analisada (pontos + flags)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Hypertable Timescale para consultas longas multi-AOI (FASE 6: alertas).
CREATE TABLE IF NOT EXISTS timeseries (
    aoi_id TEXT NOT NULL,
    gas TEXT NOT NULL,
    date date NOT NULL,
    value DOUBLE PRECISION,
    unit TEXT NOT NULL,
    qa_fraction DOUBLE PRECISION,
    n_obs INT,
    background DOUBLE PRECISION,
    product TEXT NOT NULL,
    PRIMARY KEY (aoi_id, gas, date)
);
SELECT create_hypertable('timeseries', 'date', if_not_exists => TRUE, migrate_data => TRUE);
