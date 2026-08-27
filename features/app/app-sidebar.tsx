import { FileText, History, LayoutDashboard, LibraryBig, MoreHorizontal, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import type { ViewId } from '@/features/shared';

interface AppSidebarProps {
  activeView: ViewId;
  collapsed: boolean;
  onNavigate: (view: ViewId) => void;
  onToggle: () => void;
}

const navItems: Array<{ id: ViewId; icon: LucideIcon; label: string; count?: string }> = [
  { id: 'workspace', icon: LayoutDashboard, label: 'Рабочая область' },
  { id: 'knowledge', icon: LibraryBig, label: 'База знаний', count: '24' },
  { id: 'content', icon: FileText, label: 'Контент', count: '08' },
  { id: 'history', icon: History, label: 'История' },
];

export function AppSidebar({ activeView, collapsed, onNavigate, onToggle }: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate('workspace')} aria-label="Forme, на главную">
        <span className="brand-mark">F</span>
        <span className="brand-copy"><strong>Forme</strong><small>Fitness Content OS</small></span>
      </button>
      <button className="sidebar-toggle" type="button" onClick={onToggle} aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'} aria-expanded={!collapsed} title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}>
        {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </button>
      <nav className="nav-list" aria-label="Основная навигация">
        {navItems.map(({ id, icon: Icon, label, count }) => (
          <button className={`nav-item ${activeView === id ? 'active' : ''}`} key={id} onClick={() => onNavigate(id)} aria-current={activeView === id ? 'page' : undefined} aria-label={label} title={collapsed ? label : undefined}>
            <span><Icon aria-hidden="true" /></span><b>{label}</b>{count && <em>{count}</em>}
          </button>
        ))}
      </nav>
      <div className="side-spacer" />
      <div className="integrity-card">
        <div className="integrity-orbit"><i /><i /><i /></div>
        <span>Evidence first</span>
        <p>Источники, их качество и итоговый вывод никогда не смешиваются.</p>
      </div>
      <button className="user-card" type="button">
        <span>ЕР</span><span><strong>Евгений</strong><small>Личный проект</small></span><MoreHorizontal aria-hidden="true" />
      </button>
    </aside>
  );
}
