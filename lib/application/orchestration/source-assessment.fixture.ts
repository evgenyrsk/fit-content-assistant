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
    readerBrief: {
      plainLanguageSummary: 'Исследование сравнивает вмешательство с контролем, но доступный текст не позволяет уверенно оценить надёжность результата.',
      studySnapshot: {
        population: { value: 'Не указано в доступном тексте.', reported: false, provenanceIds: [] },
        sampleSize: { value: 'Не указано в доступном тексте.', reported: false, provenanceIds: [] },
        groups: { value: 'Не указано в доступном тексте.', reported: false, provenanceIds: [] },
      },
      keyPoints: [
        { type: 'main_result', statement: 'Авторы сообщили об увеличении силы.', provenanceIds: ['p1'] },
        { type: 'method', statement: 'Исследование описано как рандомизированное.', provenanceIds: ['p1'] },
        { type: 'limitation', statement: 'По аннотации нельзя проверить методы и неопределённость.', provenanceIds: ['p1'] },
      ],
      conclusionAllowed: 'Источник позволяет сказать только, что авторы сообщили об увеличении силы.',
      conclusionNotAllowed: 'Источник не позволяет заключить, что эффект надёжен и применим ко всем людям.',
    },
    dimensions: requiredStudyDimensions.map((dimension) => ({
      dimension, judgement: 'unclear', rationale: 'Abstract is insufficient.', provenanceIds: ['p1'],
    })),
    integrityChecks: requiredIntegrityChecks('randomized_parallel').map((check) => ({
      check, state: 'unclear', rationale: 'Abstract is insufficient.', provenanceIds: ['p1'],
    })),
  };
}
