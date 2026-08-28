import { useState } from 'react';
import type { HumanSourceReview, HumanSourceReviewDecision } from '@/lib/domain';

interface ReviewPayload {
  sourceId: string;
  decision: HumanSourceReviewDecision;
  reason: string;
}

export function useSourceReviewAction(onSaved: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: ReviewPayload): Promise<HumanSourceReview | null> {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/research/source-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { review?: HumanSourceReview; error?: string };
      if (!response.ok || !result.review) throw new Error(result.error || 'Не удалось сохранить решение.');
      onSaved();
      return result.review;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить решение.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, error, clearError: () => setError(null) };
}
