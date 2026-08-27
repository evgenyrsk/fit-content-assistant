import { Command, Moon, Sun } from 'lucide-react';
import { viewMeta, type Theme, type ViewId } from '@/features/shared';

interface AppTopbarProps {
  activeView: ViewId;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function AppTopbar({ activeView, theme, onThemeChange }: AppTopbarProps) {
  const meta = viewMeta[activeView];
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="topbar">
      <div>
        <p className="overline">{meta.overline}</p>
        <p className="page-context">{activeView === 'workspace' ? 'Рабочая область' : 'Forme'} <span>/</span> {meta.title}</p>
      </div>
      <div className="top-actions">
        <span className="sync-state"><i /> Всё сохранено</span>
        <button className="theme-toggle" onClick={() => onThemeChange(nextTheme)} aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
          <span>{theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</span>
          <b>{theme === 'dark' ? 'Light' : 'Dark'}</b>
        </button>
        <button className="quiet-button" type="button" aria-label="Открыть палитру команд"><Command aria-hidden="true" /> K</button>
      </div>
    </header>
  );
}
