import { WorkspaceWorkPanel } from '../components/WorkspaceWorkPanel';

export function GlobalTasks() {
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Local tasks, GitHub issues and completed changes across your projects.</p></div>
    <WorkspaceWorkPanel />
  </div>;
}
