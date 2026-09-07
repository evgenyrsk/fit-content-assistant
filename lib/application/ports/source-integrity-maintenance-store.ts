import type { EvidenceRecordStatus } from '../../domain/index.ts';

export interface SourceIntegrityMaintenanceResult {
  blockedClaims: number;
  blockedContent: number;
}

export interface SourceIntegrityMaintenanceStore {
  blockDependents(sourceId: string, recordStatus: EvidenceRecordStatus, now: string): Promise<SourceIntegrityMaintenanceResult>;
}
