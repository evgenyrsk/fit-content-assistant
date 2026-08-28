import { useCallback, useEffect, useState } from 'react';
import type { TopicBankResult, TopicIdeaInput, UserNote } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

async function jsonPost(path: string, body: unknown): Promise<void> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await readJsonBody<{ error?: string }>(response);
  if (!response.ok) throw new Error(result.error || 'Не удалось сохранить данные.');
}

export function useTopicBank() {
  const [bank, setBank] = useState<TopicBankResult | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [topicsResponse, notesResponse] = await Promise.all([fetch('/api/topics'), fetch('/api/notes')]);
      const topics = await readJsonBody<TopicBankResult>(topicsResponse);
      const noteResult = await readJsonBody<{ notes?: UserNote[]; error?: string }>(notesResponse);
      if (!topicsResponse.ok || !('saved' in topics)) throw new Error('error' in topics ? topics.error : undefined);
      if (!notesResponse.ok || !('notes' in noteResult) || !noteResult.notes) throw new Error(noteResult.error);
      setBank(topics); setNotes(noteResult.notes);
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'Банк тем недоступен.'); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [reload]);

  async function saveTopic(input: TopicIdeaInput): Promise<boolean> {
    setSaving(true); setError(null);
    try { await jsonPost('/api/topics', input); await reload(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Тема не сохранена.'); return false; }
    finally { setSaving(false); }
  }

  async function saveNote(input: Omit<UserNote, 'id' | 'evidenceUse' | 'createdAt'>): Promise<boolean> {
    setSaving(true); setError(null);
    try { await jsonPost('/api/notes', input); await reload(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Заметка не сохранена.'); return false; }
    finally { setSaving(false); }
  }

  return { bank, notes, saving, error, saveTopic, saveNote };
}
