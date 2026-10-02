import { useTimeReport, useTimeEntryDelete, useTimeEntryUpdate, useTimeEntries } from '@hooks/useApi';
import { api } from '@api/client';
import { useState } from 'react';
import { cn, formatDuration, formatTimestamp } from '@utils/helpers';
import { saveFile } from '@components/NativeDialogs';
import { Calendar, Download, BarChart3, TrendingUp, Clock, CheckSquare, Trash2, Edit, Check, X } from 'lucide-react';
import type { TimeLogEntry, TimeEntry } from '../types';

export function Reports() {
  const [period, setPeriod] = useState<'today' | 'week' | 'all' | 'range'>('today');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const { data: allEntries } = useTimeEntries('all');
  const { data: report, isLoading } = useTimeReport(period === 'range' ? 'all' : period);
  const deleteEntry = useTimeEntryDelete();
  const updateEntry = useTimeEntryUpdate();
  const [editingEntry, setEditingEntry] = useState<{ id: number; duration: string; description: string } | null>(null);
  const [exported, setExported] = useState<string | null>(null);

  // Client-side date-range filter on raw entries (backend period filters are presets)
  const rangeFiltered = period === 'range' && rangeFrom && rangeTo
    ? (allEntries ?? []).filter((e) => {
        const d = new Date(Number(e.start_time) * 1000).toISOString().slice(0, 10);
        return d >= rangeFrom && d <= rangeTo;
      })
    : null;

  // Group raw entries into report-shaped rows for the range view
  const rangeRows = (rangeFiltered ?? []).reduce<Record<string, TimeLogEntry>>((acc, e) => {
    const key = `${e.project_name}|${e.task_title}`;
    acc[key] = acc[key] ?? { date: '', project: e.project_name, task: e.task_title, duration: '', duration_seconds: 0 };
    acc[key].duration_seconds += e.duration_seconds ?? 0;
    acc[key].duration = formatDuration(acc[key].duration_seconds);
    return acc;
  }, {});

  const rows: TimeLogEntry[] = period === 'range' ? Object.values(rangeRows) : (report?.entries ?? []);
  const rangeTotal = rangeFiltered?.reduce((s, e) => s + (e.duration_seconds ?? 0), 0) ?? 0;

  const exportCsv = async () => {
    const csv = ['project,task,duration_seconds,duration']
      .concat(rows.map((e) => `"${e.project}","${e.task}",${e.duration_seconds},"${e.duration}"`))
      .join('\n');
    try {
      const path = await saveFile({ title: 'Export CSV', defaultPath: `devtrack-${period}.csv` });
      if (path) {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(path, csv);
        setExported(`Exported to ${path}`);
        setTimeout(() => setExported(null), 5000);
      }
    } catch (error) {
      setExported(`Export failed: ${String(error)}`);
      setTimeout(() => setExported(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Time tracking analytics and insights</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['today', 'week', 'all', 'range'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                period === p
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {p === 'range' ? 'Date Range' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {period === 'range' && (
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white" />
            <span className="text-gray-400">→</span>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white" />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Time"
          value={period === 'range' ? formatDuration(rangeTotal) : (report?.total_formatted || '0s')}
          icon={Clock}
          color="text-blue-500 bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          label="Tasks Worked"
          value={rows.length}
          icon={CheckSquare}
          color="text-green-500 bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label="Projects Active"
          value={new Set(rows.map(e => e.project)).size}
          icon={BarChart3}
          color="text-purple-500 bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Time Entries Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Time Entries ({period === 'range' && rangeFrom && rangeTo ? `${rangeFrom} → ${rangeTo}` : period})
          </h2>
          <div className="flex items-center gap-3">
            {exported && <span className="text-xs text-green-600 dark:text-green-400 truncate max-w-[220px]">{exported}</span>}
            <button onClick={exportCsv} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Task</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading && period !== 'range' ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No time entries for this period</td></tr>
              ) : (
                rows.map((entry) => (
                  <tr key={entry.project + entry.task} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{entry.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{entry.project}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{entry.task}</td>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 dark:text-white">{entry.duration}</td>
                    <td className="px-6 py-4">
                      {period === 'range' ? null : (
                        <button
                          onClick={async () => {
                            try {
                              const entries: TimeEntry[] = await api.timeEntries.list(period);
                              const match = entries.find((e: TimeEntry) => e.project_name === entry.project && e.task_title === entry.task);
                              if (match) setEditingEntry({ id: match.id, duration: String(match.duration_seconds), description: match.description ?? '' });
                            } catch { /* ignore */ }
                          }}
                          className="p-1 text-gray-400 hover:text-purple-600"
                          aria-label="Edit entry"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily breakdown chart */}
      {period === 'range' && rangeFiltered && rangeFiltered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Daily Breakdown</h2>
          </div>
          <div className="p-6">
            {(() => {
              const byDay = new Map<string, number>();
              for (const e of rangeFiltered) {
                const day = new Date(Number(e.start_time) * 1000).toISOString().slice(0, 10);
                byDay.set(day, (byDay.get(day) ?? 0) + (e.duration_seconds ?? 0));
              }
              const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
              const max = Math.max(...sorted.map(([, s]) => s), 1);
              return (
                <div className="flex items-end gap-2 h-40 overflow-x-auto">
                  {sorted.map(([day, seconds]) => (
                    <div key={day} className="flex flex-col items-center gap-1.5 min-w-[48px] flex-1">
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{formatDuration(seconds)}</span>
                      <div
                        className="w-full bg-purple-500 rounded-t transition-all duration-500"
                        style={{ height: `${Math.max((seconds / max) * 100, 3)}%` }}
                        title={`${day}: ${formatDuration(seconds)}`}
                      />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit entry dialog */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Time Entry</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const seconds = parseInt(editingEntry.duration, 10);
              if (isNaN(seconds) || seconds < 0) return;
              await updateEntry.mutateAsync({ id: editingEntry.id, data: { duration_seconds: seconds, description: editingEntry.description } });
              setEditingEntry(null);
            }} className="space-y-4">
              <div>
                <label htmlFor="entry-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (seconds)
                </label>
                <input
                  id="entry-duration"
                  type="number"
                  min="0"
                  value={editingEntry.duration}
                  onChange={(e) => setEditingEntry({ ...editingEntry, duration: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="entry-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  id="entry-desc"
                  type="text"
                  value={editingEntry.description}
                  onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="What was worked on"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingEntry(null)} className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary by Project */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Time by Project</h2>
        </div>
        <div className="p-6 space-y-4">
          {(() => {
            const byProject = new Map<string, number>();
            for (const e of report?.entries ?? []) {
              byProject.set(e.project, (byProject.get(e.project) ?? 0) + e.duration_seconds);
            }
            const sorted = [...byProject.entries()].sort((a, b) => b[1] - a[1]);
            const max = sorted[0]?.[1] ?? 0;
            if (!sorted.length) {
              return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data for this period</p>;
            }
            return sorted.map(([project, seconds]) => (
              <div key={project}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{project}</span>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{formatDuration(seconds)}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: max > 0 ? `${Math.max((seconds / max) * 100, 2)}%` : '0%' }}
                  />
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg', color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

