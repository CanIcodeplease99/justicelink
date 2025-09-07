
import { Pool } from "pg";
import pino from "pino";
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000 });

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    logger.warn("No DATABASE_URL set. Running without DB (cache disabled).");
    return;
  }
  const client = await pool.connect();
  try {
    await client.query(`
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
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE EXTENSION IF NOT EXISTS unaccent;
      CREATE INDEX IF NOT EXISTS idx_cases_url ON cases (url);
      CREATE INDEX IF NOT EXISTS idx_cases_court ON cases (court);
      CREATE INDEX IF NOT EXISTS idx_cases_date ON cases (date);
      CREATE INDEX IF NOT EXISTS idx_cases_title_trgm ON cases USING GIN (title gin_trgm_ops);
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cases_tsv_title') THEN
          EXECUTE 'CREATE INDEX idx_cases_tsv_title ON cases USING GIN (to_tsvector(''english'', unaccent(title)))';
        END IF;
      END$$;
    `);
    logger.info("DB ready");
  } finally { client.release(); }
}

export async function upsertCases(rows: Array<{ title: string; url: string; court: string; date?: string | null; citation?: string | null }>) {
  if (!rows.length || !process.env.DATABASE_URL) return;
  const client = await pool.connect();
  try {
    const values = rows.map((_, i)=>`($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}::date, $${i*5+5})`).join(",");
    const flat = rows.flatMap(r=>[r.title, r.url, r.court, r.date || null, r.citation || null]);
    await client.query(
      `INSERT INTO cases (title, url, court, date, citation)
       VALUES ${values}
       ON CONFLICT (url) DO UPDATE SET
         title = EXCLUDED.title,
         court = EXCLUDED.court,
         date = COALESCE(EXCLUDED.date, cases.date),
         citation = COALESCE(EXCLUDED.citation, cases.citation),
         updated_at = now();`, flat);
  } finally { client.release(); }
}

export async function queryCacheFTS(query: string, limit: number, offset: number) {
  if (!process.env.DATABASE_URL) return [];
  const client = await pool.connect();
  try {
    const sql = `
      SELECT title, url, court, date, citation
      FROM cases
      WHERE to_tsvector('english', unaccent(title)) @@ plainto_tsquery('english', unaccent($1))
         OR unaccent(title) ILIKE '%' || unaccent($1) || '%'
      ORDER BY date DESC NULLS LAST, updated_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await client.query(sql, [query, limit, offset]);
    return rows;
  } finally { client.release(); }
}
