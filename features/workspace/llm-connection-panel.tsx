import { BrainCircuit, CircleAlert, KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { LlmConnectionStatus } from '@/lib/domain';

interface LlmConnectionPanelProps {
  status: LlmConnectionStatus | null;
  loading: boolean;
  onProbe: () => void;
}

function StatusIcon({ status, loading }: Pick<LlmConnectionPanelProps, 'status' | 'loading'>) {
  if (loading) return <LoaderCircle className="spin" aria-hidden="true" />;
  if (status?.state === 'connected') return <ShieldCheck aria-hidden="true" />;
  if (status?.state === 'not_configured') return <KeyRound aria-hidden="true" />;
  if (status?.state === 'attention_required') return <CircleAlert aria-hidden="true" />;
  return <BrainCircuit aria-hidden="true" />;
}

function ModelRoutes({ status }: { status: LlmConnectionStatus | null }) {
  if (!status) return null;
  const routes = [
    status.researchModel ? `Research · ${status.researchModel}` : 'Research · ожидает настройки',
    status.contentModel ? `Content · ${status.contentModel}` : 'Content · ожидает настройки',
    status.budgetProfile === 'economy' ? 'Бюджет · экономный' : 'Бюджет · сбалансированный',
    status.privacy === 'zero_retention_required'
      ? 'Privacy · ZDR обязателен'
      : 'Privacy · RouterAI не хранит промпты',
  ];
  return <ul aria-label="Маршруты и режим LLM">
    {routes.map((route) => <li key={route}>{route}</li>)}
  </ul>;
}

function presentation(status: LlmConnectionStatus | null, loading: boolean) {
  if (loading && !status) return {
    title: 'Проверяю конфигурацию LLM', detail: 'Читаю безопасный статус серверных маршрутов.', state: 'checking',
  };
  if (!status) return {
    title: 'Статус LLM недоступен', detail: 'Научный поиск продолжает работать в детерминированном режиме.', state: 'attention_required',
  };
  return { title: status.summary, detail: status.detail, state: loading ? 'checking' : status.state };
}

function ProviderBadge({ status }: { status: LlmConnectionStatus | null }) {
  return status?.provider ? <span>{status.provider}</span> : null;
}

function ProbeButton({ status, loading, onProbe }: LlmConnectionPanelProps) {
  const label = status?.state === 'connected' ? 'Перепроверить' : 'Проверить подключение';
  return <button type="button" onClick={onProbe} disabled={loading}>
    <RefreshCw className={loading ? 'spin' : undefined} aria-hidden="true" />
    <span>{label}</span>
  </button>;
}

export function LlmConnectionPanel({ status, loading, onProbe }: LlmConnectionPanelProps) {
  const view = presentation(status, loading);
  return <aside className="llm-connection" data-state={view.state}>
    <span className="llm-connection-icon"><StatusIcon status={status} loading={loading} /></span>
    <div className="llm-connection-copy">
      <p className="overline">LLM CONTROL PLANE</p>
      <div><strong>{view.title}</strong><ProviderBadge status={status} /></div>
      <p>{view.detail}</p>
      {status?.recommendedAction && <small>{status.recommendedAction}</small>}
      <ModelRoutes status={status} />
    </div>
    <ProbeButton status={status} loading={loading} onProbe={onProbe} />
  </aside>;
}
