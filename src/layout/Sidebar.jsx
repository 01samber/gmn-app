import { clearAuthed } from "../app/routes";
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const WO_STORAGE_KEY = "gmn_workorders_v1";

/**
 * IMPORTANT:
 * Your codebase has BOTH "/work-orders" and "/workorders" usage.
 * Until you standardize, we support both.
 */
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },

  // canonical route for sidebar links (pick one; we keep this)
  { to: "/work-orders", aliases: ["/workorders"], label: "Work Orders", icon: ClipboardList },

  { to: "/technicians", label: "Technicians", icon: Users },
  { to: "/costs", label: "Costs", icon: DollarSign },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/files", label: "Files", icon: Folder },

  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

// ✅ Optional security toggle: wipe local data on logout
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

function isRouteActive(pathname, item) {
  // Dashboard must match exactly "/"
  if (item.end) return pathname === "/";

  // direct match or nested
  if (pathname === item.to || pathname.startsWith(item.to + "/")) return true;

  // alias match
  const aliases = item.aliases || [];
  for (const a of aliases) {
    if (pathname === a || pathname.startsWith(a + "/")) return true;
  }

  return false;
}

function Badge({ tone = "slate", children, title }) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800",
    amber:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40",
    rose:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-200 dark:ring-rose-900/40",
  };

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ring-inset whitespace-nowrap",
        tones[tone] || tones.slate,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  // refresh ETA counts when tab refocuses (other pages may edit localStorage)
  const [focusKey, setFocusKey] = useState(0);
  useEffect(() => {
    const onFocus = () => setFocusKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const etaCounts = useMemo(() => {
    const rows = loadWorkOrders();
    return countEtaBuckets(rows);
  }, [focusKey]);

  function closeOnMobile() {
    if (window.innerWidth < 1024) onClose?.();
  }

  function handleLogout() {
    // remove auth flag (your routes module owns this)
    try {
      clearAuthed?.();
    } catch {
      // no-op
    }

    if (CLEAR_APP_DATA_ON_LOGOUT) {
      // High-security wipe: localStorage + indexedDB blobs etc.
      // NOTE: This nukes EVERYTHING saved by the app.
      try {
        localStorage.clear();
      } catch {
        // no-op
      }
      // optional: attempt to clear IndexedDB (best effort)
      // You might have an IndexedDB name in fileStore. If you do, delete it there.
    }

    // hard redirect to kill SPA state
    window.location.href = "/login";
  }

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-72",
        "bg-white dark:bg-slate-900",
        "border-r border-slate-200 dark:border-slate-800",
        "transform transition-transform duration-200 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      aria-label="Sidebar"
    >
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand-600 text-white grid place-items-center font-black ui-hover">
              G
            </div>

            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-wide leading-5">GMN</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tracking-[0.25em] truncate">
                FIELD SERVICE MANAGER
              </div>
            </div>
          </div>
        </div>

        <button
          className="lg:hidden rounded-xl border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 ui-hover ui-focus"
          onClick={onClose}
          aria-label="Close sidebar"
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-3 mb-2 tracking-[0.18em]">
          MAIN
        </div>

        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const current = isRouteActive(location.pathname, item);

            const isCalendar = item.to === "/calendar";

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => closeOnMobile()}
                  aria-current={current ? "page" : undefined}
                  className={({ isActive }) => {
                    const active = current || isActive;

                    return [
                      "relative group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                      "transition-colors ui-hover",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 focus-visible:ring-inset",
                      active
                        ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-600/15 dark:text-brand-100 dark:ring-brand-600/30"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    ].join(" ");
                  }}
                >
                  {/* Active left rail */}
                  <span
                    className={[
                      "absolute left-1 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full transition-opacity",
                      current ? "opacity-100 bg-brand-600 dark:bg-brand-400" : "opacity-0",
                    ].join(" ")}
                    aria-hidden="true"
                  />

                  <Icon size={18} className="opacity-90 group-hover:opacity-100" />
                  <span className="truncate">{item.label}</span>

                  {/* Calendar signal badges */}
                  {isCalendar ? (
                    <span className="ml-auto flex items-center gap-1">
                      {etaCounts.overdue > 0 ? (
                        <button
                          type="button"
                          className="ui-hover ui-focus"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeOnMobile();
                            navigate("/calendar", { state: { bucket: "overdue" } });
                          }}
                          title="Overdue active work orders"
                        >
                          <Badge tone="rose" title="Overdue active work orders">
                            <AlertTriangle size={12} />
                            {etaCounts.overdue}
                          </Badge>
                        </button>
                      ) : null}

                      {etaCounts.today > 0 ? (
                        <button
                          type="button"
                          className="ui-hover ui-focus"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeOnMobile();
                            navigate("/calendar", { state: { bucket: "today" } });
                          }}
                          title="Today’s active work orders"
                        >
                          <Badge tone="amber" title="Today’s active work orders">
                            Today {etaCounts.today}
                          </Badge>
                        </button>
                      ) : null}
                    </span>
                  ) : (
                    /* Tiny active dot for non-calendar */
                    <span
                      className={[
                        "ml-auto h-2 w-2 rounded-full transition-opacity",
                        current ? "opacity-100 bg-brand-600 dark:bg-brand-400" : "opacity-0",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user / logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">User</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Dispatcher
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
            aria-label="Logout"
            type="button"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
