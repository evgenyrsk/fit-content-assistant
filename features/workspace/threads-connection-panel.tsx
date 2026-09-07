import { CircleAlert, CloudOff, KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ExternalConnectionStatus } from '@/lib/domain';

interface ThreadsConnectionPanelProps {
  status: ExternalConnectionStatus | null;
  loading: boolean;
  onRefresh: () => void;
  sourceLabel?: string;
}

function statusLabel(status: ExternalConnectionStatus): string {
  if (status.state === 'connected') return 'Подключено';
  if (status.state === 'attention_required') return 'Нужен доступ';
  if (status.state === 'not_configured') return 'Не настроено';
  return 'Временно недоступно';
}

function StatusIcon({ status }: { status: ExternalConnectionStatus | null }) {
  if (!status) return <CloudOff aria-hidden="true" />;
  if (status.state === 'connected') return <ShieldCheck aria-hidden="true" />;
  if (status.state === 'attention_required' || status.state === 'not_configured') {
    return <KeyRound aria-hidden="true" />;
  }
  return <CircleAlert aria-hidden="true" />;
}

function ConnectionIcon({ status, loading }: { status: ExternalConnectionStatus | null; loading: boolean }) {
  return loading
    ? <LoaderCircle className="spin" aria-hidden="true" />
    : <StatusIcon status={status} />;
}

function ConnectionBadge({ status }: { status: ExternalConnectionStatus | null }) {
  if (!status) return null;
  return <span>{statusLabel(status)}</span>;
}

function RecommendedAction({ action }: { action?: string }) {
  if (!action) return null;
  return <small>{action}</small>;
}

function ConnectionDetails({ status, sourceLabel }: { status: ExternalConnectionStatus | null; sourceLabel: string }) {
  if (!status) return null;
  const details = [
    status.operatingMode === 'personal' ? 'Личный режим Meta' : 'Публичный режим Meta',
    status.accountLabel ? `@${status.accountLabel.replace(/^@/, '')}` : undefined,
    `Проверено в ${checkedTime(status.checkedAt)}`,
  ].filter((value): value is string => Boolean(value));
  return <ul aria-label={`Детали подключения ${sourceLabel}`}>
    {details.map((detail) => <li key={detail}>{detail}</li>)}
  </ul>;
}

function checkedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'только что';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function connectionPresentation(status: ExternalConnectionStatus | null, loading: boolean, sourceLabel: string) {
  if (loading && !status) {
    return { state: 'checking', title: `Проверяю ${sourceLabel}`, detail: 'Проверяю доступ владельца через Meta.' };
  }
  if (!status) {
    return {
      state: 'checking',
      title: `Не удалось проверить ${sourceLabel}`,
      detail: 'Диагностика не получила ответ. Поиск трендов продолжает работать независимо.',
    };
  }
  return {
    state: status.state,
    title: status.summary,
    detail: status.detail,
    action: status.recommendedAction,
  };
}

export function ThreadsConnectionPanel({ status, loading, onRefresh, sourceLabel = 'Threads' }: ThreadsConnectionPanelProps) {
  const presentation = connectionPresentation(status, loading, sourceLabel);
  return (
    <aside className="threads-connection" data-state={presentation.state}>
      <span className="threads-connection-icon">
        <ConnectionIcon status={status} loading={loading} />
      </span>
      <div className="threads-connection-copy">
        <div>
          <strong>{presentation.title}</strong>
          <ConnectionBadge status={status} />
        </div>
        <p>{presentation.detail}</p>
        <RecommendedAction action={presentation.action} />
        <ConnectionDetails status={status} sourceLabel={sourceLabel} />
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} aria-label={`Повторно проверить ${sourceLabel}`}>
        <RefreshCw className={loading ? 'spin' : undefined} aria-hidden="true" />
        <span>Проверить</span>
      </button>
    </aside>
  );
}
