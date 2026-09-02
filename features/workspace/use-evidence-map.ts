import { useEffect, useState } from 'react';
import type { KnowledgeClaimResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export interface EvidenceMapSummary {
  total: number;
  high: number;
  moderate: number;
  limited: number;
  state: 'live' | 'syncing' | 'offline';
}

const initial: EvidenceMapSummary = { total: 0, high: 0, moderate: 0, limited: 0, state: 'syncing' };

export function useEvidenceMap(): EvidenceMapSummary {
  const [summary, setSummary] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/knowledge/claims', { signal: controller.signal }).then(async (response) => {
      const payload = await readJsonBody<KnowledgeClaimResult>(response);
      if (!response.ok || !('claims' in payload)) throw new Error('knowledge_unavailable');
      const now = Date.now();
      const claims = payload.claims.filter((claim) => claim.status === 'approved'
        && new Date(claim.reviewDueAt).valueOf() >= now);
      setSummary({
        total: claims.length,
        high: claims.filter((claim) => claim.confidence === 'high').length,
        moderate: claims.filter((claim) => claim.confidence === 'moderate').length,
        limited: claims.filter((claim) => ['low', 'insufficient'].includes(claim.confidence)).length,
        state: 'live',
      });
    }).catch(() => {
      if (!controller.signal.aborted) setSummary({ ...initial, state: 'offline' });
    });
    return () => controller.abort();
  }, []);
  return summary;
}
