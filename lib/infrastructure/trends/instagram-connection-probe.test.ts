import assert from 'node:assert/strict';
import test from 'node:test';
import { InstagramConnectionProbe } from './instagram-connection-probe.ts';

test('probes Instagram without exposing the access token', async () => {
  let requested = '';
  const probe = new InstagramConnectionProbe({
    accessToken: 'secret', userId: '42', apiVersion: 'v24.0',
    fetcher: async (input) => { requested = String(input); return Response.json({ id: '42', username: 'forme' }); },
  });
  assert.deepEqual(await probe.inspect(), { status: 'reachable', accountLabel: 'forme' });
  assert.match(requested, /fields=id%2Cusername/);
});

test('classifies rejected Instagram permissions', async () => {
  const probe = new InstagramConnectionProbe({
    accessToken: 'secret', userId: '42', apiVersion: 'v24.0',
    fetcher: async () => new Response('', { status: 403 }),
  });
  assert.deepEqual(await probe.inspect(), { status: 'failed', reason: 'permissions' });
});
