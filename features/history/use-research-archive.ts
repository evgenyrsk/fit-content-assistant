import { useEffect, useState } from 'react';
import type { ResearchArchiveResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useResearchArchive() {
  const [result, setResult] = useState<ResearchArchiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/research/runs', { signal: controller.signal }).then(async (response) => {
      const payload = await readJsonBody<ResearchArchiveResult>(response);
      if (!response.ok || !('items' in payload)) throw new Error('error' in payload ? payload.error : undefined);
      setResult(payload);
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message ? cause.message : 'История недоступна.');
    });
    return () => controller.abort();
  }, []);
  return { items: result?.items ?? [], loading: !result && !error, error };
}
