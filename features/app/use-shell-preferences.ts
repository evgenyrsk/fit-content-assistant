'use client';

import { useEffect, useRef, useState } from 'react';
import type { Theme } from '@/features/shared';

export function useShellPreferences() {
  const hydrated = useRef(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedTheme = window.localStorage.getItem('forme-theme');
      if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
      if (window.localStorage.getItem('forme-sidebar') === 'expanded') setSidebarCollapsed(false);
      document.documentElement.style.colorScheme = storedTheme === 'light' ? 'light' : 'dark';
      hydrated.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem('forme-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem('forme-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  return { theme, setTheme, sidebarCollapsed, setSidebarCollapsed };
}
