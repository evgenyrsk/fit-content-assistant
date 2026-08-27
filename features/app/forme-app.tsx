'use client';

import { useState } from 'react';
import { ContentLibraryView } from '@/features/content';
import { HistoryView } from '@/features/history';
import { KnowledgeView } from '@/features/knowledge';
import type { ContentFormat } from '@/features/shared';
import { WorkspaceView } from '@/features/workspace';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { useHashNavigation } from './use-hash-navigation';
import { useShellPreferences } from './use-shell-preferences';

export function FormeApp() {
  const { activeView, navigate } = useHashNavigation();
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useShellPreferences();
  const [activeFormat, setActiveFormat] = useState<ContentFormat | null>(null);

  function openFormat(format: ContentFormat) {
    navigate('workspace');
    setActiveFormat(format);
    window.setTimeout(() => document.querySelector('.content-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  return (
    <main className="app-shell" data-theme={theme} data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}>
      <AppSidebar activeView={activeView} collapsed={sidebarCollapsed} onNavigate={navigate} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <section className="workspace">
        <AppTopbar activeView={activeView} theme={theme} onThemeChange={setTheme} />
        <div className="view-frame" key={activeView}>
          {activeView === 'workspace' && <WorkspaceView activeFormat={activeFormat} onFormatChange={setActiveFormat} />}
          {activeView === 'knowledge' && <KnowledgeView />}
          {activeView === 'content' && <ContentLibraryView onCreate={() => navigate('workspace')} onOpenFormat={openFormat} />}
          {activeView === 'history' && <HistoryView />}
        </div>
        <footer>
          <span>Forme / private beta</span>
          <p>Интерактивный MVP. Показанные разборы демонстрируют структуру продукта и не являются новым автоматическим научным поиском.</p>
        </footer>
      </section>
    </main>
  );
}
