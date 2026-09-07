import type { SourceAssessmentSummary } from '../../domain/index.ts';
import type { BodyAssessmentDraft } from './body-assessment-contract.ts';

export const eligibleSummary: SourceAssessmentSummary = {
  id: 'assessment-1', sourceId: 'pmid:123', resultId: 'strength-result',
  questionType: 'intervention_effect', studyDesign: 'randomized_parallel',
  decision: 'eligible_for_synthesis', reasons: ['eligible_with_recorded_caveats'],
  finding: {
    direction: 'supporting', effectEstimate: 'Mean difference 4 kg',
    statisticalUncertainty: '95% CI 1 to 7 kg', practicalSignificance: 'Potentially meaningful',
    provenanceIds: ['chunk-1'],
  },
  methodologyVersion: '0.2.0-draft', createdAt: '2026-08-27T00:00:00.000Z',
  humanReview: {
    id: 'review-1', assessmentId: 'assessment-1', decision: 'confirmed',
    findingChecked: true, provenanceChecked: true, scopeChecked: true,
    reason: 'Источник, finding, provenance и scope проверены человеком.',
    reviewerId: 'owner', createdAt: '2026-08-27T00:00:00.000Z',
  },
};

export function validBodyAssessmentDraft(): BodyAssessmentDraft {
  const domains = ['risk_of_bias', 'inconsistency', 'indirectness', 'imprecision', 'publication_bias'] as const;
  return {
    outcomeId: 'strength', eligibleStudyAssessmentIds: ['assessment-1'],
    contradictoryStudyAssessmentIds: [],
    domains: domains.map((domain) => ({
      domain, concern: 'not_serious', rationale: 'Supported by the supplied assessment.',
      supportingAssessmentIds: ['assessment-1'],
    })),
    initialCertainty: 'high', proposedCertainty: 'moderate',
    rationale: 'One eligible study; certainty remains limited pending review.',
  };
}
