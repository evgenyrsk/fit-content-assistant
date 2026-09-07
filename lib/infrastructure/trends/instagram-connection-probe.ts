import type { ConnectionProbe, ConnectionProbeResult } from '../../application/ports/connection-probe.ts';

interface Options { accessToken: string; userId: string; apiVersion: string; fetcher?: typeof fetch }

export class InstagramConnectionProbe implements ConnectionProbe {
  private readonly options: Options;

  constructor(options: Options) { this.options = options; }

  async inspect(): Promise<ConnectionProbeResult> {
    try {
      const query = new URLSearchParams({ fields: 'id,username', access_token: this.options.accessToken });
      const response = await (this.options.fetcher ?? fetch)(
        `https://graph.facebook.com/${this.options.apiVersion}/${this.options.userId}?${query}`,
      );
      if (!response.ok) {
        if (response.status === 401) return { status: 'failed', reason: 'credentials' };
        if (response.status === 403) return { status: 'failed', reason: 'permissions' };
        if (response.status === 429) return { status: 'failed', reason: 'rate_limited' };
        return { status: 'failed', reason: 'provider_unavailable' };
      }
      const payload = await response.json() as { username?: unknown };
      return { status: 'reachable', accountLabel: typeof payload.username === 'string' ? payload.username : undefined };
    } catch {
      return { status: 'failed', reason: 'provider_unavailable' };
    }
  }
}
