'use client';

import { useState } from 'react';
import { EvidenceMethodologyCard } from './evidence-methodology-card';
import { KnowledgeClusters } from './knowledge-clusters';
import { KnowledgeLibrary } from './knowledge-library';
import { KnowledgeOperationsPanel } from './knowledge-operations-panel';
import { KnowledgeSummary } from './knowledge-summary';
import { ManualClaimComposer } from './manual-claim-composer';
import { ManualClaimReviewPanel } from './manual-claim-review-panel';
import { useKnowledgeClaims } from './use-knowledge-claims';
import { useKnowledgeFilters } from './use-knowledge-filters';
import { useManualClaimReview } from './use-manual-claim-review';

export function KnowledgeView() {
  const knowledge = useKnowledgeClaims();
  const filters = useKnowledgeFilters(knowledge.claims, knowledge.generatedAt);
  const review = useManualClaimReview(knowledge.reload);
  const [composerOpen, setComposerOpen] = useState(false);

  function openComposer(): void {
    setComposerOpen(true);
    window.setTimeout(() => document.querySelector('.manual-claim-workbench')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
  return (
    <section className="product-view">
      <KnowledgeSummary claims={knowledge.claims} generatedAt={knowledge.generatedAt}
        onCreate={openComposer} />
      <ManualClaimComposer onSaved={knowledge.reload} open={composerOpen} onOpenChange={setComposerOpen} />
      <EvidenceMethodologyCard />
      <KnowledgeOperationsPanel />
      <KnowledgeClusters claims={knowledge.claims} topics={filters.topics} active={filters.topic} onChange={filters.setTopic} />
      <KnowledgeLibrary claims={knowledge.claims} filters={filters} loading={knowledge.loading}
        error={knowledge.error} onReview={review.open} />
      <ManualClaimReviewPanel context={review.context} loading={review.loading} saving={review.saving}
        error={review.error} onClose={review.close} onSubmit={review.submit} />
    </section>
  );
}
