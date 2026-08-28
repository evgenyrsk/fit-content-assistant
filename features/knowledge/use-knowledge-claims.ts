import { useCallback, useEffect, useState } from 'react';
import type { KnowledgeClaimResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useKnowledgeClaims() {
  const [result, setResult] = useState<KnowledgeClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => {
    setError(null);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const response = await fetch('/api/knowledge/claims', { signal: controller.signal });
        const payload = await readJsonBody<KnowledgeClaimResult>(response);
        if (!response.ok || !('claims' in payload)) throw new Error('error' in payload ? payload.error : undefined);
        setResult(payload);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось загрузить базу знаний.');
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  return {
    claims: result?.claims ?? [], generatedAt: result?.generatedAt ?? '',
    loading: !result && !error, error, reload,
  };
}
