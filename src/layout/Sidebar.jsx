import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  DollarSign,
  FileText,
  Folder,
  CalendarDays,
  X,
  LogOut,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Calculator,
  BarChart3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authApi } from "../api";

const WO_STORAGE_KEY = "gmn_workorders_v1";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/work-orders", aliases: ["/workorders"], label: "Work Orders", icon: ClipboardList },
  { to: "/technicians", label: "Technicians", icon: Users },
  { to: "/costs", label: "Costs", icon: DollarSign },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/files", label: "Files", icon: Folder },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/commission", label: "Commission", icon: Calculator },
  { to: "/income-statement", label: "Income Statement", icon: BarChart3 },
];

const CLEAR_APP_DATA_ON_LOGOUT = false;

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

function isRouteActive(pathname, item) {
  if (item.end) return pathname === "/";
  if (pathname === item.to || pathname.startsWith(item.to + "/")) return true;
  for (const a of item.aliases || []) {
    if (pathname === a || pathname.startsWith(a + "/")) return true;
  }
  return false;
}

function Badge({ tone = "slate", children, title, glow = false }) {
  const tones = {
    slate: "bg-slate-100/80 text-slate-700 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700/60",
    amber: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 ring-amber-200/80 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-200 dark:ring-amber-700/50",
    rose: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200/80 dark:from-rose-900/30 dark:to-red-900/30 dark:text-rose-200 dark:ring-rose-700/50",
  };

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset whitespace-nowrap transition-all duration-300 hover:scale-105",
        tones[tone] || tones.slate,
        glow && tone === "rose" ? "shadow-[0_0_12px_rgba(239,68,68,0.3)]" : "",
        glow && tone === "amber" ? "shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [focusKey, setFocusKey] = useState(0);
  const user = authApi.getUser();

  useEffect(() => {
    const onFocus = () => setFocusKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const etaCounts = useMemo(() => countEtaBuckets(loadWorkOrders()), [focusKey]);

  // Filter navigation items based on user role
  const filteredNav = useMemo(() => {
    return nav.filter(item => {
      if (!item.roles) return true; // No role restriction
      return item.roles.includes(user?.role);
    });
  }, [user?.role]);

  function closeOnMobile() {
    if (window.innerWidth < 1024) onClose?.();
  }

  function handleLogout() {
    authApi.logout();
    if (CLEAR_APP_DATA_ON_LOGOUT) {
      try { localStorage.clear(); } catch {}
    }
    window.location.href = "/login";
  }

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-72",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl",
        "border-r border-slate-200/60 dark:border-slate-700/50",
        "shadow-2xl shadow-slate-900/5 dark:shadow-slate-950/50",
        "transform transition-all duration-300 ease-out lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-50/30 via-transparent to-transparent dark:from-brand-950/20 pointer-events-none" />
      
      {/* Brand header */}
      <div className="relative flex h-20 items-center justify-between px-5 border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-500 to-brand-500 animate-gradient" />
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-400 to-cyan-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center font-black text-lg shadow-lg shadow-brand-500/30">
              <Sparkles size={22} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black tracking-tight gradient-text">GMN</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase font-semibold">
              Field Service Manager
            </div>
          </div>
        </div>

        <button
          className="lg:hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 ui-hover ui-focus"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative px-3 py-5 overflow-y-auto h-[calc(100vh-180px)] gmn-scroll">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-4 mb-3 tracking-[0.2em] uppercase">
          Navigation
        </div>

        <ul className="space-y-1.5">
          {filteredNav.map((item, index) => {
            const Icon = item.icon;
            const current = isRouteActive(location.pathname, item);
            const isCalendar = item.to === "/calendar";

            return (
              <li key={item.to} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={closeOnMobile}
                  className={[
                    "relative group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                    current
                      ? "bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent text-brand-700 dark:from-brand-500/20 dark:text-brand-200"
                      : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  {/* Active indicator */}
                  <span
                    className={[
                      "absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full transition-all duration-300",
                      current ? "opacity-100 bg-gradient-to-b from-brand-400 to-brand-600 shadow-[0_0_12px_rgba(14,165,233,0.5)]" : "opacity-0",
                    ].join(" ")}
                  />

                  {/* Icon */}
                  <div className={[
                    "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300",
                    current ? "bg-brand-500/10 dark:bg-brand-500/20" : "bg-slate-100/80 dark:bg-slate-800/60 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700/60",
                  ].join(" ")}>
                    <Icon size={18} className={current ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"} />
                  </div>
                  
                  <span className="flex-1">{item.label}</span>

                  {isCalendar ? (
                    <span className="flex items-center gap-1.5">
                      {etaCounts.overdue > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeOnMobile(); navigate("/calendar", { state: { bucket: "overdue" } }); }}
                        >
                          <Badge tone="rose" glow><AlertTriangle size={10} />{etaCounts.overdue}</Badge>
                        </button>
                      )}
                      {etaCounts.today > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeOnMobile(); navigate("/calendar", { state: { bucket: "today" } }); }}
                        >
                          <Badge tone="amber" glow>{etaCounts.today}</Badge>
                        </button>
                      )}
                    </span>
                  ) : (
                    <ChevronRight size={16} className={[
                      "transition-all duration-300",
                      current ? "opacity-100 text-brand-500" : "opacity-0 group-hover:opacity-60"
                    ].join(" ")} />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-t from-white via-white/95 to-white/80 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-cyan-500 grid place-items-center text-white font-bold text-sm shadow-lg shadow-brand-500/20">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 status-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold">{user?.name || 'User'}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role?.replace('_', ' ') || 'Dispatcher'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-all duration-300 ui-hover tap-feedback"
            type="button"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
