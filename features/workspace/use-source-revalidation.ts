import { useState } from 'react';
import type { SourceRevalidationResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useSourceRevalidation(onCompleted: () => void) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(): Promise<void> {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/research/sources/revalidate', { method: 'POST' });
      const result = await readJsonBody<SourceRevalidationResult>(response);
      if (!response.ok || !('checked' in result)) throw new Error('error' in result ? result.error : undefined);
      setMessage(result.checked === 0
        ? 'Просроченных записей PubMed нет.'
        : `Проверено: ${result.checked}. Изменений статуса: ${result.changed}.`);
      onCompleted();
    } catch (cause) {
      setMessage(cause instanceof Error && cause.message ? cause.message : 'Перепроверка недоступна.');
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, message };
}
