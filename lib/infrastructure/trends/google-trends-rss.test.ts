import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGoogleTrendsRss } from './google-trends-rss.ts';

test('preserves live source, timestamp and growth label from Google Trends RSS', () => {
  const xml = `<rss xmlns:ht="https://trends.google.com/trending/rss"><channel><item>
    <title>protein workout benefits</title><link>https://trends.google.com/example</link>
    <pubDate>Thu, 27 Aug 2026 11:00:00 GMT</pubDate><ht:approx_traffic>10K+</ht:approx_traffic>
  </item></channel></rss>`;
  const candidates = parseGoogleTrendsRss(xml, new Date('2026-08-27T12:00:00.000Z'));
  assert.equal(candidates[0].status, 'live');
  assert.equal(candidates[0].freshnessMinutes, 60);
  assert.equal(candidates[0].growthSignal, 'Всплеск поиска · 10K+');
  assert.ok(candidates[0].audienceFit > 0);
});
