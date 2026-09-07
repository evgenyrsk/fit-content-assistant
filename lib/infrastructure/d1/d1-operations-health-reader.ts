import type { D1Database } from '@cloudflare/workers-types';
import { operationsHealthStatus, type OperationsHealth } from '../../domain/index.ts';

interface ModelRow { total: number; incomplete: number; cost: number }
interface CountRow { count: number }
interface AuditRow { occurred_at: string }

export class D1OperationsHealthReader {
  constructor(private readonly database: D1Database) {}

  async inspect(now: string): Promise<OperationsHealth> {
    const [models, due, audit] = await Promise.all([
      this.database.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN completed_at IS NULL THEN 1 ELSE 0 END) AS incomplete,
        COALESCE(SUM(cost_usd), 0) AS cost FROM model_runs
        WHERE datetime(started_at) >= datetime(?, '-24 hours')`).bind(now).first<ModelRow>(),
      this.database.prepare(`SELECT COUNT(*) AS count FROM sources WHERE pmid IS NOT NULL
        AND datetime(last_checked_at, '+30 days') <= datetime(?)`).bind(now).first<CountRow>(),
      this.database.prepare('SELECT occurred_at FROM audit_events ORDER BY occurred_at DESC LIMIT 1').first<AuditRow>(),
    ]);
    const incomplete = Number(models?.incomplete ?? 0);
    const dueCount = Number(due?.count ?? 0);
    return {
      status: operationsHealthStatus(incomplete, dueCount),
      modelRuns24h: Number(models?.total ?? 0), incompleteModelRuns24h: incomplete,
      modelCostUsd24h: Number(Number(models?.cost ?? 0).toFixed(6)),
      dueSourceRevalidations: dueCount, latestAuditAt: audit?.occurred_at,
      generatedAt: now,
      objectives: {
        availabilityTarget: '99.5% monthly',
        apiLatencyTarget: '< 3s excluding external LLM/research providers',
        integrityTarget: '0 unsupported factual publications',
      },
    };
  }
}
