import { createThreadsApiError } from './threads-api-error.ts';

type Fetcher = typeof fetch;

interface ThreadsProfileAccessOptions {
  accessToken: string;
  apiVersion: string;
  fetcher?: Fetcher;
}

export interface ThreadsProfile {
  id: string;
  username?: string;
}

function parseProfile(payload: unknown): ThreadsProfile {
  if (!payload || typeof payload !== 'object') throw new Error('Threads profile response is invalid');
  const profile = payload as Record<string, unknown>;
  if (typeof profile.id !== 'string' || profile.id.length === 0) {
    throw new Error('Threads profile response is missing an id');
  }
  return {
    id: profile.id,
    username: typeof profile.username === 'string' ? profile.username : undefined,
  };
}

export class ThreadsProfileAccess {
  private readonly options: ThreadsProfileAccessOptions;
  private readonly fetcher: Fetcher;

  constructor(options: ThreadsProfileAccessOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
  }

  async fetchProfile(): Promise<ThreadsProfile> {
    const parameters = new URLSearchParams({
      fields: 'id,username',
      access_token: this.options.accessToken,
    });
    const url = `https://graph.threads.net/${this.options.apiVersion}/me?${parameters}`;
    const response = await this.fetcher(url);
    if (!response.ok) throw await createThreadsApiError(response, 'Threads profile access');
    return parseProfile(await response.json());
  }
}
