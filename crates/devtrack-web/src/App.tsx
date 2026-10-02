import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Tasks } from "./pages/Tasks";
import { TimerPage } from "./pages/Timer";
import { Reports } from "./pages/Reports";
import { Notes } from "./pages/Notes";
import { GlobalTasks } from "./pages/GlobalTasks";
import { Settings } from "./pages/Settings";
import { useSystemTray } from "./components/SystemTray";
import { useGlobalShortcuts } from "./components/GlobalShortcuts";
import { usePlatform } from "./hooks/usePlatform";
import {
  useShortcutHelp,
  ShortcutHelpOverlay,
} from "./components/ShortcutHelp";
import { useSettingsStore } from "./store/settingsStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SECTIONS = [
  "dashboard",
  "projects",
  "tasks",
  "notes",
  "timer",
  "reports",
  "settings",
];

function MenuAndKeyboardNav() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await listen<string>("menu-action", (event) => {
        const target = event.payload;
        if (SECTIONS.includes(target)) {
          navigate(target === "dashboard" ? "/" : `/${target}`);
        } else if (target === "new-project") {
          navigate("/projects?new=1");
        } else if (target === "backup") {
          navigate("/settings");
        }
      });
    };
    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [navigate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key >= "1" && key <= "7") {
        e.preventDefault();
        const section = SECTIONS[parseInt(key, 10) - 1];
        navigate(section === "dashboard" ? "/" : `/${section}`);
      } else if (key === ",") {
        e.preventDefault();
        navigate("/settings");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return null;
}

function TimerEventListener() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen("timer_update", () => {
        queryClient.invalidateQueries({ queryKey: ["active-timer"] });
        queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return null;
}

function App() {
  usePlatform();
  const { helpOpen, setHelpOpen } = useShortcutHelp();
  const { theme, compactMode } = useSettingsStore();
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches),
      );
      document.documentElement.classList.toggle("compact", compactMode);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, compactMode]);
  useSystemTray();
  useGlobalShortcuts();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TimerEventListener />
        <MenuAndKeyboardNav />
        <ShortcutHelpOverlay
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
        />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="all-tasks" element={<GlobalTasks />} />
            <Route path="notes" element={<Notes />} />
            <Route path="timer" element={<TimerPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        {import.meta.env.DEV && !isTauri() && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
