import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl+1 … Ctrl+7', action: 'Switch section (Dashboard, Projects, Tasks, Notes, Timer, Reports, Settings)' },
  { keys: 'Ctrl+K', action: 'Focus search' },
  { keys: 'Ctrl+,', action: 'Open Settings' },
  { keys: 'Ctrl+Shift+T', action: 'Global timer toggle (works anywhere)' },
  { keys: 'Ctrl+S', action: 'Save notes (Notes page)' },
  { keys: '?', action: 'Show this help' },
];

export function useShortcutHelp() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (typing) return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return { helpOpen: open, setHelpOpen: setOpen };
}

export function ShortcutHelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Close help">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-200">{s.action}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}