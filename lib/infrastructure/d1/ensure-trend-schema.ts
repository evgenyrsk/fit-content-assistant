import type { D1Database } from '@cloudflare/workers-types';

const trendSchema = [
  `CREATE TABLE IF NOT EXISTS trend_signals (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, external_id TEXT,
    title TEXT NOT NULL, url TEXT, observed_at TEXT NOT NULL,
    freshness_minutes INTEGER NOT NULL, growth_signal TEXT NOT NULL,
    audience_fit REAL NOT NULL, scientific_researchability REAL NOT NULL,
    saturation_risk REAL NOT NULL, raw_metrics_json TEXT NOT NULL,
    created_at TEXT NOT NULL, UNIQUE (source, external_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trend_signals_freshness
  ON trend_signals(source, observed_at DESC)`,
] as const;

export async function ensureTrendSchema(database: D1Database): Promise<void> {
  await database.batch(trendSchema.map((statement) => database.prepare(statement)));
}
