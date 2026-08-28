import { useState } from 'react';
import type { FormEvent } from 'react';
import type { KnowledgeClaimRecord, ManualClaimReviewContext } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

export function useManualClaimReview(onSaved: () => void) {
  const [context, setContext] = useState<ManualClaimReviewContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open(claim: KnowledgeClaimRecord): Promise<void> {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/knowledge/claims/review?versionId=${encodeURIComponent(claim.id)}`);
      const payload = await readJsonBody<ManualClaimReviewContext>(response);
      if (!response.ok || !('claim' in payload)) throw new Error('error' in payload ? payload.error : undefined);
      setContext(payload);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось открыть review.');
    } finally { setLoading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!context) return;
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
      const response = await fetch(`/api/knowledge/claims/review?versionId=${encodeURIComponent(context.claim.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await readJsonBody<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить review.');
      setContext(null); onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить review.');
    } finally { setSaving(false); }
  }

  return { context, loading, saving, error, open, close: () => setContext(null), submit };
}
