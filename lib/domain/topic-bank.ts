import type { ContentFormat } from './content.ts';

export type TopicOrigin = 'manual' | 'knowledge_gap' | 'contradiction' | 'trend';
export type ScientificReadiness = 'supported' | 'research_needed' | 'blocked';
export type TopicIdeaStatus = 'backlog' | 'selected' | 'dismissed';

export interface TopicIdea {
  id: string;
  title: string;
  angle: string;
  origin: TopicOrigin;
  scientificReadiness: ScientificReadiness;
  targetFormat: ContentFormat;
  status: TopicIdeaStatus;
  linkedClaimIds: string[];
  linkedSignalIds: string[];
  derived: boolean;
  updatedAt: string;
}

export interface TopicBankResult {
  saved: TopicIdea[];
  suggestions: TopicIdea[];
  generatedAt: string;
}

export interface TopicIdeaInput {
  id?: string;
  title: string;
  angle: string;
  origin: TopicOrigin;
  scientificReadiness: ScientificReadiness;
  targetFormat: ContentFormat;
  status?: TopicIdeaStatus;
  linkedClaimIds?: string[];
  linkedSignalIds?: string[];
}

export type UserNoteKind = 'personal_experience' | 'observation' | 'idea';

export interface UserNote {
  id: string;
  kind: UserNoteKind;
  topic: string;
  content: string;
  evidenceUse: 'narrative_only';
  createdAt: string;
}

export function validateTopicIdea(input: TopicIdeaInput): string[] {
  const errors: string[] = [];
  if (input.title.trim().length < 4) errors.push('Название темы слишком короткое.');
  if (input.angle.trim().length < 10) errors.push('Опишите конкретный угол подачи.');
  return errors;
}

export function validateUserNote(input: Omit<UserNote, 'id' | 'evidenceUse' | 'createdAt'>): string[] {
  const errors: string[] = [];
  if (input.topic.trim().length < 2) errors.push('Укажите тему заметки.');
  if (input.content.trim().length < 10) errors.push('Заметка слишком короткая.');
  return errors;
}
