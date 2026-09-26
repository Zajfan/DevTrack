import { useEffect, useCallback } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { useQueryClient } from '@tanstack/react-query';
import type { ActiveTimerResponse, TimerUpdateEvent } from '../api/client';

export function useTimerEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<TimerUpdateEvent>('timer_update', () => {
        queryClient.invalidateQueries({ queryKey: ['active-timer'] });
        queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [queryClient]);
}

export function useTauriEvent<T>(eventName: string, handler: (event: T) => void) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<T>(eventName, (event) => {
        handler(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, handler]);
}

export function useTauriEmit() {
  const emitEvent = useCallback(async <T>(eventName: string, payload: T) => {
    await emit(eventName, payload);
  }, []);

  return { emitEvent };
}

export function useTimerUpdate() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen('timer_update', () => {
        queryClient.invalidateQueries({ queryKey: ['active-timer'] });
        queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [queryClient]);
}

export const useNativeNotifications = () => {
  return useCallback(async (title: string, body: string) => {
    await sendNotification({ title, body });
  }, []);
};