import { useAppStore } from '@store/appStore';
import { useProjects } from '@hooks/useApi';
import { cn } from '@utils/helpers';
import { Search, User, LogOut, ChevronDown, Settings, GitBranch } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { sidebarOpen, toggleSidebar, setSelectedProject, setViewMode } = useAppStore();
  const { data: projects } = useProjects(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+K focuses search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const matches = query
    ? (projects ?? []).filter((p) => p.name.toLowerCase().includes(query) || p.tags.toLowerCase().includes(query)).slice(0, 6)
    : [];

  const goProject = (id: number) => {
    setSelectedProject(id);
    setViewMode('projects');
    navigate('/projects');
    setSearchQuery('');
    setShowUserMenu(false);
  };

  return (
    <header className={cn('h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700', 'flex items-center justify-between px-4', 'transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-16')}>
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search projects, tags… (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches.length > 0) goProject(matches[0].id);
              if (e.key === 'Escape') setSearchQuery('');
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
          />
          {query && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              {matches.length === 0 ? (
                <p className="px-4 py-2 text-sm text-gray-500">No matching projects</p>
              ) : (
                matches.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => goProject(p.id)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                  >
                    <GitBranch className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm text-gray-900 dark:text-white font-medium">{p.name}</span>
                    {p.tags && <span className="text-xs text-gray-400 truncate">{p.tags}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-purple-700 dark:text-purple-300 font-medium text-sm">U</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white">User</p>
                <p className="text-sm text-gray-500">user@example.com</p>
              </div>
              <button className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </button>
              <button className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}