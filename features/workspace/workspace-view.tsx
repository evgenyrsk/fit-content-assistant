'use client';

import { useState } from 'react';
import type { ContentFormat, Mode } from '@/features/shared';
import { ContentComposer } from './content-composer';
import { EvidenceFlowDemo } from './evidence-flow-demo';
import { LlmConnectionPanel } from './llm-connection-panel';
import { OperationsHealthPanel } from './operations-health-panel';
import { LiveEvidenceWorkbench } from './live-evidence-workbench';
import { ResearchConsole } from './research-console';
import { ResearchResult } from './research-result';
import { ReviewerDemo } from './reviewer-demo';
import { SourceReviewQueue } from './source-review-queue';
import { useResearchSearch } from './use-research-search';
import { useLlmConnection } from './use-llm-connection';
import { useOperationsHealth } from './use-operations-health';

interface WorkspaceViewProps {
  initialTopic?: string;
  activeFormat: ContentFormat | null;
  onFormatChange: (format: ContentFormat | null) => void;
  onOpenContent: () => void;
}

export function WorkspaceView({ initialTopic, activeFormat, onFormatChange, onOpenContent }: WorkspaceViewProps) {
  const [topic, setTopic] = useState(initialTopic || 'Нужно ли тренироваться до отказа для роста мышц?');
  const [mode, setMode] = useState<Mode>(activeFormat ? 'Создать' : 'Исследовать');
  const { status, result, error, start } = useResearchSearch();
  const llm = useLlmConnection();
  const operations = useOperationsHealth();
  const [showAllClaims, setShowAllClaims] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendSource, setTrendSource] = useState<'all' | 'google_trends' | 'google_news' | 'pubmed_pulse' | 'threads' | 'instagram'>('all');
  const [contentAutoRunKey, setContentAutoRunKey] = useState(0);
  const [contentClaimVersionIds, setContentClaimVersionIds] = useState<string[]>([]);

  async function startWork() {
    if (!topic.trim()) return;
    if (mode === 'Проверить') {
      document.getElementById('evidence-flow-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (mode === 'Создать') {
      onFormatChange(activeFormat ?? 'Threads');
      window.setTimeout(() => document.querySelector('.content-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
      return;
    }
    onFormatChange(null);
    await start(topic);
  }

  function chooseTrend(nextTopic: string) {
    setTopic(nextTopic);
    setMode('Исследовать');
    setTrendOpen(false);
    window.setTimeout(() => document.getElementById('topic')?.focus(), 0);
  }

  function openLiveResearch() {
    setMode('Исследовать');
    window.setTimeout(() => document.getElementById('topic')?.focus(), 0);
  }

  function launchContent(format: ContentFormat, claimVersionId: string) {
    setMode('Создать');
    onFormatChange(format);
    setContentClaimVersionIds([claimVersionId]);
    setContentAutoRunKey((value) => value + 1);
    window.setTimeout(() => document.querySelector('.content-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function changeContentFormat(format: ContentFormat | null) {
    if (format) setMode('Создать');
    onFormatChange(format);
  }

  return (
    <>
      <ResearchConsole topic={topic} mode={mode} status={status} trendOpen={trendOpen} trendSource={trendSource} onTopicChange={setTopic} onModeChange={setMode} onStart={startWork} onTrendToggle={() => setTrendOpen((value) => !value)} onTrendSourceChange={setTrendSource} onTrendChoose={chooseTrend} />
      <LlmConnectionPanel status={llm.result} loading={llm.loading} onProbe={llm.probe} />
      <OperationsHealthPanel health={operations.result} loading={operations.loading} />
      {mode === 'Проверить' ? <><EvidenceFlowDemo onLiveRun={openLiveResearch} /><ReviewerDemo /></> : <>
        <ResearchResult topic={topic} working={status === 'working'} result={result} error={error} showAllClaims={showAllClaims} onToggleClaims={() => setShowAllClaims((value) => !value)} />
        {result && <LiveEvidenceWorkbench key={result.runId} result={result} question={topic} onContentFormat={launchContent} />}
        <SourceReviewQueue refreshKey={result?.runId ?? ''} />
        <ContentComposer activeFormat={activeFormat} onFormatChange={changeContentFormat} autoRunKey={contentAutoRunKey} autoRunClaimVersionIds={contentClaimVersionIds} onOpenContent={onOpenContent} />
      </>}
    </>
  );
}
