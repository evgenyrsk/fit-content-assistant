import { useCallback, useEffect, useState } from 'react';
import { readJsonBody } from '@/features/shared';
import type { LlmConnectionStatus } from '@/lib/domain';

export function useLlmConnection() {
  const [result, setResult] = useState<LlmConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const probe = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/llm', { method: 'POST', cache: 'no-store' });
      const body = await readJsonBody<LlmConnectionStatus>(response);
      if (!response.ok || ('error' in body && body.error)) throw new Error('LLM diagnostics unavailable');
      setResult(body as LlmConnectionStatus);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/integrations/llm', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await readJsonBody<LlmConnectionStatus>(response);
        if (!response.ok || ('error' in body && body.error)) throw new Error('LLM diagnostics unavailable');
        return body as LlmConnectionStatus;
      })
      .then(setResult)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) setResult(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return { result, loading, probe };
}
