'use client';

import { useState } from 'react';
import { Activity, Apple, ArrowUpRight, BedDouble, BookOpenText, CircleGauge, Dumbbell, RotateCcw, Search, type LucideIcon } from 'lucide-react';
import { claims } from '@/features/shared';

const clusters: Array<{ name: string; count: number; icon: LucideIcon }> = [
  { name: 'Все темы', count: 24, icon: BookOpenText },
  { name: 'Гипертрофия', count: 7, icon: Dumbbell },
  { name: 'Питание', count: 6, icon: Apple },
  { name: 'Восстановление', count: 5, icon: BedDouble },
  { name: 'Интенсивность', count: 4, icon: Activity },
  { name: 'Авторегуляция', count: 2, icon: CircleGauge },
];

export function KnowledgeView() {
  const [query, setQuery] = useState('');
  const [activeCluster, setActiveCluster] = useState('Все темы');
  const [confidence, setConfidence] = useState('Все уровни');
  const [status, setStatus] = useState('Все статусы');
  const filteredClaims = claims.filter((claim) => {
    const matchesQuery = `${claim.text}${claim.topic}${claim.confidence}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (activeCluster === 'Все темы' || claim.topic === activeCluster) && (confidence === 'Все уровни' || claim.confidence === confidence) && (status === 'Все статусы' || claim.status === status);
  });

  function resetFilters() {
    setQuery('');
    setActiveCluster('Все темы');
    setConfidence('Все уровни');
    setStatus('Все статусы');
  }

  return (
    <section className="product-view">
      <div className="view-hero">
        <div><p className="overline">KNOWLEDGE BASE</p><h1>Не архив PDF.<br /><em>Карта того, что мы знаем.</em></h1><p>Каждый тезис хранится вместе с уверенностью, контекстом, ограничениями и источниками.</p></div>
        <div className="view-metric"><strong>24</strong><span>проверенных claims</span><small>6 требуют обновления</small></div>
      </div>
      <div className="stats-row">
        <article><span>Высокая уверенность</span><strong>11</strong><i className="high-bar" /></article>
        <article><span>Умеренная уверенность</span><strong>8</strong><i className="medium-bar" /></article>
        <article><span>Спорные / временные</span><strong>5</strong><i className="low-bar" /></article>
      </div>
      <section className="cluster-panel">
        <div className="cluster-heading"><div><p className="overline">TOPIC MAP</p><h2>Тематические кластеры</h2></div><span>Автоматическая группировка + ручные теги</span></div>
        <div className="cluster-grid">
          {clusters.map(({ name, count, icon: Icon }) => (
            <button className={activeCluster === name ? 'active' : ''} key={name} onClick={() => setActiveCluster(name)}>
              <i><Icon aria-hidden="true" /></i><span><strong>{name}</strong><small>{count} claims</small></span><ArrowUpRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <div className="library-panel">
        <div className="library-toolbar">
          <div><p className="overline">CLAIM LIBRARY</p><h2>Проверенные утверждения <span>{filteredClaims.length}</span></h2></div>
          <label><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти claim или тему" /></label>
        </div>
        <div className="filter-row">
          <div className="filter-group"><span>Уверенность</span><select value={confidence} onChange={(event) => setConfidence(event.target.value)}><option>Все уровни</option><option>Высокая</option><option>Умеренная</option><option>Недостаточно данных</option></select></div>
          <div className="filter-group"><span>Статус</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Все статусы</option><option>verified</option><option>provisional</option><option>disputed</option></select></div>
          <div className="filter-group"><span>Обновление</span><select defaultValue="Сначала свежие"><option>Сначала свежие</option><option>Требуют проверки</option><option>Сначала старые</option></select></div>
          <button onClick={resetFilters}><RotateCcw aria-hidden="true" /> Сбросить</button>
        </div>
        <div className="knowledge-list">
          {filteredClaims.map((claim) => (
            <article key={claim.text}>
              <span className={`claim-marker ${claim.tone}`}>{claim.marker}</span>
              <div className="knowledge-main"><div><span>{claim.topic}</span><em>{claim.status}</em></div><h3>{claim.text}</h3><p>{claim.evidence}</p></div>
              <span className={`knowledge-confidence ${claim.tone}`}>{claim.confidence}</span>
              <button aria-label="Открыть claim"><ArrowUpRight aria-hidden="true" /></button>
            </article>
          ))}
          {filteredClaims.length === 0 && <div className="empty-knowledge"><span><Search aria-hidden="true" /></span><h3>Ничего не найдено</h3><p>Измените запрос или сбросьте часть фильтров.</p></div>}
        </div>
      </div>
    </section>
  );
}
