import type { D1Database } from '@cloudflare/workers-types';
import type { AuditEventRecord, AuditEventStore } from '../../application/ports/audit-event-store.ts';

export class D1AuditEventStore implements AuditEventStore {
  constructor(private readonly database: D1Database) {}

  async save(record: AuditEventRecord): Promise<void> {
    await this.database.prepare(`
      INSERT INTO audit_events (
        id, aggregate_type, aggregate_id, event_type, actor_type, payload_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.id, record.aggregateType, record.aggregateId, record.eventType,
      record.actorType, JSON.stringify(record.payload), record.occurredAt,
    ).run();
  }
}
