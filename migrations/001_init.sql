
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS cases (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  court TEXT NOT NULL,
  date DATE,
  citation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_url ON cases (url);
CREATE INDEX IF NOT EXISTS idx_cases_court ON cases (court);
CREATE INDEX IF NOT EXISTS idx_cases_date ON cases (date);
CREATE INDEX IF NOT EXISTS idx_cases_title_trgm ON cases USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_tsv_title ON cases USING GIN (to_tsvector('english', unaccent(title)));
