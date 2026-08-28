export type ThreadsApiFailureKind =
  | 'credentials'
  | 'permissions'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'unexpected';

interface MetaErrorPayload {
  error?: { code?: unknown };
}

const rateLimitCodes = new Set([4, 17, 32, 613]);

function failureKind(status: number, code?: number): ThreadsApiFailureKind {
  if (status === 401 || code === 190) return 'credentials';
  if (status === 403 || code === 10 || code === 200) return 'permissions';
  if (status === 429 || (code !== undefined && rateLimitCodes.has(code))) return 'rate_limited';
  if (status >= 500) return 'provider_unavailable';
  return 'unexpected';
}

async function responseCode(response: Response): Promise<number | undefined> {
  try {
    const payload = await response.clone().json() as MetaErrorPayload;
    return typeof payload.error?.code === 'number' ? payload.error.code : undefined;
  } catch {
    return undefined;
  }
}

export class ThreadsApiError extends Error {
  readonly kind: ThreadsApiFailureKind;
  readonly status: number;

  constructor(operation: string, status: number, kind: ThreadsApiFailureKind) {
    super(`${operation} failed: ${status}`);
    this.name = 'ThreadsApiError';
    this.kind = kind;
    this.status = status;
  }
}

export async function createThreadsApiError(response: Response, operation: string): Promise<ThreadsApiError> {
  const code = await responseCode(response);
  return new ThreadsApiError(operation, response.status, failureKind(response.status, code));
}
