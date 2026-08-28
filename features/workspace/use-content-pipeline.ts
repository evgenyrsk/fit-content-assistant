import { useState } from 'react';
import type { ContentFormat as DomainContentFormat, ContentPipelineResponse } from '@/lib/domain';
import type { ContentFormat } from '@/features/shared';

const formatIds: Record<ContentFormat, DomainContentFormat> = {
  Reels: 'reels', Telegram: 'telegram', Threads: 'threads', Карусель: 'carousel',
};

interface PipelineState {
  format: ContentFormat | null;
  result: ContentPipelineResponse | null;
  error: string | null;
  running: boolean;
}

function isErrorPayload(value: ContentPipelineResponse | { error?: string }): value is { error?: string } {
  return 'error' in value;
}

export function useContentPipeline() {
  const [state, setState] = useState<PipelineState>({ format: null, result: null, error: null, running: false });

  async function generate(format: ContentFormat): Promise<void> {
    setState({ format, result: null, error: null, running: true });
    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: formatIds[format] }),
      });
      const payload = await response.json() as ContentPipelineResponse | { error?: string };
      if (!response.ok || isErrorPayload(payload)) throw new Error(
        isErrorPayload(payload) && payload.error ? payload.error : 'Контентный конвейер недоступен.',
      );
      setState({ format, result: payload, error: null, running: false });
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : 'Контентный конвейер недоступен.';
      setState({ format, result: null, error, running: false });
    }
  }

  function stateFor(format: ContentFormat | null) {
    const current = state.format === format;
    return {
      result: current ? state.result : null,
      error: current ? state.error : null,
      running: current && state.running,
    };
  }

  return { generate, stateFor };
}
