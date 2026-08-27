export type Mode = 'Исследовать' | 'Создать' | 'Проверить';
export type ContentFormat = 'Reels' | 'Telegram' | 'Threads' | 'Карусель';
export type ViewId = 'workspace' | 'knowledge' | 'content' | 'history';
export type Theme = 'light' | 'dark';

export interface DemoClaim {
  confidence: 'Высокая' | 'Умеренная' | 'Недостаточно данных';
  tone: 'high' | 'moderate' | 'limited';
  marker: string;
  topic: string;
  status: 'verified' | 'provisional' | 'disputed';
  text: string;
  evidence: string;
}

export interface DemoTrend {
  title: string;
  angle: string;
  platforms: string[];
  signal: string;
  science: string;
}

export interface DemoContentItem {
  format: ContentFormat;
  title: string;
  state: string;
  claims: number;
  updated: string;
}

export interface DemoContentDraft {
  title: string;
  meta: string;
  body: string[];
}
