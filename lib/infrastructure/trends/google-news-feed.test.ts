import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGoogleNewsFeed } from './google-news-feed.ts';

test('labels recent fitness news as a proxy instead of social-platform data', () => {
  const xml = `<rss><channel><item><title>Почему белок важен после тренировки - Example</title>
    <link>https://news.google.com/example</link><pubDate>Thu, 27 Aug 2026 10:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const candidates = parseGoogleNewsFeed(xml, new Date('2026-08-27T12:00:00.000Z'));
  assert.equal(candidates[0].source, 'google_news');
  assert.match(candidates[0].sourceLabel, /proxy/);
  assert.equal(candidates[0].freshnessMinutes, 120);
  assert.ok(candidates[0].audienceFit > 0);
});

test('rejects lexical false positives outside the fitness context', () => {
  const xml = `<rss><channel><item><title>Ветеринар объяснил, почему нельзя кормить диких белок</title>
    <pubDate>Thu, 27 Aug 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
  const candidates = parseGoogleNewsFeed(xml, new Date('2026-08-27T12:00:00.000Z'));
  assert.equal(candidates[0].audienceFit, 0);
});
