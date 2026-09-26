import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@store/appStore';
import { cn } from '@utils/helpers';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  StickyNote,
  Timer,
  BarChart3,
  Settings,
  GitBranch,
  Tag,
  Clock,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

type ViewMode = 'dashboard' | 'projects' | 'tasks' | 'notes' | 'timer' | 'reports' | 'settings';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen, viewMode, setViewMode } = useAppStore();
  const width = useWindowWidth();

  // Responsive: auto-collapse below 900px, restore above unless user chose collapsed
  const [userToggled, setUserToggled] = useState(false);
  useEffect(() => {
    if (width < 900 && !userToggled) setSidebarOpen(false);
    if (width >= 900 && !userToggled) setSidebarOpen(true);
  }, [width, userToggled, setSidebarOpen]);

  const navItems: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }>; accel: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, accel: 'Ctrl+1' },
    { id: 'projects', label: 'Projects', icon: FolderGit2, accel: 'Ctrl+2' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, accel: 'Ctrl+3' },
    { id: 'notes', label: 'Notes', icon: StickyNote, accel: 'Ctrl+4' },
    { id: 'timer', label: 'Timer', icon: Timer, accel: 'Ctrl+5' },
    { id: 'reports', label: 'Reports', icon: BarChart3, accel: 'Ctrl+6' },
    { id: 'settings', label: 'Settings', icon: Settings, accel: 'Ctrl+7' },
  ];

  return (
    <>
      <button
        onClick={() => { setUserToggled(true); toggleSidebar(); }}
        className={cn(
          'fixed top-[9px] left-2 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm',
          sidebarOpen ? 'left-64' : 'left-2'
        )}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
          'flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-white">
            <GitBranch className="w-6 h-6 text-purple-600" />
            <span className={cn('transition-opacity duration-200', sidebarOpen ? 'opacity-100' : 'opacity-0')}>
              DevTrack
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto" title="">
          {navItems.map((item) => {
            const isActive = viewMode === item.id;
            return (
              <Link
                key={item.id}
                to={`/${item.id === 'dashboard' ? '' : item.id}`}
                onClick={() => setViewMode(item.id)}
                title={sidebarOpen ? undefined : `${item.label} (${item.accel})`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  sidebarOpen ? '' : 'justify-center px-2'
                )}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
                <span className={cn('text-sm font-medium transition-opacity duration-200 flex-1', sidebarOpen ? 'opacity-100' : 'opacity-0')}>
                  {item.label}
                </span>
                {sidebarOpen && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{item.accel}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className={cn('space-y-2', sidebarOpen ? '' : 'hidden')}>
            <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button title="Add tag" className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                <Tag className="w-4 h-4 mx-auto" />
              </button>
              <button title="Log time" className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                <Clock className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}