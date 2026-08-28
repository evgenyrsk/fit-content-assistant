import { useState } from 'react';
import type { ContentOperationInput, ContentReviewInput, ManualContentInput } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

async function post(path: string, body: unknown): Promise<void> {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await readJsonBody<{ error?: string }>(response);
  if (!response.ok) throw new Error(result.error || 'Операция не выполнена.');
}

export function useContentOperations(onChanged: () => Promise<unknown>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute(path: string, body: unknown): Promise<boolean> {
    setSaving(true); setError(null);
    try { await post(path, body); await onChanged(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Операция не выполнена.'); return false; }
    finally { setSaving(false); }
  }

  return {
    saving, error, clearError: () => setError(null),
    saveManual: (input: ManualContentInput) => execute('/api/content/items/manual', input),
    review: (input: ContentReviewInput) => execute('/api/content/items/review', input),
    update: (input: ContentOperationInput) => execute('/api/content/items/operations', input),
  };
}
