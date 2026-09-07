'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContentLibraryView } from '@/features/content';
import { HistoryView } from '@/features/history';
import { KnowledgeView } from '@/features/knowledge';
import type { ContentFormat } from '@/features/shared';
import { WorkspaceView } from '@/features/workspace';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { CommandPalette } from './command-palette';
import { useHashNavigation } from './use-hash-navigation';
import { useShellPreferences } from './use-shell-preferences';

export function FormeApp() {
  const { activeView, navigate } = useHashNavigation();
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useShellPreferences();
  const [activeFormat, setActiveFormat] = useState<ContentFormat | null>(null);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [researchSeed, setResearchSeed] = useState({ topic: '', revision: 0 });

  const closeCommands = useCallback(() => setCommandsOpen(false), []);

  useEffect(() => {
    const openCommands = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setCommandsOpen(true);
      }
    };
    window.addEventListener('keydown', openCommands);
    return () => window.removeEventListener('keydown', openCommands);
  }, []);

  function openFormat(format: ContentFormat) {
    setActiveFormat(format);
    navigate('workspace');
    window.setTimeout(() => document.querySelector('.content-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function openContentStudio() {
    openFormat(activeFormat ?? 'Threads');
  }

  function repeatResearch(topic: string) {
    setResearchSeed((seed) => ({ topic, revision: seed.revision + 1 }));
    navigate('workspace');
  }

  return (
    <main className="app-shell" data-theme={theme} data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}>
      <AppSidebar activeView={activeView} collapsed={sidebarCollapsed} onNavigate={navigate} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <section className="workspace">
        <AppTopbar activeView={activeView} theme={theme} onThemeChange={setTheme} onOpenCommands={() => setCommandsOpen(true)} />
        <div className="view-frame" key={activeView}>
          {activeView === 'workspace' && <WorkspaceView key={researchSeed.revision} initialTopic={researchSeed.topic} activeFormat={activeFormat} onFormatChange={setActiveFormat} onOpenContent={() => navigate('content')} />}
          {activeView === 'knowledge' && <KnowledgeView />}
          {activeView === 'content' && <ContentLibraryView onCreate={openContentStudio} onOpenFormat={openFormat} />}
          {activeView === 'history' && <HistoryView onRepeat={repeatResearch} />}
        </div>
        <footer>
          <span>Forme / private beta</span>
          <p>Live-поиск находит кандидатов PubMed/Crossref. Демо-claims и шаблоны контента не считаются автоматически проверенными выводами.</p>
        </footer>
      </section>
      <CommandPalette open={commandsOpen} onClose={closeCommands} onNavigate={navigate} />
    </main>
  );
}
