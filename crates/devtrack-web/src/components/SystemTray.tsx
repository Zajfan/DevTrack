import { useEffect, useRef, useCallback } from 'react';
import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { useAppStore } from '../store/appStore';
import { invoke } from '@tauri-apps/api/core';

let trayInstance: TrayIcon | null = null;

export function setTrayTitle(title: string) {
  if (trayInstance) {
    trayInstance.setTitle(title);
  }
}

export function useSystemTray() {
  const { activeTimer, setActiveTimer } = useAppStore();
  const trayRef = useRef<TrayIcon | null>(null);

  const updateMenu = useCallback(async (tray: TrayIcon, timer: { taskId: number; startTime: number; taskTitle: string } | null) => {
    const startTimerLabel = timer ? 'Stop Timer' : 'Start Timer';
    const taskId = timer?.taskId ?? 0;
    const newMenu = await Menu.new({
      items: [
        await MenuItem.new({ 
          text: 'Show DevTrack', 
          action: async () => { await invoke('show_window'); } 
        }),
        await MenuItem.new({ 
          text: startTimerLabel, 
          action: async () => {
            if (timer) {
              await invoke('timer_stop', { taskId });
              setActiveTimer(null);
            } else {
              await invoke('show_window');
            }
          } 
        }),
        await MenuItem.new({ text: 'Quit', action: async () => { await invoke('quit_app'); } }),
      ],
    });
    await tray.setMenu(newMenu);
  }, [setActiveTimer]);

  useEffect(() => {
    let tray: TrayIcon | null = null;

    const setupTray = async () => {
      tray = await TrayIcon.new({
        icon: 'icons/tray-icon.png',
        menu: await Menu.new({
          items: [
            await MenuItem.new({ 
              text: 'Show DevTrack', 
              action: async () => { await invoke('show_window'); } 
            }),
            await MenuItem.new({ 
              text: activeTimer ? 'Stop Timer' : 'Start Timer', 
              action: async () => {
                if (activeTimer) {
                  await invoke('timer_stop', { taskId: activeTimer.taskId });
                  setActiveTimer(null);
                } else {
                  await invoke('show_window');
                }
              } 
            }),
            await MenuItem.new({ text: 'Quit', action: async () => { await invoke('quit_app'); } }),
          ],
        }),
        action: (event) => {
          if (event.type === 'DoubleClick') {
            invoke('show_window');
          }
        },
      });

      trayRef.current = tray;
      trayInstance = tray;
    };

    setupTray();

    return () => {
      if (tray) {
        tray.close();
        trayRef.current = null;
        trayInstance = null;
      }
    };
  }, [activeTimer, setActiveTimer]);

  // Update menu when activeTimer changes
  useEffect(() => {
    if (trayRef.current) {
      updateMenu(trayRef.current, activeTimer);
    }
  }, [activeTimer, updateMenu]);
}