import { env } from 'cloudflare:workers';
import { inspectExternalConnection } from '@/lib/application/use-cases/inspect-external-connection';
import { ThreadsConnectionProbe } from '@/lib/infrastructure/trends/threads-connection-probe';
import { ThreadsProfileAccess } from '@/lib/infrastructure/trends/threads-profile-access';

function runtime(): Record<string, string | undefined> {
  return env as unknown as Record<string, string | undefined>;
}

export async function GET(): Promise<Response> {
  const settings = runtime();
  const accessToken = settings.THREADS_ACCESS_TOKEN;
  const apiVersion = settings.THREADS_API_VERSION;
  const configured = Boolean(accessToken && apiVersion);
  const profileAccess = configured
    ? new ThreadsProfileAccess({ accessToken: accessToken as string, apiVersion: apiVersion as string })
    : undefined;
  const status = await inspectExternalConnection({
    source: 'threads',
    configured,
    operatingMode: settings.THREADS_APP_MODE === 'live' ? 'live' : 'personal',
    expiresAt: settings.THREADS_TOKEN_EXPIRES_AT,
  }, {
    probe: profileAccess ? new ThreadsConnectionProbe(profileAccess) : undefined,
  });

  return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
