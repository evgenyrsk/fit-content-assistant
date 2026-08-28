import { useEffect, useState } from 'react';
import type { SourceReviewQueueResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useSourceReviewQueue(refreshKey: string) {
  const [result, setResult] = useState<SourceReviewQueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const response = await fetch('/api/research/sources', { signal: controller.signal });
        const payload = await readJsonBody<SourceReviewQueueResult>(response);
        if (!response.ok || !('sources' in payload)) throw new Error('error' in payload ? payload.error : undefined);
        setResult(payload);
        setError(null);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось загрузить очередь.');
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  return { result, error, loading: !result && !error };
}
