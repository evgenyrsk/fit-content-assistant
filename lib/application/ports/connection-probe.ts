export type ConnectionFailureReason =
  | 'credentials'
  | 'permissions'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'unexpected';

export type ConnectionProbeResult =
  | { status: 'reachable'; accountLabel?: string }
  | { status: 'failed'; reason: ConnectionFailureReason };

export interface ConnectionProbe {
  inspect(): Promise<ConnectionProbeResult>;
}
