import assert from 'node:assert/strict';
import test from 'node:test';
import { InstagramHashtagSearch, parseInstagramHashtagMedia } from './instagram-hashtag-search.ts';

test('maps hashtag media as a live social signal without treating it as evidence', () => {
  const candidates = parseInstagramHashtagMedia({ data: [{
    id: 'media-1',
    caption: 'Почему тренировки до отказа не всегда лучше для роста мышц?',
    like_count: 1200,
    comments_count: 80,
    permalink: 'https://www.instagram.com/p/example/',
    timestamp: '2026-08-28T08:00:00.000Z',
  }] }, new Date('2026-08-28T09:00:00.000Z'), 'фитнес');

  assert.equal(candidates[0].source, 'instagram');
  assert.equal(candidates[0].sourceLabel, 'Instagram · #фитнес');
  assert.equal(candidates[0].freshnessMinutes, 60);
  assert.match(candidates[0].growthSignal, /1200 реакций/);
  assert.ok(candidates[0].scientificResearchability > 0);
});

test('looks up a hashtag before requesting recent media', async () => {
  const requested: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.includes('/ig_hashtag_search?')) return Response.json({ data: [{ id: 'hashtag-1' }] });
    return Response.json({ data: [{
      id: 'media-1', caption: 'Фитнес тренировка: почему больше не всегда лучше', timestamp: '2026-08-28T08:00:00.000Z',
    }] });
  };
  const provider = new InstagramHashtagSearch({
    accessToken: 'secret-token', userId: 'ig-user-1', apiVersion: 'v24.0', fetcher,
    now: () => new Date('2026-08-28T09:00:00.000Z'),
  });

  const candidates = await provider.discover({ query: '#фитнес советы', region: 'RU', limit: 4 });

  assert.equal(requested.length, 2);
  assert.match(requested[0], /ig_hashtag_search/);
  assert.match(requested[0], /q=%D1%84%D0%B8%D1%82%D0%BD%D0%B5%D1%81/);
  assert.match(requested[1], /hashtag-1\/recent_media/);
  assert.equal(candidates.length, 1);
});

test('returns no candidates when Meta has no matching hashtag id', async () => {
  const provider = new InstagramHashtagSearch({
    accessToken: 'secret-token', userId: 'ig-user-1', apiVersion: 'v24.0',
    fetcher: async () => Response.json({ data: [] }),
  });
  const candidates = await provider.discover({ region: 'RU', limit: 4 });
  assert.deepEqual(candidates, []);
});
