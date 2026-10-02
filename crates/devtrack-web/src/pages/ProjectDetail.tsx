import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckSquare,
  Code2,
  FileText,
  FolderOpen,
  GitBranch,
  Loader2,
  TerminalSquare,
} from "lucide-react";
import { useProject, useProjectStats } from "@hooks/useApi";
import { api } from "@api/client";
import { useAppStore } from "@store/appStore";
import { formatDuration } from "@utils/helpers";
import { Tasks } from "./Tasks";
import { ProjectFiles } from "../components/ProjectFiles";
import { ProjectWork } from "../components/ProjectWork";
import { openProjectGitHub } from "../hooks/useRepository";

export function ProjectDetail() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const { data: project, isLoading, error } = useProject(validId ? id : null);
  const { data: stats } = useProjectStats(validId ? id : 0);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "work" ? "work" : params.get("tab") === "planned" ? "planned" : "files";
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const select = useAppStore((state) => state.setSelectedProject);
  useEffect(() => {
    if (project) select(project.id);
  }, [project, select]);
  const action = async (run: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await run();
    } catch (e) {
      setActionError(String(e));
    }
  };
  if (!validId || error)
    return (
      <div className="detail-error" role="alert">
        <h1>Project unavailable</h1>
        <p>{String(error ?? "Invalid project link")}</p>
        <button
          className="secondary-button"
          onClick={() => navigate("/projects")}
        >
          Back to projects
        </button>
      </div>
    );
  if (isLoading || !project)
    return (
      <div className="repo-loading">
        <Loader2 size={18} className="animate-spin" />
        Loading project…
      </div>
    );
  return (
    <div className="project-detail">
      <button
        className="text-action back-link"
        onClick={() => navigate("/projects")}
      >
        <ArrowLeft size={14} />
        All projects
      </button>
      <div className="detail-heading">
        <div>
          <div className="detail-title">
            <span className="project-monogram">
              {project.name.slice(0, 2).toUpperCase()}
            </span>
            <h1>{project.name}</h1>
            <span className={`detail-status ${project.status.toLowerCase()}`}>
              {project.status}
            </span>
          </div>
          <p title={project.path}>{project.path}</p>
        </div>
        <div className="detail-actions">
          <button
            className="secondary-button"
            onClick={() => action(() => api.projects.openPath(id))}
          >
            <FolderOpen size={15} />
            Open folder
          </button>
          <button
            className="secondary-button"
            onClick={() => action(() => api.projects.openTerminal(id))}
          >
            <TerminalSquare size={15} />
            Terminal
          </button>
        </div>
      </div>
      {actionError && (
        <p className="repo-notice" role="alert">
          {actionError}
        </p>
      )}
      <div className="detail-layout">
        <div className="detail-main">
          <nav className="detail-tabs" aria-label="Project views">
            <button
              aria-current={tab === "files" ? "page" : undefined}
              className={tab === "files" ? "active" : ""}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("tab");
                setParams(next);
              }}
            >
              <Code2 size={16} />
              Files & README
            </button>
            <button
              aria-current={tab === "work" ? "page" : undefined}
              className={tab === "work" ? "active" : ""}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("tab", "work");
                setParams(next);
              }}
            >
              <CheckSquare size={16} />
              Completed work
            </button>
            <button aria-current={tab === "planned" ? "page" : undefined} className={tab === "planned" ? "active" : ""} onClick={() => { const next = new URLSearchParams(params); next.set("tab", "planned"); setParams(next); }}><CheckSquare size={16} />Planned work</button>
          </nav>
          {tab === "files" ? <ProjectFiles id={id} /> : tab === "work" ? <ProjectWork id={id} /> : <Tasks embedded />}
        </div>
        <aside className="project-about">
          <h2>About this project</h2>
          <p>
            Your local files, documentation, and development history in one
            workspace.
          </p>
          <div className="about-item">
            <GitBranch size={14} />
            <span>{project.git?.branch ?? "Local folder"}</span>
            {project.git?.is_dirty && (
              <span
                className="dirty-indicator"
                title="Uncommitted local changes"
              >
                Modified
              </span>
            )}
          </div>
          <div className="about-item">
            <CheckSquare size={14} />
            <span>{stats?.open_tasks ?? "—"} open tasks</span>
          </div>
          <div className="about-time">
            {stats ? formatDuration(stats.total_seconds) : "—"}
            <small>tracked across this project</small>
          </div>
          {project.tags && (
            <div className="about-tags">
              {project.tags
                .split(",")
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag}>{tag.trim()}</span>
                ))}
            </div>
          )}
          <button className="about-link" onClick={() => navigate("/tasks")}>
            <CheckSquare size={14} />
            Manage tasks
            <ArrowUpRight size={14} />
          </button>
          <button className="about-link" onClick={() => navigate("/notes")}>
            <FileText size={14} />
            Project notes
            <ArrowUpRight size={14} />
          </button>
          <button
            className="about-link"
            onClick={() => action(() => openProjectGitHub(id))}
          >
            <GitBranch size={14} />
            Open GitHub repository
            <ArrowUpRight size={14} />
          </button>
          <p className="about-footnote">
            Files reflect your local working folder. Completed work uses GitHub
            history, with local Git as an offline fallback.
          </p>
        </aside>
      </div>
    </div>
  );
}
