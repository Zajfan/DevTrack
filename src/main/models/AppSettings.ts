/**
 * Application Settings Model
 */

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'custom';
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  customCss?: string;
}

export interface BrandingSettings {
  appName?: string;
  logoUrl?: string;
  companyName?: string;
  supportEmail?: string;
}

export interface KeyboardShortcut {
  action: string;
  keys: string;
  description: string;
}

export interface WorkspaceSettings {
  defaultView: 'list' | 'board' | 'calendar' | 'table' | 'gallery';
  taskGrouping: 'status' | 'priority' | 'assignee' | 'none';
  taskSorting: 'manual' | 'dueDate' | 'priority' | 'created';
  showCompletedTasks: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

export interface AppSettings {
  theme: ThemeSettings;
  branding: BrandingSettings;
  keyboardShortcuts: KeyboardShortcut[];
  workspace: WorkspaceSettings;
  version: string;
  lastUpdated: string;
}

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { action: 'newProject', keys: 'Ctrl+Shift+P', description: 'Create new project' },
  { action: 'newTask', keys: 'Ctrl+Shift+T', description: 'Create new task' },
  { action: 'search', keys: 'Ctrl+K', description: 'Global search' },
  { action: 'save', keys: 'Ctrl+S', description: 'Save current item' },
  { action: 'delete', keys: 'Delete', description: 'Delete selected item' },
  { action: 'toggleSidebar', keys: 'Ctrl+B', description: 'Toggle sidebar' },
  { action: 'nextView', keys: 'Ctrl+Tab', description: 'Switch to next view' },
  { action: 'prevView', keys: 'Ctrl+Shift+Tab', description: 'Switch to previous view' },
  { action: 'quickAdd', keys: 'Ctrl+Enter', description: 'Quick add task' },
  { action: 'editTask', keys: 'E', description: 'Edit selected task' },
  { action: 'completeTask', keys: 'C', description: 'Mark task as complete' },
  { action: 'assignTask', keys: 'A', description: 'Assign task' },
  { action: 'addComment', keys: 'M', description: 'Add comment' },
  { action: 'toggleDarkMode', keys: 'Ctrl+Shift+D', description: 'Toggle dark mode' },
  { action: 'help', keys: 'F1', description: 'Show help' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: {
    mode: 'dark',
  },
  branding: {
    appName: 'DevTrack',
    companyName: 'DevTrack',
  },
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  workspace: {
    defaultView: 'board',
    taskGrouping: 'status',
    taskSorting: 'manual',
    showCompletedTasks: true,
    autoSave: true,
    autoSaveInterval: 30,
    notificationsEnabled: true,
    soundEnabled: false,
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};
