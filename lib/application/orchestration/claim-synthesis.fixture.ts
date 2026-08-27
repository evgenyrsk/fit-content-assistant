import type { BodyAssessmentRecord } from '../../domain/index.ts';
import type { ClaimSynthesisDraft } from './claim-synthesis-contract.ts';
import { eligibleSummary, validBodyAssessmentDraft } from './body-assessment.fixture.ts';

export const readyBody: BodyAssessmentRecord = {
  id: 'body-1', researchRunId: 'research-1',
  assessment: {
    ...validBodyAssessmentDraft(), questionId: 'research-1', humanReview: 'confirmed',
    methodologyVersion: '1.0.0',
    domains: validBodyAssessmentDraft().domains.map((domain) => ({ ...domain, assessor: 'human' })),
  },
  gate: { decision: 'ready_for_claim_review', reasons: ['body_ready_for_claim_review'] },
  createdAt: '2026-08-27T00:00:00.000Z',
};

export function validClaimSynthesisDraft(): ClaimSynthesisDraft {
  return {
    topic: 'Креатин',
    statement: 'У здоровых взрослых креатин может умеренно увеличивать прирост силы при силовых тренировках.',
    scope: {
      population: 'здоровые взрослые', intervention: 'креатин и силовые тренировки',
      comparator: 'плацебо и силовые тренировки', outcome: 'прирост силы', timeframe: 'не менее 4 недель',
    },
    confidence: 'moderate', limitations: ['Не переносить вывод на людей с заболеваниями почек.'],
    evidence: [{
      sourceAssessmentId: eligibleSummary.id, sourceChunkId: eligibleSummary.finding.provenanceIds[0],
      direction: 'supporting', weight: 'primary',
    }],
    reviewDueAt: '2027-08-27T00:00:00.000Z',
  };
}
