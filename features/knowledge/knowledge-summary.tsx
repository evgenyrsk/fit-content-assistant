import type { KnowledgeClaimRecord } from '@/lib/domain';

export function KnowledgeSummary({ claims, generatedAt }: { claims: KnowledgeClaimRecord[]; generatedAt: string }) {
  const approved = claims.filter((claim) => claim.status === 'approved');
  const high = approved.filter((claim) => claim.confidence === 'high').length;
  const moderate = approved.filter((claim) => claim.confidence === 'moderate').length;
  const needsReview = claims.filter((claim) => claim.status === 'needs_review').length;
  const overdue = claims.filter((claim) => Date.parse(claim.reviewDueAt) < Date.parse(generatedAt)).length;
  return (
    <>
      <div className="view-hero">
        <div><p className="overline">KNOWLEDGE BASE</p><h1>Не архив PDF.<br /><em>Карта того, что мы знаем.</em></h1><p>Здесь отображаются только реальные версии claims из канонической базы — без демонстрационных утверждений.</p></div>
        <div className="view-metric"><strong>{approved.length}</strong><span>подтверждённых claims</span><small>{overdue} требуют перепроверки</small></div>
      </div>
      <div className="stats-row">
        <article><span>Высокая уверенность</span><strong>{high}</strong><i className="high-bar" /></article>
        <article><span>Умеренная уверенность</span><strong>{moderate}</strong><i className="medium-bar" /></article>
        <article><span>Нужна проверка</span><strong>{needsReview}</strong><i className="low-bar" /></article>
      </div>
    </>
  );
}
