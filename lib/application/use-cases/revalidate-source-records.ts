import type { AuditEventStore } from '../ports/audit-event-store.ts';
import type { ScientificSourceDocumentLoader } from '../ports/scientific-source-document-loader.ts';
import type { SourceDocumentStore } from '../ports/source-document-store.ts';
import type { SourceIntegrityMaintenanceStore } from '../ports/source-integrity-maintenance-store.ts';
import type { SourceRevalidationCandidate, SourceRevalidationResult } from '../../domain/index.ts';

interface RevalidationDependencies {
  loader: ScientificSourceDocumentLoader;
  documents: SourceDocumentStore;
  audit: AuditEventStore;
  maintenance?: SourceIntegrityMaintenanceStore;
  now?: () => Date;
}

export async function revalidateSourceRecords(
  candidates: SourceRevalidationCandidate[],
  dependencies: RevalidationDependencies,
): Promise<SourceRevalidationResult> {
  const completedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const loaded = await dependencies.loader.load(candidates.map((candidate) => candidate.pmid));
  await dependencies.documents.saveAll(loaded);
  const candidateByPmid = new Map(candidates.map((candidate) => [candidate.pmid, candidate]));
  let changed = 0;
  let blockedClaims = 0;
  let blockedContent = 0;
  for (const document of loaded) {
    const candidate = document.pmid ? candidateByPmid.get(document.pmid) : undefined;
    if (!candidate) continue;
    const statusChanged = candidate.previousRecordStatus !== document.recordStatus;
    if (statusChanged) changed += 1;
    if (statusChanged && document.recordStatus !== 'active' && dependencies.maintenance) {
      const blocked = await dependencies.maintenance.blockDependents(candidate.sourceId, document.recordStatus, completedAt);
      blockedClaims += blocked.blockedClaims;
      blockedContent += blocked.blockedContent;
    }
    await dependencies.audit.save({
      id: crypto.randomUUID(), aggregateType: 'source', aggregateId: candidate.sourceId,
      eventType: statusChanged ? 'source_integrity_status_changed' : 'source_integrity_revalidated',
      actorType: 'system', occurredAt: completedAt,
      payload: {
        provider: dependencies.loader.provider, pmid: candidate.pmid,
        previousRecordStatus: candidate.previousRecordStatus,
        recordStatus: document.recordStatus,
      },
    });
  }
  return {
    checked: loaded.length, changed, blockedClaims, blockedContent,
    unavailable: Math.max(0, candidates.length - loaded.length), completedAt,
  };
}
