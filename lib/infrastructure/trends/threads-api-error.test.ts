import assert from 'node:assert/strict';
import test from 'node:test';
import { createThreadsApiError } from './threads-api-error.ts';

test('classifies rejected OAuth credentials without returning the provider message', async () => {
  const response = Response.json({ error: { code: 190, message: 'sensitive provider detail' } }, { status: 400 });
  const error = await createThreadsApiError(response, 'Threads profile access');

  assert.equal(error.kind, 'credentials');
  assert.equal(error.status, 400);
  assert.equal(error.message, 'Threads profile access failed: 400');
  assert.doesNotMatch(error.message, /sensitive/);
});

test('classifies rate limits and provider failures', async () => {
  const limited = await createThreadsApiError(new Response(null, { status: 429 }), 'Threads search');
  const unavailable = await createThreadsApiError(new Response(null, { status: 503 }), 'Threads search');

  assert.equal(limited.kind, 'rate_limited');
  assert.equal(unavailable.kind, 'provider_unavailable');
});
