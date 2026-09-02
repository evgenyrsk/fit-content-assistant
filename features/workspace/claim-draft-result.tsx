import { ArrowRight, FileCheck2, LockKeyhole } from 'lucide-react';
import type { ClaimSynthesisResponse } from '@/lib/domain';

const confidenceLabels = {
  high: 'высокая', moderate: 'умеренная', low: 'низкая', insufficient: 'недостаточно данных',
} as const;

export function ClaimDraftResult({ response }: { response: ClaimSynthesisResponse }) {
  if (!response.claim) return <div className="live-body-locked"><LockKeyhole aria-hidden="true" /><div><strong>Claim draft не создан</strong><p>{response.warning}</p></div></div>;
  const claim = response.claim;
  return <section className="claim-draft-result"><header><div><span><FileCheck2 aria-hidden="true" />CLAIM DRAFT</span><h3>{claim.statement}</h3></div><em>нужна проверка</em></header>
    <div className="claim-draft-meta"><div><small>Уверенность</small><strong>{confidenceLabels[claim.confidence]}</strong></div><div><small>Область вывода</small><strong>{claim.scope.population} · {claim.scope.outcome}</strong></div><div><small>Evidence links</small><strong>{claim.evidence.length}</strong></div></div>
    <div className="claim-draft-limitations"><strong>Обязательные ограничения</strong>{claim.limitations.map((item) => <p key={item}><ArrowRight aria-hidden="true" />{item}</p>)}</div>
    <footer><LockKeyhole aria-hidden="true" /><p>{response.warning}</p></footer>
  </section>;
}
