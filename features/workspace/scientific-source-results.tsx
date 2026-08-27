import { ArrowUpRight, CircleAlert, Database } from 'lucide-react';
import type { ResearchSearchResult } from '@/lib/domain';

interface ScientificSourceResultsProps {
  result: ResearchSearchResult;
}

function sourceMeta(provider: string, publishedAt?: string): string {
  return [provider === 'pubmed' ? 'PubMed' : 'Crossref', publishedAt].filter(Boolean).join(' · ');
}

export function ScientificSourceResults({ result }: ScientificSourceResultsProps) {
  return (
    <section className="live-research-card">
      <header>
        <div><p className="overline">LIVE SOURCE DISCOVERY</p><h3>{result.candidates.length} кандидатов для оценки</h3></div>
        <span className="review-pill"><CircleAlert aria-hidden="true" /> Нужна оценка</span>
      </header>
      <div className="source-candidate-list">
        {result.candidates.map((source, index) => (
          <article key={source.id}>
            <span className="source-rank">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <small>{sourceMeta(source.provider, source.publishedAt)}</small>
              <h4>{source.title}</h4>
              <p>{[source.journal, source.authors.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</p>
            </div>
            <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Открыть источник: ${source.title}`}><ArrowUpRight aria-hidden="true" /></a>
          </article>
        ))}
      </div>
      <footer><Database aria-hidden="true" /><p><strong>Сохранено в исследовательскую историю.</strong> Найденная публикация ещё не является доказанным claim: дальше идут проверка дизайна, риска смещения и совокупности данных.</p></footer>
    </section>
  );
}
