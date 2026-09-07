import { env } from 'cloudflare:workers';
import { inspectExternalConnection } from '@/lib/application/use-cases/inspect-external-connection';
import { InstagramConnectionProbe } from '@/lib/infrastructure/trends/instagram-connection-probe';

function runtime(): Record<string, string | undefined> {
  return env as unknown as Record<string, string | undefined>;
}

export async function GET(): Promise<Response> {
  const settings = runtime();
  const accessToken = settings.INSTAGRAM_ACCESS_TOKEN;
  const userId = settings.INSTAGRAM_USER_ID;
  const apiVersion = settings.META_GRAPH_API_VERSION;
  const configured = Boolean(accessToken && userId && apiVersion);
  const status = await inspectExternalConnection({
    source: 'instagram', configured,
    operatingMode: settings.INSTAGRAM_APP_MODE === 'live' ? 'live' : 'personal',
    expiresAt: settings.INSTAGRAM_TOKEN_EXPIRES_AT,
  }, {
    probe: configured ? new InstagramConnectionProbe({
      accessToken: accessToken as string, userId: userId as string, apiVersion: apiVersion as string,
    }) : undefined,
  });
  return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
