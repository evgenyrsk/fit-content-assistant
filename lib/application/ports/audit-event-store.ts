export interface AuditEventRecord {
  id: string;
  aggregateType: 'research_run' | 'content_item' | 'claim' | 'source' | 'source_assessment' | 'body_assessment';
  aggregateId: string;
  eventType: string;
  actorType: 'system' | 'model' | 'human';
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditEventStore {
  save(record: AuditEventRecord): Promise<void>;
}
