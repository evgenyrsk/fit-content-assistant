export type TrendSource = 'google_trends' | 'google_news' | 'pubmed_pulse' | 'threads' | 'instagram';

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
  sourceErrors: Partial<Record<TrendSource, string>>;
  sourceNotices: Partial<Record<TrendSource, string>>;
  status: 'live' | 'empty' | 'unavailable';
  message: string;
  refreshedAt: string;
}
