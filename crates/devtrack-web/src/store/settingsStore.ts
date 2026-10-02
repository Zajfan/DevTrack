import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  setTheme: (theme: SettingsState['theme']) => void;
  setCompactMode: (compact: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      compactMode: false,
      setTheme: (theme) => set({ theme }),
      setCompactMode: (compactMode) => set({ compactMode }),
    }),
    {
      name: 'devtrack-appearance',
    }
  )
);