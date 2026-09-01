import type { LlmConnectionStatus } from '../../domain/llm-connection.ts';
import type { LlmRuntime } from '../../infrastructure/llm/create-llm-runtime.ts';

interface LlmConnectionInput {
  provider?: unknown;
  researchRuntime: LlmRuntime | null;
  contentRuntime: LlmRuntime | null;
  liveProbe: boolean;
  now?: () => Date;
}

const probeSchema = {
  type: 'object', additionalProperties: false, required: ['status'],
  properties: { status: { type: 'string', enum: ['ok'] } },
} as const;

function checkedAt(input: LlmConnectionInput): string {
  return (input.now ?? (() => new Date()))().toISOString();
}

function configuredBase(input: LlmConnectionInput, research: LlmRuntime, content: LlmRuntime) {
  return {
    provider: research.provider.id,
    researchModel: research.model,
    contentModel: content.model,
    budgetProfile: research.budgetProfile,
    privacy: 'zero_retention_required' as const,
    checkedAt: checkedAt(input),
  };
}

function selectedProvider(value: unknown): 'openai' | 'openrouter' | undefined {
  return value === 'openai' || value === 'openrouter' ? value : undefined;
}

function notConfigured(input: LlmConnectionInput): LlmConnectionStatus {
  const provider = selectedProvider(input.provider);
  return {
    provider, budgetProfile: 'economy', privacy: 'zero_retention_required', checkedAt: checkedAt(input),
    state: 'not_configured', liveProbe: false,
    summary: provider ? 'LLM ждёт полную серверную конфигурацию' : 'LLM-провайдер не выбран',
    detail: 'Научный поиск продолжает работать без модели. Ключ не передаётся в браузер и не сохраняется в базе.',
    recommendedAction: provider ? 'Добавьте ключ и обе модели в секреты хостинга.' : 'Выберите OpenRouter или OpenAI.',
  };
}

async function probe(runtime: LlmRuntime, role: 'research' | 'content'): Promise<void> {
  const result = await runtime.provider.generateStructured<{ status: 'ok' }>({
    model: runtime.model,
    system: 'Return only the requested diagnostic JSON. Do not add facts or commentary.',
    input: `Connectivity probe for the ${role} route.`,
    schemaName: `forme_${role}_connection_probe`, outputSchema: probeSchema,
    maxOutputTokens: 24,
    metadata: { runId: crypto.randomUUID(), stage: 'connection_probe', promptVersion: 'llm-connection-probe@1.0.0' },
  });
  if (result.output.status !== 'ok') throw new Error('Unexpected probe output.');
}

export async function inspectLlmConnection(input: LlmConnectionInput): Promise<LlmConnectionStatus> {
  if (!input.researchRuntime || !input.contentRuntime) return notConfigured(input);
  const configuration = configuredBase(input, input.researchRuntime, input.contentRuntime);
  if (!input.liveProbe) {
    return {
      ...configuration, state: 'attention_required', liveProbe: false,
      summary: 'LLM настроена и готова к проверке',
      detail: 'Research и content маршруты заданы. Запустите короткую проверку, чтобы подтвердить ключ и строгие JSON-ответы.',
      recommendedAction: 'Нажмите «Проверить подключение».',
    };
  }
  try {
    await Promise.all([probe(input.researchRuntime, 'research'), probe(input.contentRuntime, 'content')]);
    return {
      ...configuration, state: 'connected', liveProbe: true,
      summary: 'LLM подключена',
      detail: 'Оба маршрута ответили по строгой схеме. Научные выводы всё равно проходят evidence-gates и ручное подтверждение.',
    };
  } catch {
    return {
      ...configuration, state: 'attention_required', liveProbe: true,
      summary: 'LLM требует внимания',
      detail: 'Ключ, баланс, доступность модели или поддержка строгого JSON не прошли проверку.',
      recommendedAction: 'Проверьте ключ, баланс и выбранные модели, затем повторите.',
    };
  }
}
