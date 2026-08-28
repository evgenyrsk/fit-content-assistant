import { useCallback, useEffect, useState } from 'react';
import type { KnowledgeMaintenanceResult, KnowledgeSearchResult } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

const sessionKey = 'forme-source-revalidation-v1';

export function useKnowledgeOperations() {
  const [maintenance, setMaintenance] = useState<KnowledgeMaintenanceResult | null>(null);
  const [search, setSearch] = useState<KnowledgeSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async (): Promise<KnowledgeMaintenanceResult | null> => {
    try {
      const response = await fetch('/api/knowledge/maintenance');
      const result = await readJsonBody<KnowledgeMaintenanceResult>(response);
      if (!response.ok || !('alerts' in result)) throw new Error('error' in result ? result.error : undefined);
      setMaintenance(result);
      return result;
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Центр обслуживания недоступен.');
      return null;
    } finally { setLoading(false); }
  }, []);

  const revalidate = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/research/sources/revalidate', { method: 'POST' });
      const result = await readJsonBody<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error);
      await inspect();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Перепроверка недоступна.');
    } finally { setRunning(false); }
  }, [inspect]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => inspect().then((result) => {
      if (!active || !result?.dueSourceCount) return;
      try {
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, new Date().toISOString());
        void revalidate();
      } catch { /* private browsing may disable sessionStorage; manual action remains available */ }
    }), 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [inspect, revalidate]);

  async function runSearch(query: string): Promise<void> {
    setError(null);
    const normalized = query.trim();
    if (normalized.length < 2) { setSearch(null); return; }
    try {
      const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(normalized)}`);
      const result = await readJsonBody<KnowledgeSearchResult>(response);
      if (!response.ok || !('claims' in result)) throw new Error('error' in result ? result.error : undefined);
      setSearch(result);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Поиск недоступен.');
    }
  }

  return { maintenance, search, loading, running, error, runSearch, revalidate };
}
