import assert from 'node:assert/strict';
import test from 'node:test';
import { ThreadsKeywordSearch, parseThreadsPosts } from './threads-keyword-search.ts';

const now = new Date('2026-08-28T12:00:00.000Z');

test('maps live Threads posts and marks old posts as stale', () => {
  const candidates = parseThreadsPosts({ data: [
    { id: 'live', text: 'Почему мышцы растут после тренировки?', timestamp: '2026-08-28T11:00:00.000Z' },
    { id: 'old', text: 'Старый пост про мышцы', timestamp: '2026-08-20T11:00:00.000Z' },
  ] }, now);

  assert.equal(candidates[0].status, 'live');
  assert.equal(candidates[1].status, 'stale');
  assert.equal(candidates[0].source, 'threads');
});

test('searches focused default topics, deduplicates posts and keeps only live fitness signals', async () => {
  const urls: URL[] = [];
  const provider = new ThreadsKeywordSearch({
    accessToken: 'secret',
    apiVersion: 'v1.0',
    now: () => now,
    profileAccess: { fetchProfile: async () => ({ id: 'user' }) },
    fetcher: async (input) => {
      const url = new URL(String(input));
      urls.push(url);
      const query = url.searchParams.get('q');
      return Response.json({ data: query === 'мышцы' || query === 'тренировка' ? [
        { id: 'same', text: 'Почему мышцы растут после тренировки?', timestamp: '2026-08-28T11:00:00.000Z' },
        { id: 'stale', text: 'Старый пост про мышцы', timestamp: '2026-08-20T11:00:00.000Z' },
      ] : [] });
    },
  });

  const candidates = await provider.discover({ region: 'RU', limit: 6 });

  assert.equal(urls.length, 6);
  assert.ok(urls.every((url) => url.searchParams.get('search_type') === 'TOP'));
  assert.ok(urls.every((url) => Boolean(url.searchParams.get('since'))));
  assert.deepEqual(candidates.map((candidate) => candidate.id), ['threads:same']);
});

test('uses one request for an explicit query and surfaces a total provider failure', async () => {
  let calls = 0;
  const provider = new ThreadsKeywordSearch({
    accessToken: 'secret',
    apiVersion: 'v1.0',
    now: () => now,
    profileAccess: { fetchProfile: async () => ({ id: 'user' }) },
    fetcher: async () => {
      calls += 1;
      return new Response(null, { status: 503 });
    },
  });

  await assert.rejects(
    provider.discover({ query: 'креатин', region: 'RU', limit: 6 }),
    /Threads keyword search failed: 503/,
  );
  assert.equal(calls, 1);
});

test('verifies the connected profile before running keyword search', async () => {
  const calls: string[] = [];
  const provider = new ThreadsKeywordSearch({
    accessToken: 'secret',
    apiVersion: 'v1.0',
    now: () => now,
    profileAccess: {
      fetchProfile: async () => {
        calls.push('profile');
        return { id: 'user' };
      },
    },
    fetcher: async () => {
      calls.push('search');
      return Response.json({ data: [] });
    },
  });

  await provider.discover({ query: 'сон', region: 'RU', limit: 6 });

  assert.deepEqual(calls, ['profile', 'search']);
});
