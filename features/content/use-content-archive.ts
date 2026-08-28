import { useEffect, useState } from 'react';
import type { ContentArchiveResult } from '@/lib/domain';

export function useContentArchive() {
  const [result, setResult] = useState<ContentArchiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/content/items', { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as ContentArchiveResult | { error?: string };
        if (!response.ok || !('items' in payload)) throw new Error('error' in payload ? payload.error : undefined);
        setResult(payload);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error && cause.message
          ? cause.message : 'Не удалось загрузить архив контента.');
      });
    return () => controller.abort();
  }, []);

  return { items: result?.items ?? [], loading: !result && !error, error };
}
