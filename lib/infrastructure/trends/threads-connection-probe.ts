import type { ConnectionProbe, ConnectionProbeResult } from '../../application/ports/connection-probe.ts';
import { ThreadsApiError } from './threads-api-error.ts';
import type { ThreadsProfile } from './threads-profile-access.ts';

interface ThreadsProfileReader {
  fetchProfile(): Promise<ThreadsProfile>;
}

export class ThreadsConnectionProbe implements ConnectionProbe {
  private readonly profileReader: ThreadsProfileReader;

  constructor(profileReader: ThreadsProfileReader) {
    this.profileReader = profileReader;
  }

  async inspect(): Promise<ConnectionProbeResult> {
    try {
      const profile = await this.profileReader.fetchProfile();
      return { status: 'reachable', accountLabel: profile.username };
    } catch (cause) {
      if (cause instanceof ThreadsApiError) return { status: 'failed', reason: cause.kind };
      return { status: 'failed', reason: 'provider_unavailable' };
    }
  }
}
