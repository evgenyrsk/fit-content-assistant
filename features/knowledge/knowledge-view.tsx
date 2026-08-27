'use client';

import { EvidenceMethodologyCard } from './evidence-methodology-card';
import { KnowledgeClusters } from './knowledge-clusters';
import { KnowledgeLibrary } from './knowledge-library';
import { KnowledgeSummary } from './knowledge-summary';
import { useKnowledgeClaims } from './use-knowledge-claims';
import { useKnowledgeFilters } from './use-knowledge-filters';

export function KnowledgeView() {
  const knowledge = useKnowledgeClaims();
  const filters = useKnowledgeFilters(knowledge.claims, knowledge.generatedAt);
  return (
    <section className="product-view">
      <KnowledgeSummary claims={knowledge.claims} generatedAt={knowledge.generatedAt} />
      <EvidenceMethodologyCard />
      <KnowledgeClusters claims={knowledge.claims} topics={filters.topics} active={filters.topic} onChange={filters.setTopic} />
      <KnowledgeLibrary claims={knowledge.claims} filters={filters} loading={knowledge.loading} error={knowledge.error} />
    </section>
  );
}
