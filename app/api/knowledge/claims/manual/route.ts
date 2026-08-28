import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { prepareManualClaimDraft } from '@/lib/application/use-cases/prepare-manual-claim-draft';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1ClaimDraftStore } from '@/lib/infrastructure/d1/d1-claim-draft-store';
import { D1ManualClaimEvidenceReader } from '@/lib/infrastructure/d1/d1-manual-claim-evidence-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

async function ensureSchemas(database: D1Database): Promise<void> {
  await ensureResearchSchema(database);
  await ensureEvidenceSchema(database);
  await ensureKnowledgeSchema(database);
  await ensurePipelineSchema(database);
}

export async function POST(request: Request): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'База знаний пока недоступна.' }, { status: 503 });
  let claim;
  try {
    await ensureSchemas(database);
    const body = await request.json() as unknown;
    const options = await new D1ManualClaimEvidenceReader(database).listEligible(100);
    claim = await prepareManualClaimDraft(body, options);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Некорректный claim.';
    return Response.json({ error: message }, { status: 400 });
  }
  try {
    const saved = await new D1ClaimDraftStore(database).save(claim);
    await new D1AuditEventStore(database).save({
      id: crypto.randomUUID(), aggregateType: 'claim', aggregateId: saved.claimId,
      eventType: 'manual_claim_draft_created', actorType: 'human',
      payload: {
        claimVersionId: saved.versionId, version: saved.version,
        evidenceChunkIds: claim.evidence.map((item) => item.sourceChunkId), status: 'needs_review',
      },
      occurredAt: claim.createdAt,
    });
    return Response.json({ ...saved, status: 'needs_review', reviewRequired: true }, { status: 201 });
  } catch {
    return Response.json({ error: 'Не удалось сохранить claim.' }, { status: 503 });
  }
}
