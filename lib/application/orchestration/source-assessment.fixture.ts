import { requiredStudyDimensions } from '../../domain/evidence-methodology.ts';
import { requiredIntegrityChecks } from '../../domain/study-integrity-policy.ts';
import type { SourceAssessmentDraft } from './source-assessment-contract.ts';

export function validSourceAssessmentDraft(): SourceAssessmentDraft {
  return {
    resultId: 'strength-result', questionType: 'intervention_effect',
    studyDesign: 'randomized_parallel', targetOutcomeMeasured: true,
    sponsorRole: 'not_reported',
    finding: {
      direction: 'supporting', effectEstimate: 'Increase reported in abstract.',
      statisticalUncertainty: 'Insufficient detail in abstract.',
      practicalSignificance: 'Cannot be established from abstract.', provenanceIds: ['p1'],
    },
    dimensions: requiredStudyDimensions.map((dimension) => ({
      dimension, judgement: 'unclear', rationale: 'Abstract is insufficient.', provenanceIds: ['p1'],
    })),
    integrityChecks: requiredIntegrityChecks('randomized_parallel').map((check) => ({
      check, state: 'unclear', rationale: 'Abstract is insufficient.', provenanceIds: ['p1'],
    })),
  };
}
