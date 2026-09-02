import { useEffect, useState, type FormEvent } from 'react';
import { readJsonBody } from '@/features/shared';
import type { ManualClaimReviewContext } from '@/lib/domain';

type ReviewStatus = 'loading' | 'ready' | 'approved' | 'rejected' | 'error';

export function useClaimDraftReview(versionId: string | null) {
  const [context, setContext] = useState<ManualClaimReviewContext | null>(null);
  const [status, setStatus] = useState<ReviewStatus>(versionId ? 'loading' : 'error');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(versionId ? null : 'Версия claim не сохранена.');

  useEffect(() => {
    if (!versionId) return;
    const controller = new AbortController();
    void fetch(`/api/knowledge/claims/review?versionId=${encodeURIComponent(versionId)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readJsonBody<ManualClaimReviewContext>(response);
        if (!response.ok || !('claim' in payload)) throw new Error('error' in payload ? payload.error : 'Review недоступен.');
        setContext(payload); setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Review недоступен.'); setStatus('error');
      });
    return () => controller.abort();
  }, [versionId]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!versionId) return;
    setSaving(true); setError(null);
    const form = new FormData(event.currentTarget);
    const body = {
      decision: form.get('decision'), reason: form.get('reason'),
      contradictoryEvidenceNote: form.get('contradictoryEvidenceNote'),
      provenanceChecked: form.get('provenanceChecked') === 'on',
      scopeChecked: form.get('scopeChecked') === 'on',
      contradictionsChecked: form.get('contradictionsChecked') === 'on',
    };
    try {
      const response = await fetch(`/api/knowledge/claims/review?versionId=${encodeURIComponent(versionId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await readJsonBody<{ status?: 'approved' | 'rejected'; error?: string }>(response);
      const decision = 'status' in payload ? payload.status : undefined;
      if (!response.ok || !decision) throw new Error(payload.error || 'Не удалось сохранить claim review.');
      setStatus(decision);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить claim review.');
    } finally { setSaving(false); }
  }

  return { context, status, saving, error, submit };
}
