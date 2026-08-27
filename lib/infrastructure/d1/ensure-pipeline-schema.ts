import type { D1Database } from '@cloudflare/workers-types';

const pipelineSchema = [
  `CREATE TABLE IF NOT EXISTS model_runs (
    id TEXT PRIMARY KEY, research_run_id TEXT REFERENCES research_runs(id),
    content_item_id TEXT REFERENCES content_items(id), stage TEXT NOT NULL,
    provider TEXT NOT NULL, model TEXT NOT NULL, routed_provider TEXT,
    prompt_version TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
    cost_usd REAL, tool_calls_json TEXT NOT NULL, retrieved_ids_json TEXT NOT NULL,
    decision TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_model_runs_stage_started
  ON model_runs(stage, started_at DESC)`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY, aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL, actor_type TEXT NOT NULL, payload_json TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_aggregate
  ON audit_events(aggregate_type, aggregate_id, occurred_at DESC)`,
] as const;

export async function ensurePipelineSchema(database: D1Database): Promise<void> {
  await database.batch(pipelineSchema.map((statement) => database.prepare(statement)));
}
