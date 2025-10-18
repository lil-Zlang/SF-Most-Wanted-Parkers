-- Schema for SF Most Wanted Parkers

CREATE TABLE IF NOT EXISTS leaderboard (
  rank            INTEGER PRIMARY KEY,
  plate           TEXT    NOT NULL,
  total_fines     NUMERIC NOT NULL,
  citation_count  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plate_details (
  plate             TEXT PRIMARY KEY,
  total_fines       NUMERIC NOT NULL,
  citation_count    INTEGER NOT NULL,
  plate_state       TEXT,
  favorite_violation TEXT,
  citations         JSONB   NOT NULL
);

CREATE TABLE IF NOT EXISTS citation_hotspots (
  location          TEXT PRIMARY KEY,
  citation_count    INTEGER NOT NULL,
  total_fines       NUMERIC NOT NULL,
  top_violation     TEXT,
  violation_breakdown JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plate_details_state ON plate_details(plate_state);
CREATE INDEX IF NOT EXISTS idx_hotspots_count ON citation_hotspots(citation_count DESC);
