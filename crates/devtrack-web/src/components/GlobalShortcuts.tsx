import { useEffect, useRef } from 'react';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';

export function useGlobalShortcuts() {
  const { activeTimer, setActiveTimer } = useAppStore();
  const handlerRef = useRef<(event: { state: 'Released' | 'Pressed' }) => void>(undefined);

  handlerRef.current = async (event: { state: 'Released' | 'Pressed' }) => {
    if (event.state === 'Pressed') {
      if (activeTimer) {
        await invoke('timer_stop', { taskId: activeTimer.taskId });
        setActiveTimer(null);
      } else {
        await invoke('show_window');
      }
    }
  };

  useEffect(() => {
    const registerShortcuts = async () => {
      try {
        // Handler lives in a ref so this effect registers exactly once;
        // a StrictMode double-mount may race unregisterAll/register — ignore that error.
        await register('Ctrl+Shift+T', (event) => handlerRef.current?.(event));
      } catch {
        // already registered by a previous mount — the handler ref still routes events
      }
    };

    registerShortcuts();

    return () => {
      unregisterAll().catch(() => {});
    };
  }, []);
}