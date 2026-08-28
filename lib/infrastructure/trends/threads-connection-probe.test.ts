import assert from 'node:assert/strict';
import test from 'node:test';
import { ThreadsApiError } from './threads-api-error.ts';
import { ThreadsConnectionProbe } from './threads-connection-probe.ts';

test('returns only the connected public profile label', async () => {
  const probe = new ThreadsConnectionProbe({
    fetchProfile: async () => ({ id: 'private-id', username: 'forme' }),
  });

  assert.deepEqual(await probe.inspect(), { status: 'reachable', accountLabel: 'forme' });
});

test('maps typed API failures to the provider-neutral contract', async () => {
  const probe = new ThreadsConnectionProbe({
    fetchProfile: async () => { throw new ThreadsApiError('Threads profile access', 401, 'credentials'); },
  });

  assert.deepEqual(await probe.inspect(), { status: 'failed', reason: 'credentials' });
});
