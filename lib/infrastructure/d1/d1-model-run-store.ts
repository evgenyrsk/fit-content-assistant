import type { D1Database } from '@cloudflare/workers-types';
import type { ModelRunStore } from '../../application/ports/model-run-store.ts';
import type { ModelRunRecord } from '../../application/orchestration/model-run.ts';

export class D1ModelRunStore implements ModelRunStore {
  constructor(private readonly database: D1Database) {}

  async save(record: ModelRunRecord): Promise<void> {
    await this.database.prepare(`
      INSERT INTO model_runs (
        id, research_run_id, content_item_id, stage, provider, model,
        routed_provider, prompt_version, input_tokens, output_tokens, cost_usd,
        tool_calls_json, retrieved_ids_json, decision, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.runId, record.researchRunId ?? null, record.contentItemId ?? null, record.stage, record.provider,
      record.model, record.routedProvider ?? null, record.promptVersion,
      record.inputTokens ?? null, record.outputTokens ?? null, record.costUsd ?? null,
      JSON.stringify(record.toolCalls), JSON.stringify(record.retrievedIds),
      record.decision, record.startedAt, record.completedAt,
    ).run();
  }
}
