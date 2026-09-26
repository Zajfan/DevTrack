import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@utils/helpers';
import { useAppStore } from '@store/appStore';

export function Layout() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Header />
      <div className="flex flex-1 min-h-0">
        <main
          className={cn(
            'flex-1 min-w-0 overflow-y-auto transition-[margin] duration-300',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          <div className="p-5 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}