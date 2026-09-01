export type LlmConnectionState = 'connected' | 'not_configured' | 'attention_required';

export interface LlmConnectionStatus {
  state: LlmConnectionState;
  provider?: 'openai' | 'openrouter';
  researchModel?: string;
  contentModel?: string;
  budgetProfile: 'economy' | 'balanced';
  privacy: 'zero_retention_required';
  liveProbe: boolean;
  checkedAt: string;
  summary: string;
  detail: string;
  recommendedAction?: string;
}
