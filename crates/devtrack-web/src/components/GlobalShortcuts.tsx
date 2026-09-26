import { useEffect, useCallback } from 'react';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';

export function useGlobalShortcuts() {
  const { activeTimer, setActiveTimer } = useAppStore();

  const handleShortcut = useCallback(async (event: { state: 'Released' | 'Pressed' }) => {
    if (event.state === 'Pressed') {
      if (activeTimer) {
        await invoke('timer_stop', { taskId: activeTimer.taskId });
        setActiveTimer(null);
      } else {
        await invoke('show_window');
      }
    }
  }, [activeTimer, setActiveTimer]);

  useEffect(() => {
    const registerShortcuts = async () => {
      await unregisterAll();
      await register('Ctrl+Shift+T', handleShortcut);
    };

    registerShortcuts();

    return () => {
      unregisterAll();
    };
  }, [handleShortcut]);
}