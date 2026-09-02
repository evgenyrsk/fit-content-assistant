import { useMemo, useState } from 'react';
import type {
  BodyAssessmentResponse,
  BodyAssessmentHumanReview,
  ClaimSynthesisResponse,
  ResearchSearchResult,
  SourceAssessmentHumanReview,
  SourceAssessmentResponse,
} from '@/lib/domain';
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
  const targets = useMemo(() => {
    const admitted = new Set(result.documentCoverage?.decisions
      .filter((item) => item.decision === 'admitted_to_triage').map((item) => item.sourceId) ?? []);
    return result.fullTextCoverage?.documents
      .map((item) => item.sourceId)
      .filter((sourceId) => admitted.has(sourceId) && sourceId.startsWith('pmid:'))
      .slice(0, 3) ?? [];
  }, [result]);
  const [assessments, setAssessments] = useState<AssessmentMap>({});
  const [body, setBody] = useState<BodyAssessmentResponse | null>(null);
  const [bodyReview, setBodyReview] = useState<BodyAssessmentHumanReview | null>(null);
  const [claim, setClaim] = useState<ClaimSynthesisResponse | null>(null);
  const [reviews, setReviews] = useState<Record<string, SourceAssessmentHumanReview>>({});
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [preparingClaim, setPreparingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assess(): Promise<void> {
    setError(null); setBody(null); setBodyReview(null); setClaim(null); setReviews({});
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
    setSynthesizing(true); setError(null); setBodyReview(null); setClaim(null);
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

  async function prepareClaim(bodyAssessmentId: string): Promise<void> {
    setPreparingClaim(true); setError(null);
    try {
      setClaim(await postJson<ClaimSynthesisResponse>('/api/research/claims/draft', { bodyAssessmentId }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось подготовить claim draft.');
    } finally { setPreparingClaim(false); }
  }

  return {
    targets, assessments, reviews, body, bodyReview, claim, runningSourceId, synthesizing, preparingClaim, error,
    assess, synthesize, prepareClaim,
    recordReview: (review: SourceAssessmentHumanReview) => setReviews((current) => ({
      ...current, [review.assessmentId]: review,
    })),
    recordBodyReview: setBodyReview,
    canSynthesize: Object.values(reviews).some((item) => item.decision === 'confirmed'),
  };
}
