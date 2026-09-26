import { useActiveTimer, useStartTimer, useStopTimer, useTimeEntries, useTasks, useProjects } from '@hooks/useApi';
import { useAppStore } from '@store/appStore';
import { useState, useEffect } from 'react';
import { cn, formatDuration } from '@utils/helpers';
import { setTrayTitle } from '../components/SystemTray';
import {
  Play,
  Square,
  CheckSquare,
  Timer as TimerIcon,
  FolderGit2,
} from 'lucide-react';
import type { Task } from '../types';

export function TimerPage() {
  const { selectedProjectId, setSelectedProject, setActiveTimer } = useAppStore();
  const { data: projects } = useProjects(false);
  const { data: tasks } = useTasks(selectedProjectId);
  const { data: activeTimerData } = useActiveTimer();
  const { data: timeEntries } = useTimeEntries('today');
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const [localElapsed, setLocalElapsed] = useState(0);

  const activeTask: Task | undefined =
    activeTimerData && 'task_id' in activeTimerData
      ? tasks?.find((t) => t.id === activeTimerData.task_id)
      : undefined;

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  // Sync with server timer
  useEffect(() => {
    if (activeTimerData && 'task_id' in activeTimerData) {
      setActiveTimer({
        taskId: activeTimerData.task_id,
        startTime: activeTimerData.start_time,
        taskTitle: activeTask?.title ?? `Task #${activeTimerData.task_id}`,
      });
    } else {
      setActiveTimer(null);
    }
  }, [activeTimerData, activeTask, setActiveTimer]);

  // Local timer update
  useEffect(() => {
    if (!activeTimerData || !('task_id' in activeTimerData)) {
      setLocalElapsed(0);
      return;
    }
    const tick = () => setLocalElapsed(Date.now() / 1000 - activeTimerData.start_time);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTimerData]);

  // Update system tray title with timer elapsed time
  useEffect(() => {
    if (activeTimerData && 'task_id' in activeTimerData) {
      setTrayTitle(`DevTrack: ${formatDuration(localElapsed)}`);
    } else {
      setTrayTitle('DevTrack');
    }
  }, [activeTimerData, localElapsed]);

  const handleToggle = async (task: Task) => {
    if (activeTimerData && 'task_id' in activeTimerData && activeTimerData.task_id === task.id) {
      await stopTimer.mutateAsync(task.id);
    } else {
      await startTimer.mutateAsync(task.id);
    }
  };

  const running = activeTimerData && 'task_id' in activeTimerData;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timer</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track time on your tasks</p>
      </div>

      {/* Main Timer Display */}
      <div className="native-pane p-8">
        <div className="text-center">
          <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
            {running ? formatDuration(Math.floor(localElapsed)) : '00:00:00'}
          </div>
          {running && activeTask ? (
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Tracking: <span className="font-medium text-gray-900 dark:text-white">{activeTask.title}</span>
              <span className="ml-2 text-xs">{activeTask.project_name}</span>
            </p>
          ) : (
            <p className="mt-2 text-gray-500 dark:text-gray-400">No active timer — pick a task below</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {running && activeTask ? (
            <button
              onClick={() => handleToggle(activeTask)}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              aria-label="Stop timer"
            >
              <Square className="w-6 h-6" />
            </button>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Select a task below to start tracking
            </span>
          )}
        </div>
      </div>

      {/* Project selector */}
      {!selectedProjectId || !selectedProject ? (
        <div className="native-pane p-6 text-center">
          <FolderGit2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Choose a project to see its tasks</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {(projects || []).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">{p.path}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Task Selector */}
          <div className="native-pane p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Tasks — {selectedProject.name}</h3>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                change project
              </button>
            </div>
            {!tasks?.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No tasks in this project yet — add some on the Tasks page.
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isRunning = running && activeTimerData && 'task_id' in activeTimerData && activeTimerData.task_id === task.id;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        isRunning
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                      )}
                    >
                      <CheckSquare className={cn('w-4 h-4 flex-shrink-0', task.status === 'Done' ? 'text-green-500' : 'text-gray-400')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium text-gray-900 dark:text-white truncate', task.status === 'Done' && 'line-through text-gray-400')}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500">{task.priority}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(task)}
                        disabled={task.status === 'Done'}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40',
                          isRunning
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        )}
                      >
                        {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isRunning ? 'Stop' : 'Start'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Time Entries */}
          <div className="native-pane overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Today's Time Entries</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {formatDuration(timeEntries?.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) || 0)}
              </span>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {timeEntries?.length === 0 ? (
                <div className="p-5 text-center text-gray-500">No time entries today</div>
              ) : (
                timeEntries?.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TimerIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{entry.task_title}</p>
                        <p className="text-xs text-gray-500">{entry.project_name}</p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white text-sm">
                      {formatDuration(entry.duration_seconds)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}