import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { PerformanceStore } from '../../application/ports/performance-store.ts';
import {
  validatePublicationMetric,
  explainPerformance,
  type ContentPerformanceSummary, type PerformanceResult, type PublicationMetricInput,
} from '../../domain/index.ts';

interface SummaryRow {
  content_item_id: string; title: string; platform: string; views: number; likes: number;
  comments: number; saves: number; shares: number; recorded_at: string;
}
interface CountRow { count: number }

function summary(row: SummaryRow): ContentPerformanceSummary {
  const interactions = Number(row.likes) + Number(row.comments) + Number(row.saves) + Number(row.shares);
  const views = Number(row.views);
  const explanation = explainPerformance({ views, comments: Number(row.comments), saves: Number(row.saves), shares: Number(row.shares) });
  return {
    contentItemId: row.content_item_id, title: row.title, platform: row.platform,
    views, likes: Number(row.likes), comments: Number(row.comments), saves: Number(row.saves), shares: Number(row.shares),
    engagementRate: views > 0 ? Number(((interactions / views) * 100).toFixed(2)) : 0,
    ...explanation,
    lastRecordedAt: row.recorded_at,
  };
}

export class D1PerformanceStore implements PerformanceStore {
  constructor(private readonly database: D1Database) {}

  async list(now: string): Promise<PerformanceResult> {
    const [rows, count] = await Promise.all([
      this.database.prepare(`
        WITH ranked AS (
          SELECT pm.*, ROW_NUMBER() OVER (
            PARTITION BY pm.content_item_id, pm.platform ORDER BY pm.recorded_at DESC, pm.created_at DESC
          ) AS position FROM publication_metrics pm
        )
        SELECT r.content_item_id, ci.title, r.platform, r.views, r.likes, r.comments,
          r.saves, r.shares, r.recorded_at FROM ranked r
        JOIN content_items ci ON ci.id = r.content_item_id WHERE r.position = 1
        ORDER BY r.recorded_at DESC LIMIT 100
      `).all<SummaryRow>(),
      this.database.prepare('SELECT COUNT(*) AS count FROM publication_metrics').first<CountRow>(),
    ]);
    return { summaries: rows.results.map(summary), snapshots: Number(count?.count ?? 0), generatedAt: now };
  }

  async saveAll(metrics: PublicationMetricInput[], now: string): Promise<number> {
    if (metrics.length === 0 || metrics.length > 200) throw new Error('Разрешено от 1 до 200 строк метрик за импорт.');
    for (const metric of metrics) {
      const errors = validatePublicationMetric(metric);
      if (errors.length) throw new Error(errors.join(' '));
    }
    const itemIds = [...new Set(metrics.map((metric) => metric.contentItemId))];
    const placeholders = itemIds.map(() => '?').join(',');
    const row = await this.database.prepare(`SELECT COUNT(*) AS count FROM content_items WHERE id IN (${placeholders})`)
      .bind(...itemIds).first<CountRow>();
    if (Number(row?.count ?? 0) !== itemIds.length) throw new Error('В импорте есть неизвестный content_item_id.');
    const statements: D1PreparedStatement[] = metrics.map((metric) => this.database.prepare(`
      INSERT INTO publication_metrics
      (id, content_item_id, platform, recorded_at, views, likes, comments, saves, shares,
        watch_time_seconds, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), metric.contentItemId, metric.platform.trim(), metric.recordedAt,
      metric.views, metric.likes, metric.comments, metric.saves, metric.shares,
      metric.watchTimeSeconds ?? null, metric.source, now,
    ));
    await this.database.batch(statements);
    return statements.length;
  }
}
