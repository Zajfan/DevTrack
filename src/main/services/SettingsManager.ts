import Store from 'electron-store';
import { AppSettings, DEFAULT_SETTINGS } from '../models/AppSettings';

export class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'app-settings',
      defaults: DEFAULT_SETTINGS,
    });
  }

  // Get all settings
  getAll(): AppSettings {
    return this.store.store;
  }

  // Get specific setting
  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  // Update specific setting
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
    this.store.set('lastUpdated', new Date().toISOString());
  }

  // Update multiple settings
  setMany(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      if (key !== 'lastUpdated') {
        this.store.set(key as keyof AppSettings, value as any);
      }
    });
    this.store.set('lastUpdated', new Date().toISOString());
  }

  // Reset to defaults
  reset(): void {
    this.store.clear();
    this.store.store = DEFAULT_SETTINGS;
  }

  // Reset specific section
  resetSection<K extends keyof AppSettings>(key: K): void {
    this.store.set(key, DEFAULT_SETTINGS[key]);
    this.store.set('lastUpdated', new Date().toISOString());
  }

  // Export settings
  export(): string {
    return JSON.stringify(this.store.store, null, 2);
  }

  // Import settings
  import(settingsJson: string): void {
    try {
      const settings = JSON.parse(settingsJson) as AppSettings;
      this.store.store = { ...DEFAULT_SETTINGS, ...settings };
      this.store.set('lastUpdated', new Date().toISOString());
    } catch (error) {
      throw new Error('Invalid settings JSON');
    }
  }

  // Get file path
  getFilePath(): string {
    return this.store.path;
  }
}
