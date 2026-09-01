import { useMemo, useState } from 'react';
import type { BodyAssessmentResponse, ResearchSearchResult, SourceAssessmentResponse } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

type AssessmentMap = Record<string, SourceAssessmentResponse>;

async function postJson<T extends object>(url: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const payload = await readJsonBody<T>(response);
  if ('error' in payload) throw new Error(payload.error || 'Сервис вернул ошибку.');
  if (!response.ok) throw new Error('Сервис временно недоступен.');
  return payload as T;
}

export function useLiveEvidenceWorkbench(result: ResearchSearchResult, question: string) {
  const targets = useMemo(() => result.documentCoverage?.decisions
    .filter((item) => item.decision === 'admitted_to_triage' && item.sourceId.startsWith('pmid:'))
    .slice(0, 3).map((item) => item.sourceId) ?? [], [result]);
  const [assessments, setAssessments] = useState<AssessmentMap>({});
  const [body, setBody] = useState<BodyAssessmentResponse | null>(null);
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assess(): Promise<void> {
    setError(null); setBody(null);
    for (const sourceId of targets) {
      setRunningSourceId(sourceId);
      try {
        const response = await postJson<SourceAssessmentResponse>('/api/research/assess', {
          researchRunId: result.runId, sourceId, question,
        });
        setAssessments((current) => ({ ...current, [sourceId]: response }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось оценить источник.');
      }
    }
    setRunningSourceId(null);
  }

  async function synthesize(): Promise<void> {
    setSynthesizing(true); setError(null);
    try {
      const response = await postJson<BodyAssessmentResponse>('/api/research/synthesize', {
        researchRunId: result.runId, question,
        outcomeId: result.planning?.draft?.outcomes[0] ?? 'primary_outcome',
      });
      setBody(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось собрать evidence body.');
    } finally { setSynthesizing(false); }
  }

  return {
    targets, assessments, body, runningSourceId, synthesizing, error,
    assess, synthesize,
    canSynthesize: Object.values(assessments).some((item) => Boolean(item.assessment)),
  };
}
