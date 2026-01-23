import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "../pages/Login";
import AppShell from "../layout/AppShell";
import Dashboard from "../pages/Dashboard";
import WorkOrders from "../pages/WorkOrders";
import Costs from "../pages/Costs";
import Proposals from "../pages/Proposals";
import Files from "../pages/Files";
import Calendar from "../pages/Calendar";
import Technicians from "../pages/Technicians";

/**
 * ---------------------------
 * Hardened frontend auth gate
 * ---------------------------
 * Still NOT real security (backend must enforce later),
 * but prevents common bypasses/bugs and supports redirect-back.
 */

const AUTH_KEY = "gmn_authed";
const AUTH_TS_KEY = "gmn_authed_ts";

// Optional: session TTL (minutes). Set to 0 to disable expiry.
const SESSION_TTL_MIN = 12 * 60; // 12 hours

export function isAuthed() {
  try {
    const flag = localStorage.getItem(AUTH_KEY) === "true";
    if (!flag) return false;

    if (!SESSION_TTL_MIN) return true;

    const tsRaw = localStorage.getItem(AUTH_TS_KEY);
    const ts = Number(tsRaw || 0);
    if (!ts) return false;

    const ageMs = Date.now() - ts;
    const ttlMs = SESSION_TTL_MIN * 60 * 1000;

    // Expired session
    if (ageMs > ttlMs) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_TS_KEY);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function setAuthed(value) {
  try {
    localStorage.setItem(AUTH_KEY, value ? "true" : "false");
    if (value) localStorage.setItem(AUTH_TS_KEY, String(Date.now()));
    else localStorage.removeItem(AUTH_TS_KEY);
  } catch {
    // ignore (private mode / storage blocked)
  }
}

export function clearAuthed() {
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TS_KEY);
  } catch {
    // ignore
  }
}

/**
 * RequireAuth:
 * - Redirects to /login?next=<currentPath>
 * - Prevents redirect loops
 */
function RequireAuth({ children }) {
  const location = useLocation();

  if (isAuthed()) return children;

  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?next=${next}`} replace />;
}

/**
 * If already authed, keep people out of /login
 */
function RequireGuest({ children }) {
  if (isAuthed()) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <RequireGuest>
              <Login />
            </RequireGuest>
          }
        />

        {/* Protected app */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="technicians" element={<Technicians />} />
          <Route path="costs" element={<Costs />} />
          <Route path="proposals" element={<Proposals />} />
          <Route path="files" element={<Files />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
