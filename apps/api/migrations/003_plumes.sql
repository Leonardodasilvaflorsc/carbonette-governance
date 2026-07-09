-- Plumas detectadas (E4): origem pontual + contorno opcional, fluxo com
-- incerteza e método, associação opcional a instalação.
CREATE TABLE IF NOT EXISTS plumes (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,                -- carbon-mapper | dev-fixture
    gas TEXT NOT NULL,
    geom geometry(Point, 4326) NOT NULL,
    contour geometry(Polygon, 4326),
    flux_kg_h DOUBLE PRECISION,
    flux_uncertainty_kg_h DOUBLE PRECISION,
    method TEXT NOT NULL DEFAULT 'provider-reported',
    observed_at timestamptz NOT NULL,
    instrument TEXT,
    facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
    quicklook_url TEXT,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plumes_geom_idx ON plumes USING GIST (geom);
CREATE INDEX IF NOT EXISTS plumes_facility_idx ON plumes (facility_id);
CREATE INDEX IF NOT EXISTS plumes_observed_idx ON plumes (observed_at DESC);
