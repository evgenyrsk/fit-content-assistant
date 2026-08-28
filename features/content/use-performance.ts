import { useCallback, useEffect, useState } from 'react';
import type { PerformanceResult, PublicationMetricInput } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function usePerformance() {
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await fetch('/api/content/metrics');
      const payload = await readJsonBody<PerformanceResult>(response);
      if (!response.ok || !('summaries' in payload)) throw new Error('error' in payload ? payload.error : undefined);
      setResult(payload);
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'Метрики недоступны.'); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [reload]);

  async function save(body: { metric: PublicationMetricInput } | { csv: string }): Promise<boolean> {
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/content/metrics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await readJsonBody<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error);
      await reload(); return true;
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'Метрики не сохранены.'); return false; }
    finally { setSaving(false); }
  }
  return { result, saving, error, saveMetric: (metric: PublicationMetricInput) => save({ metric }), importCsv: (csv: string) => save({ csv }) };
}
