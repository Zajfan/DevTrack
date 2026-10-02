import { NavLink } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@store/appStore";
import { cn } from "@utils/helpers";
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  Globe,
  StickyNote,
  Timer,
  BarChart3,
  Settings,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard, shortcut: "1" },
  { path: "/projects", label: "Projects", icon: FolderGit2, shortcut: "2" },
  { path: "/tasks", label: "Project tasks", icon: CheckSquare, shortcut: "3" },
  { path: "/all-tasks", label: "All tasks", icon: Globe, shortcut: "" },
  { path: "/notes", label: "Notes", icon: StickyNote, shortcut: "4" },
  { path: "/timer", label: "Time tracker", icon: Timer, shortcut: "5" },
  { path: "/reports", label: "Reports", icon: BarChart3, shortcut: "6" },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  useEffect(() => {
    if (window.innerWidth < 900) setSidebarOpen(false);
  }, [setSidebarOpen]);
  return (
    <aside
      className={cn("app-sidebar", sidebarOpen ? "expanded" : "collapsed")}
    >
      <div className="sidebar-brand">
        <NavLink to="/" className="brand-link" aria-label="DevTrack overview">
          <span className="brand-mark">
            <GitBranch size={18} />
          </span>
          {sidebarOpen && <span>DevTrack</span>}
        </NavLink>
        {sidebarOpen && (
          <button
            className="icon-button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
      {!sidebarOpen && (
        <button
          className="icon-button sidebar-expand"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
      <div className="sidebar-section">{sidebarOpen ? "WORKSPACE" : ""}</div>
      <nav aria-label="Main navigation">
        {navItems.map(({ path, label, icon: Icon, shortcut }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            title={sidebarOpen ? undefined : label}
            className={({ isActive }) =>
              cn("sidebar-link", isActive && "active")
            }
          >
            <Icon size={17} />
            {sidebarOpen && (
              <>
                <span>{label}</span>
                {shortcut && <kbd>{shortcut}</kbd>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <NavLink
          to="/projects?new=1"
          className="sidebar-add"
          title="Add project"
        >
          <Plus size={16} />
          {sidebarOpen && "Add project"}
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => cn("sidebar-link", isActive && "active")}
          title="Settings"
        >
          <Settings size={17} />
          {sidebarOpen && (
            <>
              <span>Settings</span>
              <kbd>7</kbd>
            </>
          )}
        </NavLink>
        {sidebarOpen && (
          <div className="local-status">
            <span />
            Local workspace{" "}
            <span className="local-status-detail">Your data stays here</span>
          </div>
        )}
      </div>
    </aside>
  );
}
