export interface AuditEventRecord {
  id: string;
  aggregateType: 'research_run' | 'content_item' | 'claim' | 'source';
  aggregateId: string;
  eventType: string;
  actorType: 'system' | 'model' | 'human';
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditEventStore {
  save(record: AuditEventRecord): Promise<void>;
}
