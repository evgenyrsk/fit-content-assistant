import { useState } from 'react';
import type { ResearchSearchResult } from '@/lib/domain';

type WorkStatus = 'idle' | 'working' | 'ready';

export function useResearchSearch() {
  const [status, setStatus] = useState<WorkStatus>('idle');
  const [result, setResult] = useState<ResearchSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(query: string): Promise<void> {
    setStatus('working');
    setError(null);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const payload = await response.json() as ResearchSearchResult | { error?: string };
      if (!response.ok) throw new Error('error' in payload ? payload.error : undefined);
      if ('error' in payload) throw new Error(payload.error);
      setResult(payload as ResearchSearchResult);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось выполнить поиск.');
    } finally {
      setStatus('ready');
    }
  }

  return { status, result, error, start };
}
