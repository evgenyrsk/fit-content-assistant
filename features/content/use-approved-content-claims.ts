import { useEffect, useState } from 'react';
import type { KnowledgeClaimRecord, KnowledgeClaimResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useApprovedContentClaims() {
  const [claims, setClaims] = useState<KnowledgeClaimRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/knowledge/claims', { signal: controller.signal }).then(async (response) => {
      const payload = await readJsonBody<KnowledgeClaimResult>(response);
      if (!response.ok || !('claims' in payload)) throw new Error('error' in payload ? payload.error : undefined);
      const now = new Date();
      setClaims(payload.claims.filter((claim) => claim.status === 'approved' && new Date(claim.reviewDueAt) > now));
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message ? cause.message : 'Claims недоступны.');
    });
    return () => controller.abort();
  }, []);
  return { claims, error };
}
