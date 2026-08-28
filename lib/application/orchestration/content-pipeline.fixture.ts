import type { KnowledgeClaimRecord } from '../../domain/index.ts';
import type { ContentBriefDraft } from './content-brief-contract.ts';
import type { FactReviewOutput } from './fact-review-contract.ts';
import type { PlatformDraftOutput } from './platform-draft-contract.ts';
import type { VoiceEditOutput } from './voice-edit-contract.ts';

export const approvedClaim: KnowledgeClaimRecord = {
  id: 'claim-version-1', claimId: 'claim-1', version: 2,
  statement: 'У здоровых взрослых креатин может умеренно увеличить прирост силы при силовых тренировках.',
  topic: 'Креатин', scope: { population: 'здоровые взрослые', outcome: 'прирост силы' },
  confidence: 'moderate', limitations: ['Вывод нельзя переносить на людей с заболеваниями почек.'],
  status: 'approved', evidenceCount: 4, sourceTypes: ['systematic_review'],
  reviewDueAt: '2027-08-28T00:00:00.000Z', createdAt: '2026-08-28T00:00:00.000Z',
};

export const validContentBrief: ContentBriefDraft = {
  titleAngle: 'Креатин без магии',
  coreIdea: 'Креатин может дать умеренную прибавку к силовому прогрессу, но не заменяет тренировку.',
  tension: 'Добавка работает, но заметно скромнее рекламных обещаний.',
  practicalValue: 'Помочь отделить ожидаемый эффект от завышенных ожиданий.',
  selectedClaimVersionIds: [approvedClaim.id],
};

export const validPlatformDraft: PlatformDraftOutput = {
  title: 'Креатин работает — но не так, как обещает реклама',
  fragments: [
    { id: 'fragment-1', text: 'Креатин может умеренно помочь приросту силы.', kind: 'fact', claimVersionIds: [approvedClaim.id] },
    { id: 'fragment-2', text: 'Но это только часть общей картины.', kind: 'transition', claimVersionIds: [] },
    { id: 'fragment-3', text: approvedClaim.limitations[0], kind: 'fact', claimVersionIds: [approvedClaim.id] },
  ],
  coveredCaveats: [...approvedClaim.limitations],
};

export const validVoiceEdit: VoiceEditOutput = {
  title: 'Креатин работает. Магии всё ещё нет.',
  fragments: [
    { ...validPlatformDraft.fragments[0], text: 'Креатин действительно может немного помочь приросту силы.' },
    { ...validPlatformDraft.fragments[1], text: 'Но это только одна часть общей картины.' },
    { ...validPlatformDraft.fragments[2] },
  ],
  preservedCaveats: [...approvedClaim.limitations],
};

export const validFactReview: FactReviewOutput = {
  decision: 'approved',
  fragmentReviews: validVoiceEdit.fragments.map((fragment) => ({
    fragmentId: fragment.id, decision: 'approved', claimVersionIds: fragment.claimVersionIds, reasons: [],
  })),
  preservedCaveats: [...approvedClaim.limitations],
  unsupportedFragmentIds: [],
  notes: ['Все фактические фрагменты связаны с approved-claim.'],
};
