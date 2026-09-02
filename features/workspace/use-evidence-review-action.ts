import { useState } from 'react';
import { readJsonBody } from '@/features/shared';
import type { BodyAssessmentHumanReview, SourceAssessmentHumanReview } from '@/lib/domain';

export function useEvidenceReviewAction() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post<T>(url: string, body: object): Promise<T | null> {
    setSaving(true); setError(null);
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await readJsonBody<{ review?: T; error?: string }>(response);
      if (!response.ok || !('review' in payload) || !payload.review) throw new Error(payload.error || 'Не удалось сохранить решение.');
      return payload.review;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить решение.');
      return null;
    } finally { setSaving(false); }
  }

  return {
    saving, error,
    saveSource: (body: object) => post<SourceAssessmentHumanReview>('/api/research/assess/review', body),
    saveBody: (body: object) => post<BodyAssessmentHumanReview>('/api/research/synthesize/review', body),
  };
}
