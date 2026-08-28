import type { TopicBankResult, TopicIdeaInput, UserNote } from '../../domain/index.ts';

export interface TopicBankStore {
  list(now: string): Promise<TopicBankResult>;
  save(input: TopicIdeaInput, now: string): Promise<string>;
  listNotes(limit: number): Promise<UserNote[]>;
  saveNote(input: Omit<UserNote, 'id' | 'evidenceUse' | 'createdAt'>, now: string): Promise<string>;
}
