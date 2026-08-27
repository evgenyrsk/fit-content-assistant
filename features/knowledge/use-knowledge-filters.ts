import { useMemo, useState } from 'react';
import type { Confidence, KnowledgeClaimRecord } from '@/lib/domain';

function matchesChoice(selected: string, actual: string | undefined): boolean {
  return selected === 'all' || actual === selected;
}

function matchesFreshness(selected: string, reviewDueAt: string, generatedAt: string): boolean {
  if (selected === 'all') return true;
  const due = Date.parse(reviewDueAt) < Date.parse(generatedAt);
  return selected === 'due' ? due : !due;
}

function matchesSource(selected: string, actual: string[]): boolean {
  return selected === 'all' || actual.includes(selected);
}

export function useKnowledgeFilters(claims: KnowledgeClaimRecord[], generatedAt: string) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('Все темы');
  const [confidence, setConfidence] = useState('all');
  const [status, setStatus] = useState('all');
  const [freshness, setFreshness] = useState('all');
  const [sourceType, setSourceType] = useState('all');
  const [population, setPopulation] = useState('all');
  const topics = useMemo(() => [...new Set(claims.map((claim) => claim.topic))].sort(), [claims]);
  const sourceTypes = useMemo(() => [...new Set(claims.flatMap((claim) => claim.sourceTypes))].sort(), [claims]);
  const populations = useMemo(() => [...new Set(claims.flatMap((claim) => claim.scope.population ? [claim.scope.population] : []))].sort(), [claims]);
  const filtered = claims.filter((claim) => {
    const searchable = `${claim.statement} ${claim.topic} ${claim.limitations.join(' ')}`.toLowerCase();
    return [
      searchable.includes(query.trim().toLowerCase()),
      topic === 'Все темы' || claim.topic === topic,
      matchesChoice(confidence, claim.confidence as Confidence),
      matchesChoice(status, claim.status),
      matchesFreshness(freshness, claim.reviewDueAt, generatedAt),
      matchesSource(sourceType, claim.sourceTypes),
      matchesChoice(population, claim.scope.population),
    ].every(Boolean);
  });

  function reset(): void {
    setQuery(''); setTopic('Все темы'); setConfidence('all'); setStatus('all');
    setFreshness('all'); setSourceType('all'); setPopulation('all');
  }

  return {
    query, setQuery, topic, setTopic, confidence, setConfidence, status, setStatus,
    freshness, setFreshness, sourceType, setSourceType, population, setPopulation,
    topics, sourceTypes, populations, filtered, reset,
  };
}
