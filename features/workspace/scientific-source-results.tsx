import { ArrowUpRight, CircleAlert, Database } from 'lucide-react';
import type { ResearchSearchResult } from '@/lib/domain';
import { ResearchPipelineTrace } from './research-pipeline-trace';
import { intakePresentation } from './source-intake-presentation';

interface ScientificSourceResultsProps {
  result: ResearchSearchResult;
}

function sourceMeta(provider: string, publishedAt?: string): string {
  return [provider === 'pubmed' ? 'PubMed' : 'Crossref', publishedAt].filter(Boolean).join(' · ');
}

export function ScientificSourceResults({ result }: ScientificSourceResultsProps) {
  const decisions = new Map(result.documentCoverage?.decisions.map((decision) => [decision.sourceId, decision]));
  return (
    <section className="live-research-card">
      <header>
        <div><p className="overline">LIVE SOURCE DISCOVERY</p><h3>{result.candidates.length} кандидатов для оценки</h3></div>
        <span className="review-pill"><CircleAlert aria-hidden="true" /> Нужна оценка</span>
      </header>
      {result.planning && <ResearchPipelineTrace planning={result.planning} />}
      <div className="source-candidate-list">
        {result.candidates.map((source, index) => {
          const intake = intakePresentation(source.pmid ? decisions.get(`pmid:${source.pmid}`) : undefined);
          return (
            <article key={source.id}>
              <span className="source-rank">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <small>{sourceMeta(source.provider, source.publishedAt)}</small>
                <h4>{source.title}</h4>
                <p>{[source.journal, source.authors.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</p>
                <span className="source-intake-status" data-state={intake.state} title={intake.details}>{intake.label} · {intake.details}</span>
              </div>
              <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Открыть источник: ${source.title}`}><ArrowUpRight aria-hidden="true" /></a>
            </article>
          );
        })}
      </div>
      <footer><Database aria-hidden="true" /><p><strong>{result.documentCoverage?.stored ?? 0} допущено в triage · {result.documentCoverage?.rejected ?? 0} отсечено.</strong> Все кандидаты остаются в истории поиска, но только прошедшие pre-screen аннотации попадают в исследовательский архив. Это не full text и не доказанные claims.</p></footer>
    </section>
  );
}
