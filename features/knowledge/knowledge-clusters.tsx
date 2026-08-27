import { ArrowUpRight, BookOpenText, Layers3 } from 'lucide-react';
import type { KnowledgeClaimRecord } from '@/lib/domain';

interface KnowledgeClustersProps {
  claims: KnowledgeClaimRecord[];
  topics: string[];
  active: string;
  onChange: (topic: string) => void;
}

export function KnowledgeClusters({ claims, topics, active, onChange }: KnowledgeClustersProps) {
  const clusters = ['Все темы', ...topics];
  return (
    <section className="cluster-panel">
      <div className="cluster-heading"><div><p className="overline">TOPIC MAP</p><h2>Тематические кластеры</h2></div><span>Реальные claims · фильтры комбинируются</span></div>
      <div className="cluster-grid">
        {clusters.map((name, index) => {
          const count = name === 'Все темы' ? claims.length : claims.filter((claim) => claim.topic === name).length;
          const Icon = index === 0 ? BookOpenText : Layers3;
          return (
            <button className={active === name ? 'active' : ''} key={name} onClick={() => onChange(name)}>
              <i><Icon aria-hidden="true" /></i><span><strong>{name}</strong><small>{count} claims</small></span><ArrowUpRight aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
