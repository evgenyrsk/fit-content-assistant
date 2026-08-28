import { BellRing, BookOpenCheck, DatabaseZap, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import type { KnowledgeMaintenanceResult, KnowledgeSearchResult } from '@/lib/domain';
import { useKnowledgeOperations } from './use-knowledge-operations';

const alertLabels = {
  claim_due: 'Claim просрочен', source_due: 'Источник ждёт проверки', record_changed: 'Статус изменился',
};

function SearchResults({ result }: { result: KnowledgeSearchResult | null }) {
  if (!result) return <p className="operations-empty">Полнотекстовый лексический поиск охватывает latest claims и сохранённые source chunks.</p>;
  return <div className="knowledge-search-results"><section><h3><BookOpenCheck aria-hidden="true" />Канонические claims <span>{result.claims.length}</span></h3>
    {result.claims.map((hit) => <article key={hit.id}><div><b>{hit.status === 'approved' ? 'Проверенный тезис' : 'Не утверждён'}</b><em>{hit.confidence}</em></div><p>{hit.excerpt}</p></article>)}
    {result.claims.length === 0 && <p className="operations-empty">Совпадений среди claims нет.</p>}</section>
    <section><h3><DatabaseZap aria-hidden="true" />Evidence passages <span>{result.evidence.length}</span></h3>
      {result.evidence.map((hit) => <article key={hit.id}><div><b>{hit.admissible ? 'Допущен в evidence' : 'Исследовательский контекст'}</b><em>{hit.locator}</em></div>
        <strong>{hit.title}</strong><p>{hit.excerpt}</p></article>)}
      {result.evidence.length === 0 && <p className="operations-empty">Совпадений среди passages нет.</p>}</section></div>;
}

function SearchPanel({ result, onSearch }: { result: KnowledgeSearchResult | null; onSearch: (query: string) => Promise<void> }) {
  const [query, setQuery] = useState('');
  return <div className="knowledge-search-panel"><form onSubmit={(event) => { event.preventDefault(); void onSearch(query); }}>
    <Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)}
      placeholder="Искать тезис, эффект, популяцию…" aria-label="Поиск по базе знаний" /><button type="submit">Найти</button></form>
    <SearchResults result={result} /></div>;
}

function MaintenanceMetric({ value, label }: { value?: number; label: string }) {
  return <article><strong>{value === undefined ? '—' : value}</strong><span>{label}</span></article>;
}

function MaintenanceAlerts({ result, loading, error }: {
  result: KnowledgeMaintenanceResult | null; loading: boolean; error: string | null;
}) {
  const alerts = result ? result.alerts.slice(0, 6) : [];
  return <><div className="maintenance-alerts">{alerts.map((alert) => <article key={`${alert.kind}:${alert.id}`}>
    <b>{alertLabels[alert.kind]}</b><strong>{alert.title}</strong><p>{alert.detail}</p></article>)}</div>
    {!loading && alerts.length === 0 && <p className="operations-empty">Срочных сигналов нет.</p>}
    {error && <p className="operations-error">{error}</p>}</>;
}

function MaintenancePanel({ result, loading, error }: {
  result: KnowledgeMaintenanceResult | null; loading: boolean; error: string | null;
}) {
  return <aside className="maintenance-panel"><div><BellRing aria-hidden="true" /><span>Центр обслуживания</span></div>
    <div className="maintenance-metrics"><MaintenanceMetric value={result?.dueClaimCount} label="claims к review" />
      <MaintenanceMetric value={result?.dueSourceCount} label="источников к check" />
      <MaintenanceMetric value={result?.changedRecordCount} label="изменений за 30 дней" /></div>
    <MaintenanceAlerts result={result} loading={loading} error={error} />
    <small>При открытии раздела просроченные PubMed-записи перепроверяются один раз за сессию.</small></aside>;
}

export function KnowledgeOperationsPanel() {
  const operations = useKnowledgeOperations();
  return <section className="knowledge-operations"><header><div><p className="overline">KNOWLEDGE OPERATIONS</p><h2>Поиск и актуальность</h2>
    <span>Claims и исходные passages показаны раздельно: найденный текст не становится доказанным выводом.</span></div>
    <button type="button" onClick={() => operations.revalidate()} disabled={operations.running}>
      <RefreshCw aria-hidden="true" />{operations.running ? 'Проверяю…' : 'Перепроверить PubMed'}</button></header>
    <div className="knowledge-operations-grid"><SearchPanel result={operations.search} onSearch={operations.runSearch} />
      <MaintenancePanel result={operations.maintenance} loading={operations.loading} error={operations.error} /></div>
  </section>;
}
