export type TrendSource = 'google_trends' | 'google_news' | 'threads' | 'instagram';

export interface TrendCandidate {
  id: string;
  title: string;
  source: TrendSource;
  sourceLabel: string;
  url?: string;
  observedAt: string;
  freshnessMinutes: number;
  growthSignal: string;
  audienceFit: number;
  scientificResearchability: number;
  saturationRisk: number;
  platforms: string[];
  status: 'live' | 'stale';
}

export interface TrendDiscoveryResult {
  candidates: TrendCandidate[];
  activeSources: TrendSource[];
  unavailableSources: TrendSource[];
  status: 'live' | 'unavailable';
  message: string;
  refreshedAt: string;
}
