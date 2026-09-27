import { useGlobalTasks, useUpdateTask, useStartTimer, useStopTimer, useActiveTimer } from '@hooks/useApi';
import { useAppStore } from '@store/appStore';
import { useNavigate } from 'react-router-dom';
import { cn, getPriorityColor, getStatusColor } from '@utils/helpers';
import {
  CheckSquare,
  Check,
  Calendar,
  Play,
  Square,
  Globe,
  Timer as TimerIcon,
} from 'lucide-react';
import type { Task } from '../types';

export function GlobalTasks() {
  const { data: tasks, isLoading, error } = useGlobalTasks();
  const updateTask = useUpdateTask();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const { data: activeTimerData } = useActiveTimer();
  const { setSelectedProject } = useAppStore();
  const navigate = useNavigate();

  const running = activeTimerData && 'task_id' in activeTimerData;

  const handleToggle = async (task: Task) => {
    if (running && activeTimerData && 'task_id' in activeTimerData && activeTimerData.task_id === task.id) {
      await stopTimer.mutateAsync(task.id);
    } else {
      await startTimer.mutateAsync(task.id);
    }
  };

  const openProject = (projectId: number) => {
    setSelectedProject(projectId);
    navigate('/tasks');
  };

  const todo = tasks?.filter((t) => t.status === 'Todo') ?? [];
  const done = tasks?.filter((t) => t.status === 'Done') ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Every open task across all projects, sorted by priority
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="native-pane p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="native-pane p-6" role="alert">
          <p className="text-sm text-red-600 dark:text-red-400">Could not load tasks: {String(error)}</p>
        </div>
      ) : !tasks?.length ? (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tasks anywhere</h2>
          <p className="text-gray-500 dark:text-gray-400">Create tasks inside a project to see them here</p>
        </div>
      ) : (
        <>
          {/* Open tasks */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Open ({todo.length})
            </h3>
            {todo.map((task) => {
              const isRunning = running && activeTimerData && 'task_id' in activeTimerData && activeTimerData.task_id === task.id;
              const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
              return (
                <div
                  key={task.id}
                  className={cn(
                    'native-pane p-4 flex items-center gap-3 transition-colors',
                    isRunning && 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  )}
                >
                  <button
                    onClick={() => updateTask.mutate({ id: task.id, data: { status: 'Done' } })}
                    aria-label="Mark as done"
                    className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-500 group transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                      {overdue && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          overdue
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openProject(task.project_id)}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {task.project_name}
                    </button>
                  </div>
                  <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0', getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    onClick={() => handleToggle(task)}
                    className={cn(
                      'p-2 rounded-lg flex-shrink-0 transition-colors',
                      isRunning
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600'
                    )}
                    aria-label={isRunning ? 'Stop timer' : 'Start timer'}
                    title={isRunning ? 'Stop timer' : 'Start timer'}
                  >
                    {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Recently completed */}
          {done.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Completed ({done.length})
              </h3>
              {done.slice(0, 10).map((task) => (
                <div key={task.id} className="native-pane p-3 flex items-center gap-3 opacity-60">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-through flex-1 truncate">{task.title}</p>
                  <span className="text-xs text-gray-400">{task.project_name}</span>
                  <button
                    onClick={() => updateTask.mutate({ id: task.id, data: { status: 'Todo' } })}
                    className="text-xs text-gray-400 hover:text-purple-600 flex-shrink-0"
                    aria-label="Reopen task"
                  >
                    reopen
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}