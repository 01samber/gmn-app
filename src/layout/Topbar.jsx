import { Menu, Moon, Sun, Bell, Search, AlertTriangle, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const WO_STORAGE_KEY = "gmn_workorders_v1";

function safeParse(raw, fallback) {
  try {
    const v = raw ? JSON.parse(raw) : fallback;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadWorkOrders() {
  const parsed = safeParse(localStorage.getItem(WO_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function countEtaBuckets(rows) {
  const now = new Date();
  let overdue = 0;
  let today = 0;

  for (const r of rows) {
    if (!r) continue;

    const active = r.status === "waiting" || r.status === "in_progress";
    if (!active) continue;

    if (!r.etaAt) continue;

    const d = new Date(r.etaAt);
    if (Number.isNaN(d.getTime())) continue;

    if (d.getTime() < now.getTime()) overdue += 1;
    else if (sameLocalDay(d, now)) today += 1;
  }

  return { overdue, today };
}

/**
 * Topbar (Hardened + Ops aware)
 * - Stable theme application (DOM + localStorage)
 * - Sync theme across tabs
 * - Route title matching (supports /workorders + /work-orders)
 * - Quick actions include Calendar + ETA alerts
 * - Click-outside closes quick actions
 */
export default function Topbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [dark, setDark] = useState(false);
  const [openQuick, setOpenQuick] = useState(false);

  // refresh ETA counts when tab refocuses (other pages may edit localStorage)
  const [focusKey, setFocusKey] = useState(0);
  useEffect(() => {
    const onFocus = () => setFocusKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const pageTitle = useMemo(() => {
    const path = location.pathname;

    if (path === "/" || path === "/dashboard") return "Dashboard";

    // support both spellings (stop breaking navigation)
    if (path.startsWith("/workorders") || path.startsWith("/work-orders")) return "Work Orders";

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

  // Init theme correctly (localStorage -> DOM)
  useEffect(() => {
    const stored = localStorage.getItem("gmn_theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
      return;
    }
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
      setDark(false);
      return;
    }
    // fallback: honor existing DOM state if storage empty
    setDark(document.documentElement.classList.contains("dark"));
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

  // Close quick actions on navigation
  useEffect(() => {
    setOpenQuick(false);
  }, [location.pathname]);

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

  // ETA alerts for topbar badge
  const etaCounts = useMemo(() => {
    const rows = loadWorkOrders();
    return countEtaBuckets(rows);
  }, [focusKey]);

  const hasNotifications = false; // still mock (fine)

  const quickRef = useRef(null);

  // Click-outside closes quick actions (required, otherwise it feels cheap)
  useEffect(() => {
    if (!openQuick) return;

    function onMouseDown(e) {
      const el = quickRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setOpenQuick(false);
    }

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [openQuick]);

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

            <div className="flex items-center gap-2 min-w-0">
              <div className="text-lg font-bold tracking-tight truncate">{pageTitle}</div>

              {/* ETA alerts */}
              {etaCounts.overdue > 0 ? (
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 px-2.5 py-1 text-[11px] font-semibold dark:bg-rose-900/25 dark:text-rose-200 dark:ring-rose-900/40 ui-hover ui-focus"
                  title="Overdue active work orders (click to open Calendar)"
                  onClick={() => navigate("/calendar", { state: { bucket: "overdue" } })}
                >
                  <AlertTriangle size={12} />
                  Overdue {etaCounts.overdue}
                </button>
              ) : null}

              {etaCounts.today > 0 ? (
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 px-2.5 py-1 text-[11px] font-semibold dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40 ui-hover ui-focus"
                  title="Today’s active work orders (click to open Calendar)"
                  onClick={() => navigate("/calendar", { state: { bucket: "today" } })}
                >
                  <CalendarDays size={12} />
                  Today {etaCounts.today}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="relative flex items-center gap-2" ref={quickRef}>
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
              className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
              role="dialog"
              aria-label="Quick actions menu"
            >
              <div className="px-3 py-2 text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                QUICK ACTIONS
              </div>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => navigate("/workorders")}
              >
                Go to Work Orders
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => navigate("/calendar")}
              >
                Go to Calendar (Ops Board)
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => navigate("/calendar", { state: { bucket: "overdue" } })}
                disabled={etaCounts.overdue === 0}
              >
                View Overdue{" "}
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {etaCounts.overdue}
                </span>
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => navigate("/calendar", { state: { bucket: "today" } })}
                disabled={etaCounts.today === 0}
              >
                View Today{" "}
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {etaCounts.today}
                </span>
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => navigate("/proposals")}
              >
                Go to Proposals
              </button>

              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => navigate("/costs")}
              >
                Go to Costs
              </button>

              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                Tip: Ctrl/Cmd + D toggles theme • Ctrl/Cmd + K opens this menu
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
