import { Activity, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { OperationsHealth } from '@/lib/domain';
import { operationsHealthPresentation } from './operations-health-presentation';

interface OperationsHealthPanelProps {
  health: OperationsHealth | null;
  loading: boolean;
}

export function OperationsHealthPanel({ health, loading }: OperationsHealthPanelProps) {
  const view = operationsHealthPresentation(health, loading);
  const Icon = view.state === 'checking' ? LoaderCircle : view.state === 'healthy' ? ShieldCheck : CircleAlert;
  return <aside className="llm-connection operations-health" data-state={view.state}>
    <span className="llm-connection-icon">
      {view.state === 'checking' ? <Icon className="spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
    </span>
    <div className="llm-connection-copy">
      <p className="overline"><Activity aria-hidden="true" /> PRODUCTION HEALTH</p>
      <div><strong>{view.title}</strong></div>
      <p>{view.detail}</p>
      {view.facts.length > 0 && <ul aria-label="Операционные показатели">
        {view.facts.map((fact) => <li key={fact}>{fact}</li>)}
      </ul>}
    </div>
  </aside>;
}
