'use client';

import { useState } from 'react';
import type { ContentFormat, Mode } from '@/features/shared';
import { ContentComposer } from './content-composer';
import { ResearchConsole } from './research-console';
import { ResearchResult } from './research-result';
import { useResearchSearch } from './use-research-search';

interface WorkspaceViewProps {
  activeFormat: ContentFormat | null;
  onFormatChange: (format: ContentFormat | null) => void;
}

export function WorkspaceView({ activeFormat, onFormatChange }: WorkspaceViewProps) {
  const [topic, setTopic] = useState('Нужно ли тренироваться до отказа для роста мышц?');
  const [mode, setMode] = useState<Mode>('Исследовать');
  const { status, result, error, start } = useResearchSearch();
  const [showAllClaims, setShowAllClaims] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendSource, setTrendSource] = useState<'all' | 'google_trends' | 'google_news' | 'pubmed_pulse' | 'threads' | 'instagram'>('all');

  async function startWork() {
    if (!topic.trim()) return;
    onFormatChange(null);
    await start(topic);
  }

  function chooseTrend(nextTopic: string) {
    setTopic(nextTopic);
    setMode('Исследовать');
    setTrendOpen(false);
    window.setTimeout(() => document.getElementById('topic')?.focus(), 0);
  }

  return (
    <>
      <ResearchConsole topic={topic} mode={mode} status={status} trendOpen={trendOpen} trendSource={trendSource} onTopicChange={setTopic} onModeChange={setMode} onStart={startWork} onTrendToggle={() => setTrendOpen((value) => !value)} onTrendSourceChange={setTrendSource} onTrendChoose={chooseTrend} />
      <ResearchResult topic={topic} working={status === 'working'} result={result} error={error} showAllClaims={showAllClaims} onToggleClaims={() => setShowAllClaims((value) => !value)} />
      <ContentComposer activeFormat={activeFormat} onFormatChange={onFormatChange} />
    </>
  );
}
