'use client';

import { useEffect, useState } from 'react';
import type { ViewId } from '@/features/shared';

const viewIds: ViewId[] = ['workspace', 'knowledge', 'content', 'history'];

function readViewFromHash(): ViewId | null {
  const hash = window.location.hash.replace('#', '') as ViewId;
  return viewIds.includes(hash) ? hash : null;
}

export function useHashNavigation() {
  const [activeView, setActiveView] = useState<ViewId>('workspace');

  useEffect(() => {
    const sync = () => {
      const view = readViewFromHash();
      if (view) setActiveView(view);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function navigate(view: ViewId) {
    setActiveView(view);
    window.history.replaceState(null, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { activeView, navigate };
}
