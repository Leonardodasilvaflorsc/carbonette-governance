-- Atlas de Emissores (E2): instalações com emissões anuais por gás.
-- Modelo de dados da seção 9 do plano.
CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,                 -- id da fonte (ex.: asset Climate TRACE)
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    country TEXT NOT NULL,               -- ISO3
    geom geometry(Point, 4326) NOT NULL,
    data_source TEXT NOT NULL,           -- ex.: climate-trace-v6 | dev-fixture
    ref_year INT NOT NULL,
    emissions JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {gás: t/ano}
    co2e_t DOUBLE PRECISION,             -- t CO2e/ano (GWP100) para ranking
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facilities_geom_idx ON facilities USING GIST (geom);
CREATE INDEX IF NOT EXISTS facilities_sector_idx ON facilities (sector);
CREATE INDEX IF NOT EXISTS facilities_co2e_idx ON facilities (co2e_t DESC NULLS LAST);
