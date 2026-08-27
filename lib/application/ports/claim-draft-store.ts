import type { ClaimDraftRecord, SavedClaimVersion } from '../../domain/index.ts';

export interface ClaimDraftStore {
  save(record: ClaimDraftRecord): Promise<SavedClaimVersion>;
}
