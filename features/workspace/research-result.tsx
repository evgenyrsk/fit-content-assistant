import type { ResearchSearchResult } from '@/lib/domain';
import { LoaderCircle } from 'lucide-react';
import { DemoEvidenceResult } from './demo-evidence-result';
import { ScientificSourceResults } from './scientific-source-results';

interface ResearchResultProps {
  topic: string;
  working: boolean;
  result: ResearchSearchResult | null;
  error: string | null;
  showAllClaims: boolean;
  onToggleClaims: () => void;
}

function researchStatus(working: boolean, result: ResearchSearchResult | null): string {
  if (working) return 'Ищу источники';
  return result ? 'Кандидаты найдены' : 'Демо-концепция';
}

function ResearchLoading() {
  return <div className="research-loading" role="status"><LoaderCircle aria-hidden="true" />
    <div><strong>Собираю доказательства</strong><p>Планирую запрос, ищу публикации и проверяю доступность полных текстов.</p></div>
  </div>;
}

function ResearchBody(props: Pick<ResearchResultProps, 'working' | 'result' | 'error' | 'showAllClaims' | 'onToggleClaims'>) {
  return (
    <>
      {props.error && <p className="research-error">{props.error}</p>}
      {props.working
        ? <ResearchLoading />
        : props.result
        ? <ScientificSourceResults result={props.result} />
        : <DemoEvidenceResult showAllClaims={props.showAllClaims} onToggleClaims={props.onToggleClaims} />}
    </>
  );
}

export function ResearchResult({ topic, working, result, error, showAllClaims, onToggleClaims }: ResearchResultProps) {
  return (
    <>
      <section className="flow-strip" aria-label="Исследовательский процесс">
        <div className={working || result ? 'complete' : ''}><span>01</span><p><strong>Найти</strong><small>релевантные работы</small></p></div><i />
        <div className={result ? 'current' : working ? 'current' : ''}><span>02</span><p><strong>Оценить</strong><small>качество данных</small></p></div><i />
        <div><span>03</span><p><strong>Утверждать</strong><small>только допустимое</small></p></div><i />
        <div><span>04</span><p><strong>Объяснить</strong><small>простым языком</small></p></div>
      </section>
      <section className="result-section">
        <div className="section-title">
          <div><p className="overline">ТЕКУЩИЙ РАЗБОР</p><h2>{topic || 'Новая тема'}</h2></div>
          <span className="result-status"><i />{researchStatus(working, result)}</span>
        </div>
        <ResearchBody working={working} result={result} error={error} showAllClaims={showAllClaims} onToggleClaims={onToggleClaims} />
      </section>
    </>
  );
}
