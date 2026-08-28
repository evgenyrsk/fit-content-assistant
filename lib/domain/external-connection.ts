export type ExternalConnectionSource = 'threads' | 'instagram';

export type ExternalConnectionState =
  | 'connected'
  | 'attention_required'
  | 'temporarily_unavailable'
  | 'not_configured';

export type CredentialFreshness = 'healthy' | 'refresh_soon' | 'expired' | 'unknown';

export interface ExternalConnectionStatus {
  source: ExternalConnectionSource;
  state: ExternalConnectionState;
  operatingMode: 'personal' | 'live';
  credentialFreshness: CredentialFreshness;
  accountLabel?: string;
  expiresAt?: string;
  checkedAt: string;
  summary: string;
  detail: string;
  recommendedAction?: string;
}
