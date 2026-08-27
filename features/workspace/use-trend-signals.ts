import { useEffect, useState } from 'react';
import type { TrendDiscoveryResult } from '@/lib/domain';
import type { TrendSourceChoice } from '@/features/shared';

export function useTrendSignals(source: TrendSourceChoice) {
  const [state, setState] = useState<{ source: TrendSourceChoice | null; result: TrendDiscoveryResult | null }>({ source: null, result: null });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trends?source=${source}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Trend service unavailable');
        return response.json() as Promise<TrendDiscoveryResult>;
      })
      .then((result) => setState({ source, result }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setState({ source, result: null });
      });
    return () => controller.abort();
  }, [source]);

  return { result: state.source === source ? state.result : null, loading: state.source !== source };
}
