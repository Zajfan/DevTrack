import { WorkspaceWorkStatus } from '../components/WorkspaceWorkPanel';
import {
  useDashboardSummary,
  useTimeEntries,
  usePrioritisedProjects,
} from "@hooks/useApi";
import { formatDuration, formatTimestamp } from "@utils/helpers";
import {
  FolderGit2,
  CheckSquare,
  Clock,
  ArrowUpRight,
  Timer,
  AlertTriangle,
  Plus,
  ArrowRight,
  Circle,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "@store/appStore";
import { useNavigate } from "react-router-dom";
import { useWorkspaceWork } from '../hooks/useWorkspaceWork';

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never opened';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export function Dashboard() {
  const { data: summary, isLoading, error } = useDashboardSummary();
  const { data: timeEntries } = useTimeEntries("today");
  const { data: prioritised } = usePrioritisedProjects();
  const work = useWorkspaceWork();
  const tasks = work.items;
  const setSelectedProject = useAppStore((state) => state.setSelectedProject);
  const navigate = useNavigate();
  const openTasks = tasks?.filter((t) => t.status === "Todo") ?? [];
  const overdue = openTasks.filter(
    (t) =>
      t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()),
  );
  const secondsToday =
    timeEntries?.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) ?? 0;
  const stats = [
    {
      label: "Projects",
      value: summary?.total_projects ?? 0,
      detail: `${summary?.active_projects ?? 0} active in your workspace`,
      icon: FolderGit2,
      path: "/projects",
    },
    {
      label: "Open tasks",
      value: openTasks.length,
      detail: overdue.length
        ? `${overdue.length} overdue`
        : `${work.summary.localOpen} local · ${work.summary.githubOpen} GitHub`,
      icon: CheckSquare,
      path: "/all-tasks",
    },
    {
      label: "Completed",
      value: work.summary.completed,
      detail: `${work.summary.localCompleted} local tasks · ${work.summary.commitCompleted} loaded meaningful commits`,
      icon: CheckSquare,
      path: "/all-tasks",
    },
    {
      label: "Tracked today",
      value: formatDuration(secondsToday),
      detail: "Time spent on focused work",
      icon: Clock,
      path: "/reports",
    },
  ];
  const openProject = (id: number) => {
    setSelectedProject(id);
    navigate(`/projects/${id}`);
  };
  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, AT A GLANCE</div>
          <h1>Overview</h1>
          <p>A little clarity for your next stretch of work.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => navigate("/projects?new=1")}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>
      <WorkspaceWorkStatus work={work} />
      {error && (
        <div role="alert" className="dashboard-alert">
          <AlertCircle size={16} />
          Could not load the workspace. {String(error)}
        </div>
      )}
      {overdue.length > 0 && (
        <button
          className="dashboard-alert"
          onClick={() => navigate("/all-tasks")}
        >
          <AlertCircle size={16} />
          {overdue.length} overdue{" "}
          {overdue.length === 1 ? "task needs" : "tasks need"} your attention.
          <ArrowRight size={15} />
        </button>
      )}
      <div className="overview-stats">
        {stats.map(({ label, value, detail, icon: Icon, path }) => (
          <button
            key={label}
            className="overview-stat"
            onClick={() => navigate(path)}
          >
            <div className="stat-label">
              {label}
              <Icon size={16} />
            </div>
            <div className="stat-value">{label === "Open tasks" || label === "Completed" ? (work.isLoading ? "—" : value) : (isLoading ? "—" : value)}</div>
            <div className="stat-detail">{detail}</div>
          </button>
        ))}
      </div>
      <div className="overview-columns">
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>Jump back in</h2>
            <button
              className="text-action"
              onClick={() => navigate("/projects")}
            >
              All projects
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="project-list">
            {prioritised?.length ? (
              prioritised.map((p) => (
                <button
                  key={p.id}
                  className="project-list-row"
                  onClick={() => openProject(p.id)}
                >
                  <span className="project-monogram">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="project-list-info">
                    <strong>{p.name}</strong>
                    <small>{relativeTime(p.last_accessed)}</small>
                  </span>
                  <span className="project-task-counts">
                    {p.overdue_tasks > 0 && (
                      <span className="task-count overdue" title={`${p.overdue_tasks} overdue`}>
                        <AlertTriangle size={11} />{p.overdue_tasks}
                      </span>
                    )}
                    {p.open_tasks > 0 && (
                      <span className="task-count open" title={`${p.open_tasks} open tasks`}>
                        <CheckSquare size={11} />{p.open_tasks}
                      </span>
                    )}
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))
            ) : (
              <div className="panel-empty">
                <FolderGit2 size={25} />
                <h3>Your next project starts here</h3>
                <p>Add a folder to keep tasks, notes, and time together.</p>
                <button
                  className="secondary-button"
                  onClick={() => navigate("/projects?new=1")}
                >
                  <Plus size={14} />
                  Add project
                </button>
              </div>
            )}
          </div>
          <button
            className="panel-footer-action"
            onClick={() => navigate("/projects?new=1")}
          >
            <Plus size={14} />
            Add a project to your workspace
          </button>
        </section>
        <section className="workspace-panel focus-panel">
          <div className="panel-heading">
            <h2>Focus session</h2>
            <Timer size={17} />
          </div>
          <div className="focus-content">
            <span
              className={`focus-status ${summary?.active_timer ? "running" : ""}`}
            >
              <span />
              {summary?.active_timer ? "Timer running" : "Ready when you are"}
            </span>
            <div className="focus-time">
              {summary?.active_timer?.elapsed_formatted ?? "00:00:00"}
            </div>
            <p>
              {summary?.active_timer
                ? `Tracking task #${summary.active_timer.task_id}`
                : "Pick a task. Start a timer. Make progress."}
            </p>
            <button
              className="primary-button"
              onClick={() => navigate("/timer")}
            >
              <Timer size={15} />
              {summary?.active_timer ? "Manage session" : "Start a session"}
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="focus-footer">
            <Clock size={14} />
            <span>Today’s focused time</span>
            <strong>{formatDuration(secondsToday)}</strong>
          </div>
        </section>
      </div>
      <div className="overview-columns">
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>
              Up next<span className="count-badge">{openTasks.length}</span>
            </h2>
            <button
              className="text-action"
              onClick={() => navigate("/all-tasks")}
            >
              All tasks
              <ArrowUpRight size={14} />
            </button>
          </div>
          {openTasks.length ? (
            openTasks.slice(0, 5).map((task) => (
              <button
                key={task.work_key}
                className="next-task"
                onClick={() => {
                  setSelectedProject(task.project_id);
                  navigate(`/projects/${task.project_id}?tab=planned`);
                }}
              >
                <Circle size={16} />
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.project_name ?? "Project task"}</small>
                </span>
                <span
                  className={`task-priority ${task.priority.toLowerCase()}`}
                >
                  {task.priority}
                </span>
              </button>
            ))
          ) : (
            <div className="quiet-empty">
              <CheckSquare size={20} />
              <div>
                <strong>A clear task list</strong>
                <p>Add a task to plan your next step.</p>
              </div>
              <button
                className="text-action"
                onClick={() => navigate("/tasks")}
              >
                Open tasks
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <button
              className="text-action"
              onClick={() => navigate("/reports")}
            >
              Reports
              <ArrowUpRight size={14} />
            </button>
          </div>
          {timeEntries?.length ? (
            timeEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="activity-row">
                <Clock size={16} />
                <div>
                  <strong>{entry.task_title ?? "Focus session"}</strong>
                  <small>
                    {entry.project_name} ·{" "}
                    {formatTimestamp(Number(entry.start_time))}
                  </small>
                </div>
                <span>{formatDuration(entry.duration_seconds)}</span>
              </div>
            ))
          ) : (
            <div className="quiet-empty">
              <Clock size={20} />
              <div>
                <strong>Your work, recorded</strong>
                <p>Completed sessions will appear here.</p>
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="workspace-footnote">
        <span className="status-dot active" />
        Local-first. Everything in your workspace stays on this device.
        <span>
          Find projects with <kbd>Ctrl K</kbd>
        </span>
      </div>
    </div>
  );
}
