import { Menu, Moon, Sun, Bell, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Topbar (Hardened)
 * - Stable theme application (DOM + localStorage)
 * - Sync theme across tabs
 * - Nested route title matching
 * - Optional keyboard shortcuts
 * - Optional quick actions menu
 */
export default function Topbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [dark, setDark] = useState(false);

  // Quick actions popover
  const [openQuick, setOpenQuick] = useState(false);

  const pageTitle = useMemo(() => {
    const path = location.pathname;

    // nested route friendly matching
    if (path === "/") return "Dashboard";
    if (path.startsWith("/work-orders")) return "Work Orders";
    if (path.startsWith("/technicians")) return "Technicians";
    if (path.startsWith("/costs")) return "Costs";
    if (path.startsWith("/proposals")) return "Proposals";
    if (path.startsWith("/files")) return "Files";
    if (path.startsWith("/calendar")) return "Calendar";

    return "GMN App";
  }, [location.pathname]);

  const applyTheme = useCallback((mode) => {
    const isDark = mode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("gmn_theme", isDark ? "dark" : "light");
    setDark(isDark);
  }, []);

  // Init theme safely (storage + DOM)
  useEffect(() => {
    const saved = localStorage.getItem("gmn_theme");
    const domHasDark = document.documentElement.classList.contains("dark");

    if (saved === "dark" || (!saved && domHasDark)) applyTheme("dark");
    else applyTheme("light");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme across tabs/windows
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== "gmn_theme") return;
      const v = e.newValue === "dark" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", v === "dark");
      setDark(v === "dark");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleTheme() {
    applyTheme(dark ? "light" : "dark");
  }

  // Optional keyboard shortcuts (safe + non-invasive)
  useEffect(() => {
    function onKeyDown(e) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + D -> toggle theme
      if (mod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Ctrl/Cmd + K -> quick actions
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpenQuick(true);
        return;
      }

      // ESC closes quick actions
      if (e.key === "Escape") {
        setOpenQuick(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  const hasNotifications = false; // mock for now (safe default)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: menu + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="lg:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 ui-hover ui-focus"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            type="button"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Global Maintenance Network
            </div>
            <div className="text-lg font-bold tracking-tight truncate">
              {pageTitle}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="relative flex items-center gap-2">
          {/* Quick actions */}
          <button
            type="button"
            onClick={() => setOpenQuick((v) => !v)}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
            aria-label="Quick actions"
            title="Quick actions (Ctrl/Cmd + K)"
          >
            <Search size={16} />
            <span className="hidden md:inline">Quick</span>
          </button>

          {openQuick ? (
            <div
              className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
              role="dialog"
              aria-label="Quick actions menu"
            >
              <div className="px-3 py-2 text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                QUICK ACTIONS
              </div>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => {
                  setOpenQuick(false);
                  navigate("/work-orders");
                }}
              >
                Go to Work Orders
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => {
                  setOpenQuick(false);
                  navigate("/proposals");
                }}
              >
                Go to Proposals
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => {
                  setOpenQuick(false);
                  navigate("/costs");
                }}
              >
                Go to Costs
              </button>

              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                Tip: Ctrl/Cmd + D toggles theme
              </div>
            </div>
          ) : null}

          {/* Notifications (safe mock) */}
          <button
            type="button"
            className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 ui-hover ui-focus"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => alert("Notifications coming soon")}
          >
            <Bell size={18} />
            {hasNotifications ? (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand-600" />
            ) : null}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
            aria-label="Toggle theme"
            title="Toggle theme (Ctrl/Cmd + D)"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
