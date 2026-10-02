import { useAppStore } from "@store/appStore";
import { useProjects } from "@hooks/useApi";
import { Search, GitBranch, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const labels: Record<string, string> = {
  "/": "Overview",
  "/projects": "Projects",
  "/tasks": "Project tasks",
  "/all-tasks": "All tasks",
  "/notes": "Notes",
  "/timer": "Time tracker",
  "/reports": "Reports",
  "/settings": "Settings",
};
export function Header() {
  const { setSelectedProject } = useAppStore();
  const { data: projects } = useProjects(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const query = searchQuery.trim().toLowerCase();
  const matches = query
    ? (projects ?? [])
        .filter((p) => `${p.name} ${p.tags}`.toLowerCase().includes(query))
        .slice(0, 6)
    : [];
  const goProject = (id: number) => {
    setSelectedProject(id);
    navigate(`/projects/${id}`);
    setSearchQuery("");
  };
  return (
    <header className="app-header">
      <div className="header-breadcrumb">
        Workspace <span>/</span>{" "}
        <strong>{labels[location.pathname] ?? (location.pathname.startsWith("/projects/") ? "Project workspace" : "Overview")}</strong>
      </div>
      <div className="header-search">
        <Search size={15} />
        <input
          ref={searchRef}
          aria-label="Search workspace"
          placeholder="Find a project…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length) goProject(matches[0].id);
            if (e.key === "Escape") setSearchQuery("");
          }}
        />
        {query ? (
          <button
            onClick={() => setSearchQuery("")}
            className="icon-button"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        ) : (
          <kbd>⌘ / Ctrl K</kbd>
        )}
        {query && (
          <div className="search-results">
            {matches.length ? (
              matches.map((p) => (
                <button key={p.id} onClick={() => goProject(p.id)}>
                  <GitBranch size={15} />
                  <span>{p.name}</span>
                  <small>{p.tags}</small>
                </button>
              ))
            ) : (
              <p>No matching projects</p>
            )}
          </div>
        )}
      </div>
      <button
        className="icon-button"
        onClick={() => navigate("/settings")}
        aria-label="Open settings"
        title="Settings"
      >
        <Settings size={17} />
      </button>
    </header>
  );
}
