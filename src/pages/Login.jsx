import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setAuthed, isAuthed } from "../app/routes";

const MAX_FAILS = 6;
const LOCK_MS = 30_000; // 30s soft lock

function getNextFromSearch(search) {
  try {
    const params = new URLSearchParams(search);
    const next = params.get("next") || "/";
    // Prevent open redirects: only allow internal paths
    if (!next.startsWith("/")) return "/";
    return next;
  } catch {
    return "/";
  }
}

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const nextPath = useMemo(() => getNextFromSearch(location.search), [location.search]);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const locked = lockedUntil && Date.now() < lockedUntil;
  const remaining = locked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  useEffect(() => {
    // If already authed, bounce away from login
    if (isAuthed()) navigate("/", { replace: true });
  }, [navigate]);

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function normalize(s, max = 64) {
    return String(s || "").trim().slice(0, max);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setError("");

    if (locked) {
      setError(`Too many attempts. Try again in ${remaining}s.`);
      return;
    }

    const username = normalize(form.username, 48);
    const password = normalize(form.password, 64);
    const role = normalize(form.role, 32);

    if (username.length < 2 || password.length < 2 || !role) {
      setError("Please fill all fields correctly.");
      return;
    }

    setSubmitting(true);

    try {
      /**
       * DEMO auth (frontend only)
       * Later: replace with backend call:
       * const ok = await apiLogin({ username, password, role })
       */
      const ok = true;

      if (!ok) {
        const nextFails = fails + 1;
        setFails(nextFails);

        if (nextFails >= MAX_FAILS) {
          setLockedUntil(Date.now() + LOCK_MS);
          setFails(0);
          setError("Too many attempts. Please wait 30 seconds and try again.");
        } else {
          setError("Invalid credentials. Please try again.");
        }

        setSubmitting(false);
        return;
      }

      // ✅ Use hardened auth helper
      setAuthed(true);

      // Navigate to intended destination
      navigate(nextPath || "/", { replace: true });
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative grid place-items-center px-4 overflow-hidden">
      {/* Live wallpaper video (from /public) */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/wallpapers/maintenance.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-slate-950/65" />

      {/* Soft gradient tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-transparent to-brand-600/20" />

      {/* Content */}
      <div className="relative w-full max-w-md rounded-2xl bg-white/92 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/20">
        <div className="px-8 py-10 text-center text-white bg-gradient-to-br from-slate-950/70 to-slate-900/40">
          <div className="text-4xl font-black tracking-[0.25em]">GMN</div>
          <div className="mt-2 text-xs tracking-[0.35em] opacity-90">
            GLOBAL MAINTENANCE NETWORK
          </div>
          <div className="mt-4 text-[11px] tracking-[0.3em] opacity-80">
            PRECISION • PERFORMANCE • PERFECTION
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {locked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Locked for <b>{remaining}s</b> due to repeated attempts.
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium text-slate-800">Username</label>
            <input
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none transition-all duration-200 ease-out focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600/40 hover:-translate-y-[1px] hover:shadow-sm"
              placeholder="Enter username"
              autoComplete="username"
              required
              disabled={submitting || locked}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none transition-all duration-200 ease-out focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600/40 hover:-translate-y-[1px] hover:shadow-sm"
              placeholder="Enter password"
              autoComplete="current-password"
              required
              disabled={submitting || locked}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800">Role</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none transition-all duration-200 ease-out focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600/40 hover:-translate-y-[1px] hover:shadow-sm"
              required
              disabled={submitting || locked}
            >
              <option value="" disabled>
                Select role
              </option>
              <option value="dispatcher">Dispatcher</option>
              <option value="team_leader">Team Leader</option>
              <option value="account_manager">Account Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button
            disabled={submitting || locked}
            className={[
              "w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white ui-hover ui-focus tap-feedback",
              submitting || locked
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-brand-600 hover:bg-brand-700",
            ].join(" ")}
          >
            {submitting ? "Signing in…" : "Login"}
          </button>

          <div className="text-center text-xs text-slate-600">
            Demo login (frontend only). Backend auth comes later.
          </div>
        </form>
      </div>
    </div>
  );
}
