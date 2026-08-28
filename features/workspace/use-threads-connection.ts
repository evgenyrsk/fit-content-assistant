import { useCallback, useEffect, useState } from 'react';
import type { ExternalConnectionStatus } from '@/lib/domain';

interface ConnectionSnapshot {
  result: ExternalConnectionStatus | null;
  request: number;
}

export function useThreadsConnection(enabled: boolean) {
  const [request, setRequest] = useState(0);
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>({ result: null, request: -1 });
  const refresh = useCallback(() => setRequest((current) => current + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch('/api/integrations/threads', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Connection diagnostics unavailable');
        return response.json() as Promise<ExternalConnectionStatus>;
      })
      .then((result) => setSnapshot({ result, request }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setSnapshot({ result: null, request });
      });
    return () => controller.abort();
  }, [enabled, request]);

  return { result: snapshot.result, loading: enabled && snapshot.request !== request, refresh };
}
