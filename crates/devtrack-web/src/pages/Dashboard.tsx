import { useDashboardSummary, useTimeEntries, useGlobalTasks } from '@hooks/useApi';
import { cn, formatDuration, formatTimestamp } from '@utils/helpers';
import {
  FolderGit2,
  CheckSquare,
  Clock,
  TrendingUp,
  Timer,
  GitBranch,
  Tag,
  AlertTriangle,
  Play,
  Square,
  Pause,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@store/appStore';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { data: summary } = useDashboardSummary();
  const { data: timeEntries } = useTimeEntries('today');
  const { data: globalTasks } = useGlobalTasks();
  const { setActiveTimer } = useAppStore();
  const navigate = useNavigate();

  const openTasks = globalTasks?.filter((t) => t.status === 'Todo') ?? [];
  const overdueTasks = openTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));
  const dueToday = openTasks.filter((t) => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString());

  const stats = [
    { label: 'Total Projects', value: summary?.total_projects || 0, icon: FolderGit2, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active Projects', value: summary?.active_projects || 0, icon: GitBranch, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
    { label: 'Open Tasks', value: openTasks.length, icon: CheckSquare, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
    {
      label: overdueTasks.length ? 'Overdue' : 'Completed',
      value: overdueTasks.length || summary?.done_tasks || 0,
      icon: overdueTasks.length ? AlertTriangle : TrendingUp,
      color: overdueTasks.length ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-green-500 bg-green-100 dark:bg-green-900/30',
    },
  ];

  const timerStats = [
    { label: 'Today', value: formatDuration(timeEntries?.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) || 0), icon: Clock },
    { label: 'This Week', value: '-', icon: Calendar },
    { label: 'All Time', value: '-', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Due-date alert strip */}
      {(overdueTasks.length > 0 || dueToday.length > 0) && (
        <button
          onClick={() => navigate('/all-tasks')}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border flex items-center gap-3 transition-colors',
            overdueTasks.length
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
          )}
        >
          <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', overdueTasks.length ? 'text-red-500' : 'text-yellow-500')} />
          <span className={cn('text-sm', overdueTasks.length ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300')}>
            {overdueTasks.length > 0 && (
              <>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</>
            )}
            {overdueTasks.length > 0 && dueToday.length > 0 && ' · '}
            {dueToday.length > 0 && (
              <>{dueToday.length} due today</>
            )}
            <span className="ml-2 underline">view all tasks</span>
          </span>
        </button>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => navigate('/all-tasks')}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-left hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={cn('p-3 rounded-lg', stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Timer + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Timer Card */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active Timer</h2>
            <Timer className="w-5 h-5 text-gray-400" />
          </div>

          {summary?.active_timer ? (
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Currently tracking</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">Task #{summary.active_timer.task_id}</p>
                </div>
                <div className="text-4xl font-mono font-bold text-purple-700 dark:text-purple-300">
                  {summary.active_timer.elapsed_formatted}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 px-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-red-700">
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Timer className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No active timer</p>
              <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto">
                <Play className="w-4 h-4" />
                Start Timer
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Time Today</h3>
            <div className="space-y-3">
              {timerStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <stat.icon className="w-5 h-5 text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{stat.label}</span>
                  </div>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                <GitBranch className="w-5 h-5 text-purple-500 mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">New Project</p>
                <p className="text-sm text-gray-500">Register a new project</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                <Clock className="w-5 h-5 text-green-500 mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">Start Timer</p>
                <p className="text-sm text-gray-500">Track time on a task</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                <Tag className="w-5 h-5 text-blue-500 mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">Add Task</p>
                <p className="text-sm text-gray-500">Create a new task</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">View Reports</p>
                <p className="text-sm text-gray-500">Time reports & analytics</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Time Entries</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            {formatDuration(timeEntries?.reduce((sum: number, e) => sum + (e.duration_seconds ?? 0), 0) || 0)} today
          </span>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {!timeEntries?.length ? (
            <div className="p-6 text-center text-gray-500">No time entries recorded today. Start a timer to track your work!</div>
          ) : (
            timeEntries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{entry.task_title}</p>
                    <p className="text-xs text-gray-500">{entry.project_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{formatTimestamp(Number(entry.start_time))}</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white text-sm">
                    {formatDuration(entry.duration_seconds)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

