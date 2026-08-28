import type { Confidence, ReviewDecision } from './evidence.ts';

export interface ClaimSearchHit {
  kind: 'claim';
  id: string;
  title: string;
  excerpt: string;
  status: ReviewDecision | 'superseded';
  confidence: Confidence;
  reviewDueAt: string;
}

export interface EvidenceSearchHit {
  kind: 'evidence';
  id: string;
  sourceId: string;
  title: string;
  excerpt: string;
  locator: string;
  admissible: boolean;
  recordStatus: string;
}

export interface KnowledgeSearchResult {
  query: string;
  claims: ClaimSearchHit[];
  evidence: EvidenceSearchHit[];
  separationEnforced: true;
}

export interface MaintenanceAlert {
  id: string;
  kind: 'claim_due' | 'source_due' | 'record_changed';
  title: string;
  detail: string;
  occurredAt: string;
}

export interface KnowledgeMaintenanceResult {
  dueClaimCount: number;
  dueSourceCount: number;
  changedRecordCount: number;
  alerts: MaintenanceAlert[];
  checkedAt: string;
}

export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}
