import type { ExternalConnectionStatus } from '../../domain/index.ts';
import type { ConnectionFailureReason, ConnectionProbe } from '../ports/connection-probe.ts';

interface InspectConnectionRequest {
  source: ExternalConnectionStatus['source'];
  configured: boolean;
  operatingMode: ExternalConnectionStatus['operatingMode'];
  expiresAt?: string;
}

interface InspectConnectionDependencies {
  probe?: ConnectionProbe;
  now?: () => Date;
}

const refreshWindowMs = 7 * 24 * 60 * 60 * 1_000;
const sourceName = (source: InspectConnectionRequest['source']) => source === 'instagram' ? 'Instagram' : 'Threads';

function credentialFreshness(expiresAt: string | undefined, now: Date): ExternalConnectionStatus['credentialFreshness'] {
  if (!expiresAt) return 'unknown';
  const expiration = new Date(expiresAt);
  if (Number.isNaN(expiration.valueOf())) return 'unknown';
  const remaining = expiration.valueOf() - now.valueOf();
  if (remaining <= 0) return 'expired';
  return remaining <= refreshWindowMs ? 'refresh_soon' : 'healthy';
}

function failedStatus(
  request: InspectConnectionRequest,
  reason: ConnectionFailureReason,
  now: Date,
): ExternalConnectionStatus {
  const authorizationFailure = reason === 'credentials' || reason === 'permissions';
  const detail = reason === 'credentials'
    ? 'Meta отклонила текущий доступ. Возможно, срок закончился или доступ был отозван.'
    : reason === 'permissions'
      ? `Подключённому аккаунту не хватает разрешения на чтение ${sourceName(request.source)}.`
      : 'Meta временно не ответила на проверку. Секрет не раскрыт и настройки не изменены.';
  return {
    source: request.source,
    state: authorizationFailure ? 'attention_required' : 'temporarily_unavailable',
    operatingMode: request.operatingMode,
    credentialFreshness: credentialFreshness(request.expiresAt, now),
    expiresAt: request.expiresAt,
    checkedAt: now.toISOString(),
    summary: authorizationFailure ? 'Нужно восстановить доступ' : 'Проверка временно недоступна',
    detail,
    recommendedAction: authorizationFailure
      ? 'Выдать новый доступ владельца и заменить серверный секрет.'
      : 'Повторить проверку позже. Публичный App Review для этого не требуется.',
  };
}

function connectedStatus(
  request: InspectConnectionRequest,
  accountLabel: string | undefined,
  now: Date,
): ExternalConnectionStatus {
  const freshness = credentialFreshness(request.expiresAt, now);
  const expiryMetadataStale = freshness === 'expired';
  const recommendedAction = freshness === 'refresh_soon'
    ? 'Обновить доступ до указанной даты, чтобы поиск не прерывался.'
    : expiryMetadataStale
      ? 'Проверка прошла, но сохранённая дата устарела — обновите дату окончания доступа.'
      : freshness === 'unknown'
        ? 'При следующем обновлении доступа запишите дату окончания для раннего предупреждения.'
        : undefined;
  return {
    source: request.source,
    state: 'connected',
    operatingMode: request.operatingMode,
    credentialFreshness: expiryMetadataStale ? 'unknown' : freshness,
    accountLabel,
    expiresAt: request.expiresAt,
    checkedAt: now.toISOString(),
    summary: `${sourceName(request.source)} подключён`,
    detail: request.operatingMode === 'personal'
      ? 'Личный режим работает для аккаунта с ролью в Meta-приложении. Публичная проверка не нужна.'
      : 'Публичный режим Meta доступен.',
    recommendedAction,
  };
}

export async function inspectExternalConnection(
  request: InspectConnectionRequest,
  dependencies: InspectConnectionDependencies,
): Promise<ExternalConnectionStatus> {
  const now = (dependencies.now ?? (() => new Date()))();
  if (!request.configured || !dependencies.probe) {
    return {
      source: request.source,
      state: 'not_configured',
      operatingMode: request.operatingMode,
      credentialFreshness: 'unknown',
      checkedAt: now.toISOString(),
      summary: `${sourceName(request.source)} не подключён`,
      detail: 'Серверный доступ ещё не настроен.',
      recommendedAction: 'Добавить доступ владельца как серверный секрет.',
    };
  }
  const probe = await dependencies.probe.inspect();
  return probe.status === 'reachable'
    ? connectedStatus(request, probe.accountLabel, now)
    : failedStatus(request, probe.reason, now);
}
