import { useCallback, useEffect, useState } from 'react';
import type { ContentArchiveResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useContentArchive() {
  const [result, setResult] = useState<ContentArchiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback((signal?: AbortSignal) => {
    setError(null);
    return fetch('/api/content/items', { signal })
      .then(async (response) => {
        const payload = await readJsonBody<ContentArchiveResult>(response);
        if (!response.ok || !('items' in payload)) throw new Error('error' in payload ? payload.error : undefined);
        setResult(payload); return payload;
      })
      .catch((cause) => {
        if (!signal?.aborted) setError(cause instanceof Error && cause.message
          ? cause.message : 'Не удалось загрузить архив контента.');
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void reload(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [reload]);

  return { items: result?.items ?? [], loading: !result && !error, error, reload };
}
