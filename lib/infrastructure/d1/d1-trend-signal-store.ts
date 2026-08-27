import type { D1Database } from '@cloudflare/workers-types';
import type { TrendCandidate } from '../../domain/index.ts';
import type { TrendSignalStore } from '../../application/ports/trend-signal-store.ts';

export class D1TrendSignalStore implements TrendSignalStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async save(candidates: TrendCandidate[], createdAt: string): Promise<void> {
    if (candidates.length === 0) return;
    const statements = candidates.map((candidate) => this.database.prepare(`
      INSERT INTO trend_signals (
        id, source, external_id, title, url, observed_at, freshness_minutes,
        growth_signal, audience_fit, scientific_researchability, saturation_risk,
        raw_metrics_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, external_id) DO UPDATE SET
        title = excluded.title,
        observed_at = excluded.observed_at,
        freshness_minutes = excluded.freshness_minutes,
        growth_signal = excluded.growth_signal,
        raw_metrics_json = excluded.raw_metrics_json,
        created_at = excluded.created_at
    `).bind(
      candidate.id, candidate.source, candidate.id, candidate.title, candidate.url ?? null,
      candidate.observedAt, candidate.freshnessMinutes, candidate.growthSignal,
      candidate.audienceFit, candidate.scientificResearchability, candidate.saturationRisk,
      JSON.stringify(candidate), createdAt,
    ));
    await this.database.batch(statements);
  }
}
