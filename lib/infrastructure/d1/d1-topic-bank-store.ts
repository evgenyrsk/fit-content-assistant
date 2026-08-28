import type { D1Database } from '@cloudflare/workers-types';
import type { TopicBankStore } from '../../application/ports/topic-bank-store.ts';
import {
  validateTopicIdea, validateUserNote,
  type TopicBankResult, type TopicIdea, type TopicIdeaInput, type UserNote,
} from '../../domain/index.ts';

interface TopicRow {
  id: string; title: string; angle: string; origin: TopicIdea['origin'];
  scientific_readiness: TopicIdea['scientificReadiness']; target_format: TopicIdea['targetFormat'];
  status: TopicIdea['status']; linked_claim_ids_json: string; linked_signal_ids_json: string; updated_at: string;
}
interface ClaimSuggestionRow { id: string; statement: string; reason: 'due' | 'contradiction'; updated_at: string }
interface TrendSuggestionRow { id: string; title: string; observed_at: string }
interface NoteRow { id: string; note_kind: UserNote['kind']; topic: string; content: string; created_at: string }

function ids(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function savedTopic(row: TopicRow): TopicIdea {
  return {
    id: row.id, title: row.title, angle: row.angle, origin: row.origin,
    scientificReadiness: row.scientific_readiness, targetFormat: row.target_format,
    status: row.status, linkedClaimIds: ids(row.linked_claim_ids_json),
    linkedSignalIds: ids(row.linked_signal_ids_json), derived: false, updatedAt: row.updated_at,
  };
}

export class D1TopicBankStore implements TopicBankStore {
  constructor(private readonly database: D1Database) {}

  async list(now: string): Promise<TopicBankResult> {
    const [saved, claims, trends] = await Promise.all([
      this.database.prepare('SELECT * FROM topic_ideas ORDER BY updated_at DESC LIMIT 100').all<TopicRow>(),
      this.database.prepare(`
        WITH latest AS (SELECT claim_id, MAX(version) AS version FROM claim_versions GROUP BY claim_id),
        directions AS (SELECT claim_version_id, COUNT(DISTINCT direction) AS count FROM claim_evidence GROUP BY claim_version_id)
        SELECT cv.id, cv.statement,
          CASE WHEN datetime(cv.review_due_at) <= datetime(?) THEN 'due' ELSE 'contradiction' END AS reason,
          cv.created_at AS updated_at
        FROM claim_versions cv JOIN latest l ON l.claim_id = cv.claim_id AND l.version = cv.version
        LEFT JOIN directions d ON d.claim_version_id = cv.id
        WHERE cv.status = 'approved' AND (datetime(cv.review_due_at) <= datetime(?) OR d.count > 1)
        ORDER BY CASE WHEN datetime(cv.review_due_at) <= datetime(?) THEN 0 ELSE 1 END, cv.created_at DESC LIMIT 12
      `).bind(now, now, now).all<ClaimSuggestionRow>(),
      this.database.prepare(`SELECT id, title, observed_at FROM trend_signals
        WHERE datetime(observed_at, '+14 days') > datetime(?) ORDER BY observed_at DESC LIMIT 8`)
        .bind(now).all<TrendSuggestionRow>(),
    ]);
    const claimIdeas = claims.results.map((row): TopicIdea => ({
      id: `derived:${row.reason}:${row.id}`,
      title: row.reason === 'due' ? `Обновить: ${row.statement}` : `Разобрать противоречие: ${row.statement}`,
      angle: row.reason === 'due'
        ? 'Проверить свежие исследования и показать, изменился ли практический вывод.'
        : 'Честно объяснить, почему исследования расходятся и что можно утверждать сейчас.',
      origin: row.reason === 'due' ? 'knowledge_gap' : 'contradiction', scientificReadiness: 'research_needed',
      targetFormat: 'threads', status: 'backlog', linkedClaimIds: [row.id], linkedSignalIds: [],
      derived: true, updatedAt: row.updated_at,
    }));
    const trendIdeas = trends.results.map((row): TopicIdea => ({
      id: `derived:trend:${row.id}`, title: row.title,
      angle: 'Сначала проверить научную исследуемость темы; тренд сам по себе не является evidence.',
      origin: 'trend', scientificReadiness: 'research_needed', targetFormat: 'reels', status: 'backlog',
      linkedClaimIds: [], linkedSignalIds: [row.id], derived: true, updatedAt: row.observed_at,
    }));
    return { saved: saved.results.map(savedTopic), suggestions: [...claimIdeas, ...trendIdeas], generatedAt: now };
  }

  async save(input: TopicIdeaInput, now: string): Promise<string> {
    const errors = validateTopicIdea(input);
    if (errors.length) throw new Error(errors.join(' '));
    const id = input.id ?? crypto.randomUUID();
    await this.database.prepare(`INSERT INTO topic_ideas
      (id, title, angle, origin, scientific_readiness, target_format, status,
        linked_claim_ids_json, linked_signal_ids_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, angle = excluded.angle,
        scientific_readiness = excluded.scientific_readiness, target_format = excluded.target_format,
        status = excluded.status, linked_claim_ids_json = excluded.linked_claim_ids_json,
        linked_signal_ids_json = excluded.linked_signal_ids_json, updated_at = excluded.updated_at
    `).bind(
      id, input.title.trim(), input.angle.trim(), input.origin, input.scientificReadiness,
      input.targetFormat, input.status ?? 'backlog', JSON.stringify(input.linkedClaimIds ?? []),
      JSON.stringify(input.linkedSignalIds ?? []), now, now,
    ).run();
    return id;
  }

  async listNotes(limit: number): Promise<UserNote[]> {
    const result = await this.database.prepare(`SELECT id, note_kind, topic, content, created_at
      FROM user_notes ORDER BY created_at DESC LIMIT ?`).bind(Math.min(Math.max(limit, 1), 100)).all<NoteRow>();
    return result.results.map((row) => ({
      id: row.id, kind: row.note_kind, topic: row.topic, content: row.content,
      evidenceUse: 'narrative_only', createdAt: row.created_at,
    }));
  }

  async saveNote(input: Omit<UserNote, 'id' | 'evidenceUse' | 'createdAt'>, now: string): Promise<string> {
    const errors = validateUserNote(input);
    if (errors.length) throw new Error(errors.join(' '));
    const id = crypto.randomUUID();
    await this.database.prepare(`INSERT INTO user_notes
      (id, note_kind, topic, content, evidence_use, created_at)
      VALUES (?, ?, ?, ?, 'narrative_only', ?)`)
      .bind(id, input.kind, input.topic.trim(), input.content.trim(), now).run();
    return id;
  }
}
