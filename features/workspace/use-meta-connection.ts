import { useCallback, useEffect, useState } from 'react';
import type { ExternalConnectionSource, ExternalConnectionStatus } from '@/lib/domain';

export function useMetaConnection(source: ExternalConnectionSource, enabled: boolean) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<ExternalConnectionStatus | null>(null);
  const [loadedRequest, setLoadedRequest] = useState(-1);
  const refresh = useCallback(() => setRequest((current) => current + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/api/integrations/${source}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<ExternalConnectionStatus> : Promise.reject())
      .then((payload) => { setResult(payload); setLoadedRequest(request); })
      .catch((cause: unknown) => { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setLoadedRequest(request); });
    return () => controller.abort();
  }, [enabled, request, source]);
  return { result, loading: enabled && loadedRequest !== request, refresh };
}
