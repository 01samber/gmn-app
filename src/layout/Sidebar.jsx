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
} from "lucide-react";


const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { to: "/technicians", label: "Technicians", icon: Users },
  { to: "/costs", label: "Costs", icon: DollarSign },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/files", label: "Files", icon: Folder },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

// ✅ Optional security toggle: wipe local data on logout
// Set to true if you want a “high security” logout that clears ALL saved app data.
const CLEAR_APP_DATA_ON_LOGOUT = false;

function isRouteActive(pathname, item) {
  // Dashboard must match exactly "/"
  if (item.end) return pathname === "/";

  // For non-end routes, allow nested paths:
  // "/work-orders" active for "/work-orders/123"
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  function closeOnMobile() {
    if (window.innerWidth < 1024) onClose?.();
  }

  function handleLogout() {
    // Always remove auth flag
// adjust relative path
clearAuthed();
window.location.href = "/login";

    // Optional: clear all app data (high security mode)
    if (CLEAR_APP_DATA_ON_LOGOUT) {
      const keysToClear = [
        "gmn_theme",
        "gmn_workorders_v1",
        "gmn_techs_v1",
        "gmn_costs_v1",
        "gmn_proposals_v1",
        "gmn_files_v1",
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    }

    // Use router navigation (no hard refresh)
    navigate("/login", { replace: true });
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
              <div className="text-lg font-extrabold tracking-wide leading-5">
                GMN
              </div>
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

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => closeOnMobile()}
                  aria-current={current ? "page" : undefined}
                  className={({ isActive }) => {
                    // prefer our matcher because it supports nested routes
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

                  {/* Tiny active dot */}
                  <span
                    className={[
                      "ml-auto h-2 w-2 rounded-full transition-opacity",
                      current ? "opacity-100 bg-brand-600 dark:bg-brand-400" : "opacity-0",
                    ].join(" ")}
                    aria-hidden="true"
                  />
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
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
