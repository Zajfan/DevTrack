import { useState, useEffect } from 'react';
import { cn } from '@utils/helpers';
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  GitBranch,
  Globe,
  Save,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '@store/settingsStore';
import { saveFile } from '@components/NativeDialogs';

interface Settings {
  username: string;
  email: string;
  defaultProjectPath: string;
  autoStartTimer: boolean;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  desktopNotifications: boolean;
  timerCompleteSound: boolean;
  dailySummaryEmail: boolean;
  syncEnabled: boolean;
  syncProvider: 'webdav' | 's3' | 'git';
  syncUrl: string;
  apiPort: number;
  debugMode: boolean;
  telemetryEnabled: boolean;
}

const defaultSettings: Settings = {
  username: 'developer',
  email: 'dev@example.com',
  defaultProjectPath: '.',
  autoStartTimer: false,
  theme: 'system',
  compactMode: false,
  sidebarCollapsed: false,
  desktopNotifications: true,
  timerCompleteSound: true,
  dailySummaryEmail: false,
  syncEnabled: false,
  syncProvider: 'webdav',
  syncUrl: '',
  apiPort: 8080,
  debugMode: false,
  telemetryEnabled: true,
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'sync' | 'advanced'>('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sync', label: 'Sync', icon: GitBranch },
    { id: 'advanced', label: 'Advanced', icon: Shield },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await invoke<Settings>('settings_get');
      setSettings({ ...defaultSettings, ...stored });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke('settings_set', { settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your DevTrack preferences</p>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto px-4" aria-label="Settings tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-6">
            {activeTab === 'general' && (
              <GeneralSettings settings={settings} setSettings={setSettings} />
            )}
            {activeTab === 'appearance' && (
              <AppearanceSettings settings={settings} setSettings={setSettings} />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings settings={settings} setSettings={setSettings} />
            )}
            {activeTab === 'sync' && (
              <SyncSettings settings={settings} setSettings={setSettings} />
            )}
            {activeTab === 'advanced' && (
              <AdvancedSettings settings={settings} setSettings={setSettings} />
            )}
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GeneralSettings({ settings, setSettings }: { settings: any; setSettings: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
          <input
            type="text"
            value={settings.username}
            onChange={(e) => setSettings({ ...settings, username: e.target.value })}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Defaults</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Project Path</label>
          <input
            type="text"
            value={settings.defaultProjectPath}
            onChange={(e) => setSettings({ ...settings, defaultProjectPath: e.target.value })}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            placeholder="."
          />
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.autoStartTimer}
            onChange={(e) => setSettings({ ...settings, autoStartTimer: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Auto-start timer when selecting a task</span>
        </label>
      </div>
    </div>
  );
}

function AppearanceSettings({ settings, setSettings }: { settings: any; setSettings: any }) {
  // Theme/compact apply INSTANTLY (persisted separately via useSettingsStore),
  // in addition to being saved to the backend settings store on Save.
  const { theme: liveTheme, setTheme: setLiveTheme, compactMode: liveCompact, setCompactMode: setLiveCompact } = useSettingsStore();
  const theme = liveTheme ?? settings.theme;
  const compactMode = liveCompact ?? settings.compactMode;
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Theme</h3>
      <div className="grid grid-cols-3 gap-3">
        {['light', 'dark', 'system'].map((t) => (
          <button
            key={t}
            onClick={() => {
              setSettings({ ...settings, theme: t });
              setLiveTheme(t as 'light' | 'dark' | 'system');
            }}
            className={cn(
              'p-4 rounded-lg border-2 transition-all text-center',
              theme === t
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
            )}
          >
            <div className="text-lg font-medium capitalize">{t}</div>
            <p className="text-xs text-gray-500 mt-1">
              {t === 'system' ? 'Follows OS' : t === 'light' ? 'Light mode' : 'Dark mode'}
            </p>
          </button>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Layout</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={(e) => {
              setSettings({ ...settings, compactMode: e.target.checked });
              setLiveCompact(e.target.checked);
            }}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Compact mode (denser UI)</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.sidebarCollapsed}
            onChange={(e) => setSettings({ ...settings, sidebarCollapsed: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Start with sidebar collapsed</span>
        </label>
      </div>
    </div>
  );
}

function NotificationSettings({ settings, setSettings }: { settings: any; setSettings: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Desktop Notifications</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.desktopNotifications}
            onChange={(e) => setSettings({ ...settings, desktopNotifications: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Enable desktop notifications</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.timerCompleteSound}
            onChange={(e) => setSettings({ ...settings, timerCompleteSound: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Play sound when timer completes</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.dailySummaryEmail}
            onChange={(e) => setSettings({ ...settings, dailySummaryEmail: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Send daily summary email</span>
        </label>
      </div>
    </div>
  );
}

function SyncSettings({ settings, setSettings }: { settings: any; setSettings: any }) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // persist first so the backend reads the current URL
      await invoke('settings_set', { settings });
      const result = await invoke<string>('sync_test');
      setTestResult(result);
    } catch (error) {
      setTestResult(String(error));
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      await invoke('settings_set', { settings });
      const result = await invoke<string>('sync_now');
      setSyncResult(result);
    } catch (error) {
      setSyncResult(String(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Settings</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.syncEnabled}
            onChange={(e) => setSettings({ ...settings, syncEnabled: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Enable automatic sync (on start + every 5 minutes)</span>
        </label>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sync repository (private GitHub repo recommended)
        </label>
        <input
          type="text"
          value={settings.syncUrl}
          onChange={(e) => setSettings({ ...settings, syncUrl: e.target.value })}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
          placeholder="git@github.com:you/DevTrackSync.git"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Create an empty <span className="font-medium">private</span> repository, paste its clone URL here.
          Your database and notes sync as commits — full history is your backup.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleTest}
          disabled={testing || !settings.syncUrl}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 flex items-center gap-2"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
          Test Connection
        </button>
        <button
          onClick={handleSyncNow}
          disabled={syncing || !settings.syncUrl}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 flex items-center gap-2"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Now
        </button>
      </div>

      {testResult && (
        <p className={cn('text-sm', testResult === 'Connection OK' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {testResult}
        </p>
      )}
      {syncResult && (
        <p className={cn('text-sm', syncResult.startsWith('Sync complete') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {syncResult}
        </p>
      )}

      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sync backs up your local database before every sync (<span className="font-mono text-xs">backups/pre-sync-*.db</span>).
          <br />
          <span className="text-purple-600 dark:text-purple-400">Note:</span> syncing requires git access to the repository (SSH key or credentials).
        </p>
      </div>
    </div>
  );
}

function AdvancedSettings({ settings, setSettings }: { settings: any; setSettings: any }) {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Server</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Port</label>
        <input
          type="number"
          value={settings.apiPort}
          onChange={(e) => setSettings({ ...settings, apiPort: parseInt(e.target.value) })}
          className="w-full max-w-xs px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Debug & Telemetry</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.debugMode}
            onChange={(e) => setSettings({ ...settings, debugMode: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Enable debug logging</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.telemetryEnabled}
            onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Send anonymous usage statistics</span>
        </label>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Management</h3>
      <div className="space-y-3">
        <button
          onClick={async () => {
            setExportStatus(null);
            try {
              const json = await invoke<string>('app_export_data');
              const path = await saveFile({ title: 'Export Data', defaultPath: `devtrack-export-${new Date().toISOString().slice(0, 10)}.json` });
              if (path) {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(path, json);
                setExportStatus(`Exported to ${path}`);
              }
            } catch (error) {
              setExportStatus(`Export failed: ${String(error)}`);
            }
          }}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
        >
          <Database className="w-4 h-4" />
          Export All Data (JSON)
        </button>
        {exportStatus && (
          <p className={cn('text-sm', exportStatus.startsWith('Exported') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {exportStatus}
          </p>
        )}
        <button className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Delete All Data
        </button>
      </div>
    </div>
  );
}

