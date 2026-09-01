export type LlmConnectionState = 'connected' | 'not_configured' | 'attention_required';

export interface LlmConnectionStatus {
  state: LlmConnectionState;
  provider?: 'openai' | 'openrouter' | 'routerai';
  researchModel?: string;
  contentModel?: string;
  budgetProfile: 'economy' | 'balanced';
  privacy: 'zero_retention_required' | 'gateway_no_prompt_storage';
  liveProbe: boolean;
  checkedAt: string;
  summary: string;
  detail: string;
  recommendedAction?: string;
}
