import { Menu, Moon, Sun, Bell, Search, AlertTriangle, CalendarDays, Command, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const WO_STORAGE_KEY = "gmn_workorders_v1";

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) ?? fallback : fallback; } catch { return fallback; }
}

function loadWorkOrders() {
  const parsed = safeParse(localStorage.getItem(WO_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function countEtaBuckets(rows) {
  const now = new Date();
  let overdue = 0, today = 0;
  for (const r of rows) {
    if (!r) continue;
    const active = r.status === "waiting" || r.status === "in_progress";
    if (!active || !r.etaAt) continue;
    const d = new Date(r.etaAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getTime() < now.getTime()) overdue += 1;
    else if (sameLocalDay(d, now)) today += 1;
  }
  return { overdue, today };
}

export default function Topbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [openQuick, setOpenQuick] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const quickRef = useRef(null);

  useEffect(() => {
    const onFocus = () => setFocusKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "Dashboard";
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

  useEffect(() => {
    const stored = localStorage.getItem("gmn_theme");
    if (stored === "dark") { document.documentElement.classList.add("dark"); setDark(true); }
    else if (stored === "light") { document.documentElement.classList.remove("dark"); setDark(false); }
    else setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function onStorage(e) {
      if (e.key !== "gmn_theme") return;
      const isDark = e.newValue === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      setDark(isDark);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => { setOpenQuick(false); }, [location.pathname]);

  useEffect(() => {
    function onKeyDown(e) {
      const mod = navigator.platform.toLowerCase().includes("mac") ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === "d" || e.key === "D")) { e.preventDefault(); applyTheme(dark ? "light" : "dark"); }
      if (mod && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpenQuick(true); }
      if (e.key === "Escape") setOpenQuick(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dark, applyTheme]);

  useEffect(() => {
    if (!openQuick) return;
    function onMouseDown(e) {
      if (quickRef.current && !quickRef.current.contains(e.target)) setOpenQuick(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [openQuick]);

  const etaCounts = useMemo(() => countEtaBuckets(loadWorkOrders()), [focusKey]);
  const hasNotifications = etaCounts.overdue > 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-2xl dark:border-slate-700/50 dark:bg-slate-900/80 shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
      
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <button
            className="lg:hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 ui-hover"
            onClick={onOpenSidebar}
            type="button"
          >
            <Menu size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
              <Sparkles size={12} className="text-brand-500" />
              Global Maintenance Network
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-xl font-bold tracking-tight gradient-text">{pageTitle}</h1>

              {etaCounts.overdue > 0 && (
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-1 ring-rose-200/80 px-3 py-1.5 text-[11px] font-bold dark:from-rose-900/30 dark:to-red-900/30 dark:text-rose-200 dark:ring-rose-700/50 ui-hover transition-all duration-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                  onClick={() => navigate("/calendar", { state: { bucket: "overdue" } })}
                >
                  <AlertTriangle size={12} />Overdue {etaCounts.overdue}
                </button>
              )}

              {etaCounts.today > 0 && (
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 ring-1 ring-amber-200/80 px-3 py-1.5 text-[11px] font-bold dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-200 dark:ring-amber-700/50 ui-hover transition-all duration-300 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                  onClick={() => navigate("/calendar", { state: { bucket: "today" } })}
                >
                  <CalendarDays size={12} />Today {etaCounts.today}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2" ref={quickRef}>
          <button
            type="button"
            onClick={() => setOpenQuick((v) => !v)}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-3.5 py-2 text-sm font-medium hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-300 ui-hover tap-feedback"
          >
            <Search size={16} className="text-slate-400" />
            <span className="hidden md:inline text-slate-600 dark:text-slate-300">Quick</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md bg-slate-100/80 dark:bg-slate-700/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <Command size={10} />K
            </kbd>
          </button>

          {openQuick && (
            <div className="absolute right-0 top-14 w-80 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-2xl dark:border-slate-700/80 dark:bg-slate-900/95 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-50/50 to-transparent dark:from-brand-900/20">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-brand-500" />
                  <span className="text-xs font-bold tracking-[0.15em] text-slate-600 dark:text-slate-300 uppercase">Quick Actions</span>
                </div>
              </div>
              <div className="py-2">
                {[
                  { label: "Work Orders", path: "/work-orders", icon: "📋" },
                  { label: "Calendar", path: "/calendar", icon: "📅" },
                  { label: "Overdue", path: "/calendar", state: { bucket: "overdue" }, count: etaCounts.overdue, icon: "⚠️", disabled: !etaCounts.overdue },
                  { label: "Today", path: "/calendar", state: { bucket: "today" }, count: etaCounts.today, icon: "📆", disabled: !etaCounts.today },
                  { label: "Proposals", path: "/proposals", icon: "📄" },
                  { label: "Costs", path: "/costs", icon: "💰" },
                ].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3"
                    onClick={() => { navigate(item.path, item.state ? { state: item.state } : undefined); setOpenQuick(false); }}
                    disabled={item.disabled}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.count !== undefined && <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{item.count}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="relative rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 ui-hover"
            onClick={() => alert("Notifications coming soon")}
          >
            <Bell size={18} className="text-slate-500 dark:text-slate-400" />
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => applyTheme(dark ? "light" : "dark")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-3.5 py-2 text-sm font-medium hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-300 ui-hover tap-feedback"
          >
            <div className="relative w-5 h-5">
              <Sun size={18} className={`absolute inset-0 transition-all duration-300 ${dark ? 'opacity-100 rotate-0 text-amber-500' : 'opacity-0 -rotate-90'}`} />
              <Moon size={18} className={`absolute inset-0 transition-all duration-300 ${dark ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0 text-slate-600'}`} />
            </div>
            <span className="hidden sm:inline text-slate-600 dark:text-slate-300">{dark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
