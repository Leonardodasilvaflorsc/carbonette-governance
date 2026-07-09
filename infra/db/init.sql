-- Extensões exigidas pelo modelo de dados (seção 9 do plano):
-- PostGIS para geometrias (facilities, aois, plumes) e
-- TimescaleDB para séries temporais (timeseries como hypertable).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
