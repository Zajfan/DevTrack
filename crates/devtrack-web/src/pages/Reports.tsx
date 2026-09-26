import { useTimeReport } from '@hooks/useApi';
import { useState } from 'react';
import { cn, formatDuration } from '@utils/helpers';
import { Calendar, Download, BarChart3, TrendingUp, Clock, CheckSquare } from 'lucide-react';

export function Reports() {
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('today');
  const { data: report, isLoading } = useTimeReport(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Time tracking analytics and insights</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {['today', 'week', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as 'today' | 'week' | 'all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                period === p
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Time"
          value={report?.total_formatted || '0s'}
          icon={Clock}
          color="text-blue-500 bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          label="Tasks Worked"
          value={report?.entries.length || 0}
          icon={CheckSquare}
          color="text-green-500 bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label="Projects Active"
          value={new Set(report?.entries.map(e => e.project) || []).size}
          icon={BarChart3}
          color="text-purple-500 bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Time Entries Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Time Entries ({period})</h2>
          <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Task</th>
                <th className="px-6 py-3 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : report?.entries.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No time entries for this period</td></tr>
              ) : (
                report?.entries.map((entry) => (
                  <tr key={entry.project + entry.task + entry.duration} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{entry.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{entry.project}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{entry.task}</td>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 dark:text-white">{entry.duration}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

