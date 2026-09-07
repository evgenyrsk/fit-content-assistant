import { ClipboardCheck, Database, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import type { KnowledgeClaimRecord } from '@/lib/domain';
import type { useKnowledgeFilters } from './use-knowledge-filters';
import { confidenceLabels, confidenceMarker, confidenceTone, evidenceLabel, statusLabels } from './knowledge-presentation';

interface KnowledgeLibraryProps {
  claims: KnowledgeClaimRecord[];
  filters: ReturnType<typeof useKnowledgeFilters>;
  loading: boolean;
  error: string | null;
  onReview: (claim: KnowledgeClaimRecord) => void;
}

function EmptyLibrary({ pristine, loading, error }: { pristine: boolean; loading: boolean; error: string | null }) {
  if (loading) return <div className="empty-knowledge"><span><Database aria-hidden="true" /></span><h3>Загружаю каноническую базу</h3><p>Claims и их evidence читаются из постоянного хранилища.</p></div>;
  if (error) return <div className="empty-knowledge"><span><Database aria-hidden="true" /></span><h3>База временно недоступна</h3><p>{error}</p></div>;
  return pristine
    ? <div className="empty-knowledge"><span><ShieldCheck aria-hidden="true" /></span><h3>Подтверждённых claims пока нет</h3><p>Это честное состояние: найденные статьи и аннотации не превращаются в выводы до evidence gate и ручного подтверждения.</p></div>
    : <div className="empty-knowledge"><span><Search aria-hidden="true" /></span><h3>По этим фильтрам ничего нет</h3><p>Измените запрос или сбросьте часть фильтров.</p></div>;
}

export function KnowledgeLibrary({ claims, filters, loading, error, onReview }: KnowledgeLibraryProps) {
  return (
    <div className="library-panel">
      <div className="library-toolbar">
        <div><p className="overline">CLAIM LIBRARY</p><h2>Канонические утверждения <span>{filters.filtered.length}</span></h2></div>
        <label><Search aria-hidden="true" /><input aria-label="Поиск по каноническим утверждениям" value={filters.query} onChange={(event) => filters.setQuery(event.target.value)} placeholder="Найти claim, тему или ограничение" /></label>
      </div>
      <div className="filter-row knowledge-filter-row">
        <div className="filter-group"><span>Уверенность</span><select aria-label="Фильтр по уверенности" value={filters.confidence} onChange={(event) => filters.setConfidence(event.target.value)}><option value="all">Все уровни</option><option value="high">Высокая</option><option value="moderate">Умеренная</option><option value="low">Низкая</option><option value="insufficient">Недостаточно</option></select></div>
        <div className="filter-group"><span>Статус</span><select aria-label="Фильтр по статусу" value={filters.status} onChange={(event) => filters.setStatus(event.target.value)}><option value="all">Все статусы</option><option value="approved">Подтверждено</option><option value="needs_review">Нужна проверка</option><option value="rejected">Отклонено</option><option value="superseded">Заменено</option></select></div>
        <div className="filter-group"><span>Свежесть</span><select aria-label="Фильтр по свежести" value={filters.freshness} onChange={(event) => filters.setFreshness(event.target.value)}><option value="all">Любая</option><option value="current">Актуальные</option><option value="due">Перепроверить</option></select></div>
        <div className="filter-group"><span>Источник</span><select aria-label="Фильтр по типу источника" value={filters.sourceType} onChange={(event) => filters.setSourceType(event.target.value)}><option value="all">Все типы</option>{filters.sourceTypes.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="filter-group"><span>Популяция</span><select aria-label="Фильтр по популяции" value={filters.population} onChange={(event) => filters.setPopulation(event.target.value)}><option value="all">Все популяции</option>{filters.populations.map((value) => <option key={value}>{value}</option>)}</select></div>
        <button onClick={filters.reset}><RotateCcw aria-hidden="true" /> Сбросить</button>
      </div>
      <div className="knowledge-list">
        {filters.filtered.map((claim) => {
          const tone = confidenceTone(claim.confidence);
          return (
            <article key={claim.id}>
              <span className={`claim-marker ${tone}`}>{confidenceMarker(claim.confidence)}</span>
              <div className="knowledge-main">
                <div><span>{claim.topic}</span><em>{statusLabels[claim.status]}</em></div>
                <h3>{claim.statement}</h3>
                <p>{evidenceLabel(claim)}{claim.limitations[0] ? ` · Ограничение: ${claim.limitations[0]}` : ''}</p>
              </div>
              <span className={`knowledge-confidence ${tone}`}>{confidenceLabels[claim.confidence]}</span>
              {claim.status === 'needs_review' && <button type="button" onClick={() => onReview(claim)}
                aria-label={`Проверить claim: ${claim.statement}`}><ClipboardCheck aria-hidden="true" /></button>}
            </article>
          );
        })}
        {filters.filtered.length === 0 && <EmptyLibrary pristine={claims.length === 0} loading={loading} error={error} />}
      </div>
    </div>
  );
}
