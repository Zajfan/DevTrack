import { Outlet } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@utils/helpers";
import { useAppStore } from "@store/appStore";

export function Layout() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  return (
    <div
      className={cn(
        "app-shell",
        sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed",
      )}
      onContextMenu={(e) => {
        if (
          isTauri() &&
          !(e.target as HTMLElement).closest(
            'input, textarea, [contenteditable="true"]',
          )
        )
          e.preventDefault();
      }}
    >
      <Sidebar />
      <div className="app-workspace">
        <Header />
        <main className="app-main">
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
