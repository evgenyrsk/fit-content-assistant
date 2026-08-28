import assert from 'node:assert/strict';
import test from 'node:test';
import { ThreadsProfileAccess } from './threads-profile-access.ts';

test('requests the connected Threads profile without exposing the token', async () => {
  let requestedUrl: URL | undefined;
  const access = new ThreadsProfileAccess({
    accessToken: 'secret',
    apiVersion: 'v1.0',
    fetcher: async (input) => {
      requestedUrl = new URL(String(input));
      return Response.json({ id: 'user-1', username: 'forme' });
    },
  });

  const profile = await access.fetchProfile();

  assert.deepEqual(profile, { id: 'user-1', username: 'forme' });
  assert.equal(requestedUrl?.pathname, '/v1.0/me');
  assert.equal(requestedUrl?.searchParams.get('fields'), 'id,username');
  assert.equal(requestedUrl?.searchParams.get('access_token'), 'secret');
});

test('fails closed when Threads rejects profile access', async () => {
  const access = new ThreadsProfileAccess({
    accessToken: 'secret',
    apiVersion: 'v1.0',
    fetcher: async () => new Response(null, { status: 401 }),
  });

  await assert.rejects(access.fetchProfile(), /Threads profile access failed: 401/);
});
