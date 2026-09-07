import { useEffect, useState } from 'react';
import { readJsonBody } from '@/features/shared';
import type { OperationsHealth } from '@/lib/domain';

export function useOperationsHealth() {
  const [result, setResult] = useState<OperationsHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/operations/health', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await readJsonBody<OperationsHealth>(response);
        if (!response.ok || ('error' in body && body.error)) throw new Error('Operations diagnostics unavailable');
        return body as OperationsHealth;
      })
      .then(setResult)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) setResult(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return { result, loading };
}
