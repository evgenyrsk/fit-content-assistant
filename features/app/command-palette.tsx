import { BookOpen, FileText, History, Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ViewId } from '@/features/shared';

const commands: Array<{ view: ViewId; label: string; description: string; icon: typeof Search }> = [
  { view: 'workspace', label: 'Исследовать', description: 'Найти и оценить научные источники', icon: Search },
  { view: 'knowledge', label: 'База знаний', description: 'Открыть проверенные версии тезисов', icon: BookOpen },
  { view: 'content', label: 'Контент', description: 'Перейти к контентным операциям', icon: FileText },
  { view: 'history', label: 'История', description: 'Посмотреть исследовательские запуски', icon: History },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
}

export function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const firstButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus();
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      const command = commands[Number(event.key) - 1];
      if (command) { onNavigate(command.view); onClose(); }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [open, onClose, onNavigate]);
  if (!open) return null;

  return <div className="command-palette-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}><section className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-title">
    <header><div><p className="overline">БЫСТРЫЙ ПЕРЕХОД</p><h2 id="command-title">Командная панель</h2></div>
      <button type="button" onClick={onClose} aria-label="Закрыть командную панель"><X aria-hidden="true" /></button></header>
    <div>{commands.map((command, index) => {
      const Icon = command.icon;
      return <button ref={index === 0 ? firstButton : undefined} key={command.view} type="button" onClick={() => {
        onNavigate(command.view); onClose();
      }}><span><Icon aria-hidden="true" /></span><p><strong>{command.label}</strong><small>{command.description}</small></p><kbd>{index + 1}</kbd></button>;
    })}</div>
    <footer><span>Esc — закрыть</span><span>Ctrl / Cmd K — открыть</span></footer>
  </section></div>;
}
