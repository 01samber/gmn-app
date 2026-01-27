import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setAuthed, isAuthed } from "../app/routes";
import { 
  Clock, 
  Calendar, 
  Cloud, 
  Thermometer, 
  Wifi, 
  Shield, 
  Eye, 
  EyeOff,
  LogIn,
  Key,
  User,
  Users,
  Cpu,
  HardDrive,
  Activity,
  Bell,
  Zap,
  Lock,
  Building,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Server,
  Database,
  Network,
  Cctv,
  RadioTower,
  Satellite,
  Globe,
  ShieldCheck,
  Fingerprint,
  Scan
} from "lucide-react";

const MAX_FAILS = 6;
const LOCK_MS = 30_000;

const FAILS_KEY = "gmn_login_fails_v1";
const LOCK_KEY = "gmn_login_locked_until_v1";
const ROLE_KEY = "gmn_role_v1";

function getNextFromSearch(search) {
  try {
    const params = new URLSearchParams(search);
    const next = params.get("next") || "/";
    if (!next.startsWith("/")) return "/";
    return next;
  } catch {
    return "/";
  }
}

function readInt(key, fallback = 0) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeInt(key, value) {
  try {
    localStorage.setItem(key, String(Number(value) || 0));
  } catch {
    // ignore
  }
}

function clearKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// Particle Background
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-brand-500/10 to-cyan-500/10"
          style={{
            width: Math.random() * 4 + 1 + 'px',
            height: Math.random() * 4 + 1 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animation: `float ${Math.random() * 10 + 10}s linear infinite`,
            animationDelay: Math.random() * 5 + 's'
          }}
        />
      ))}
    </div>
  );
}

// Live Clock Component
function LiveClock() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-cyan-500/5" />
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500/20 to-cyan-500/20 border border-brand-500/30">
            <Clock className="text-brand-300" size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-300">System Time</div>
            <div className="text-xs text-slate-500">Real-time synchronized</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white font-mono tracking-tight mb-2">
            {formatTime(time)}
          </div>
          <div className="text-sm text-slate-400">
            {formatDate(time)}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-slate-400">UTC-5</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
              <Calendar size={12} className="text-slate-500" />
              <span className="text-xs text-slate-400">{time.getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// System Status Widget
function SystemStatus() {
  const [stats, setStats] = useState({
    cpu: 32,
    memory: 65,
    network: 85,
    storage: 97
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: 30 + Math.random() * 25,
        memory: 60 + Math.random() * 20,
        network: 80 + Math.random() * 15,
        storage: 95 + Math.random() * 5
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const StatusBar = ({ value, color }) => (
    <div className="relative h-2 bg-slate-900/50 rounded-full overflow-hidden">
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
        style={{ width: `${value}%` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
    </div>
  );

  const StatusItem = ({ icon: Icon, label, value, color, gradient }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <div className="text-xs text-slate-400">{label}</div>
          <div className="text-lg font-semibold text-white">{value}%</div>
        </div>
      </div>
      <StatusBar value={value} color={color} />
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <Activity className="text-emerald-300" size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-300">System Status</div>
            <div className="text-xs text-slate-500">Real-time monitoring</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <StatusItem 
            icon={Cpu}
            label="CPU Load"
            value={stats.cpu.toFixed(1)}
            color="from-cyan-500 to-blue-500"
            gradient="from-cyan-500/30 to-blue-500/30"
          />
          <StatusItem 
            icon={HardDrive}
            label="Memory"
            value={stats.memory.toFixed(1)}
            color="from-emerald-500 to-green-500"
            gradient="from-emerald-500/30 to-green-500/30"
          />
          <StatusItem 
            icon={Network}
            label="Network"
            value={stats.network.toFixed(1)}
            color="from-brand-500 to-purple-500"
            gradient="from-brand-500/30 to-purple-500/30"
          />
          <StatusItem 
            icon={Database}
            label="Storage"
            value={stats.storage.toFixed(1)}
            color="from-amber-500 to-orange-500"
            gradient="from-amber-500/30 to-orange-500/30"
          />
        </div>
      </div>
    </div>
  );
}

// Security Monitor
function SecurityMonitor() {
  const [threats, setThreats] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setThreats(Math.floor(Math.random() * 5));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5" />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
              <ShieldCheck className="text-violet-300" size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-300">Security Monitor</div>
              <div className="text-xs text-slate-500">Threat detection active</div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <div className="text-xs font-semibold text-emerald-400">SECURE</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Cctv, label: "Surveillance", status: "Active", color: "emerald" },
            { icon: Fingerprint, label: "Biometric", status: "Enabled", color: "brand" },
            { icon: Scan, label: "Network Scan", status: "Running", color: "blue" },
            { icon: RadioTower, label: "Comms", status: "Secure", color: "violet" }
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-1.5 rounded-lg bg-${item.color}-500/20`}>
                  <item.icon size={16} className={`text-${item.color}-400`} />
                </div>
                <div className="text-xs text-slate-400">{item.label}</div>
              </div>
              <div className={`text-sm font-semibold text-${item.color}-400`}>{item.status}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="text-slate-400">Active Threats</div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded-full ${threats > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {threats} detected
              </div>
            </div>
          </div>
          <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-500"
              style={{ width: `${100 - (threats * 20)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Global Network Status
function GlobalNetwork() {
  const [nodes, setNodes] = useState([
    { location: "NYC", status: "active", latency: "12ms" },
    { location: "LON", status: "active", latency: "18ms" },
    { location: "SGP", status: "active", latency: "8ms" },
    { location: "TYO", status: "warning", latency: "45ms" },
    { location: "SYD", status: "active", latency: "25ms" },
    { location: "FRA", status: "active", latency: "15ms" }
  ]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5" />
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
            <Globe className="text-blue-300" size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-300">Global Network</div>
            <div className="text-xs text-slate-500">6 nodes online</div>
          </div>
        </div>

        <div className="space-y-3">
          {nodes.map((node, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:bg-slate-900/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${node.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-300">{node.location}</div>
                  <div className="text-xs text-slate-500">Data Center</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono text-slate-400">{node.latency}</div>
                <div className={`px-2 py-1 rounded-full text-xs ${node.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {node.status === 'active' ? 'ACTIVE' : 'WARNING'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <div className="text-slate-400">Network Health</div>
            <div className="text-emerald-400 font-semibold">98.7%</div>
          </div>
          <div className="h-1.5 bg-slate-900/50 rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: '98.7%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const nextPath = useMemo(
    () => getNextFromSearch(location.search),
    [location.search]
  );

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ✅ persisted lockout state
  const [fails, setFails] = useState(() => readInt(FAILS_KEY, 0));
  const [lockedUntil, setLockedUntil] = useState(() => readInt(LOCK_KEY, 0));

  const locked = lockedUntil && Date.now() < lockedUntil;
  const remaining = locked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  // ✅ keep timer ticking
  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => {
      setLockedUntil(readInt(LOCK_KEY, 0));
    }, 250);
    return () => clearInterval(t);
  }, [locked]);

  useEffect(() => {
    if (isAuthed()) navigate("/", { replace: true });
  }, [navigate]);

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function normalize(s, max = 64) {
    return String(s || "").trim().slice(0, max);
  }

  function bumpFail() {
    const nextFails = fails + 1;
    setFails(nextFails);
    writeInt(FAILS_KEY, nextFails);

    if (nextFails >= MAX_FAILS) {
      const until = Date.now() + LOCK_MS;
      setLockedUntil(until);
      writeInt(LOCK_KEY, until);

      setFails(0);
      writeInt(FAILS_KEY, 0);

      return { lockedNow: true, nextFails: 0 };
    }

    return { lockedNow: false, nextFails };
  }

  function clearLock() {
    setFails(0);
    setLockedUntil(0);
    writeInt(FAILS_KEY, 0);
    clearKey(LOCK_KEY);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setError("");

    // refresh lock from storage
    const lockFromStorage = readInt(LOCK_KEY, 0);
    if (lockFromStorage && Date.now() < lockFromStorage) {
      setLockedUntil(lockFromStorage);
      setError(`Too many attempts. Try again in ${Math.ceil((lockFromStorage - Date.now()) / 1000)}s.`);
      return;
    } else if (lockFromStorage) {
      clearLock();
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
      const ok = true; // Demo auth

      if (!ok) {
        const result = bumpFail();
        if (result.lockedNow) {
          setError("Too many attempts. Please wait 30 seconds and try again.");
        } else {
          setError("Invalid credentials. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      clearLock();
      try {
        localStorage.setItem(ROLE_KEY, role);
      } catch {
        // ignore
      }

      setAuthed(true);
      setSubmitting(false);
      navigate(nextPath || "/", { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-950">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Left Side - Login Panel */}
      <div className="w-full lg:w-2/5 relative flex items-center justify-center p-8">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-gradient-to-r from-brand-500/10 to-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-64 w-64 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-3xl" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-cyan-500 blur-xl opacity-70 animate-pulse" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-white/20 backdrop-blur-xl">
                  <Building className="text-brand-300" size={32} />
                </div>
              </div>
              <div>
                <div className="text-5xl font-black tracking-tighter bg-gradient-to-r from-white via-brand-100 to-cyan-200 bg-clip-text text-transparent">
                  GMN
                </div>
                <div className="text-sm tracking-[0.4em] text-slate-400 mt-2 font-medium">
                  GLOBAL MAINTENANCE NETWORK
                </div>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="text-sm text-slate-300">Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800">
                <Satellite size={14} className="text-brand-400" />
                <span className="text-sm text-slate-300">Real-time Ops</span>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="relative">
            {/* Glass effect background */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-white/2 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/40" />
            
            <form onSubmit={onSubmit} className="relative p-8 space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-3">Secure Access Portal</h1>
                <p className="text-slate-400 text-sm">Authentication required for system access</p>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-900/30 to-rose-950/30 px-4 py-3 text-sm text-rose-200 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-rose-400" />
                    {error}
                  </div>
                </div>
              ) : null}

              {locked ? (
                <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-900/30 to-amber-950/30 px-4 py-3 text-sm text-amber-200 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-amber-400" />
                    Security lock active for <b className="text-amber-300 ml-1">{remaining}s</b>
                  </div>
                </div>
              ) : null}

              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User size={16} className="text-brand-300" />
                  Username
                </label>
                <div className="relative">
                  <input
                    value={form.username}
                    onChange={(e) => update("username", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-white placeholder-slate-500 outline-none transition-all duration-300 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 hover:bg-slate-900/80 shadow-inner"
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                    disabled={submitting || locked}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-r from-brand-500/40 to-cyan-500/40 border border-brand-500/30" />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Key size={16} className="text-brand-300" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-white placeholder-slate-500 outline-none transition-all duration-300 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 hover:bg-slate-900/80 shadow-inner pr-12"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={submitting || locked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800/50"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Role Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Users size={16} className="text-brand-300" />
                  Access Level
                </label>
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-white outline-none transition-all duration-300 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 hover:bg-slate-900/80 shadow-inner appearance-none"
                  required
                  disabled={submitting || locked}
                >
                  <option value="" disabled className="bg-slate-900">
                    Select access level
                  </option>
                  <option value="dispatcher" className="bg-slate-900">Dispatcher</option>
                  <option value="team_leader" className="bg-slate-900">Team Leader</option>
                  <option value="account_manager" className="bg-slate-900">Account Manager</option>
                  <option value="admin" className="bg-slate-900">System Administrator</option>
                </select>
              </div>

              {/* Login Button */}
              <button
                disabled={submitting || locked}
                className={[
                  "w-full rounded-xl px-4 py-4 text-sm font-semibold text-white transition-all duration-300 relative overflow-hidden group mt-8",
                  submitting || locked 
                    ? "bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 cursor-not-allowed" 
                    : "bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-500 hover:from-brand-500 hover:via-brand-600 hover:to-cyan-600 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 border border-brand-500/30 shadow-lg"
                ].join(" ")}
                type="submit"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint size={20} />
                      <span>Authenticate & Access Dashboard</span>
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              {/* Security Footer */}
              <div className="pt-6 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span className="text-slate-300">256-bit Encryption</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-slate-300">Secure Connection</span>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-900/80 to-slate-950/80 border border-slate-800 text-xs text-slate-400">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span>Demo Environment • Production backend pending</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Dashboard Preview */}
      <div className="hidden lg:block lg:w-3/5 relative">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-cyan-500/5" />
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(14, 165, 233, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)`
          }} />
        </div>

        {/* Dashboard Content */}
        <div className="absolute inset-0 p-8 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-sm text-slate-500">PREVIEW • OPERATIONS DASHBOARD</div>
              <div className="text-2xl font-bold text-white">Enterprise Command Center</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <div className="text-xs font-semibold text-emerald-400">LIVE</div>
              </div>
              <div className="text-xs text-slate-500">v2.4.1 • Build 1024</div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-2 gap-6 flex-1">
            <div className="space-y-6">
              <LiveClock />
              <SystemStatus />
            </div>
            <div className="space-y-6">
              <SecurityMonitor />
              <GlobalNetwork />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-slate-400">All systems operational</span>
                </div>
                <div className="h-4 w-px bg-slate-800"></div>
                <div className="text-xs text-slate-500">
                  <span className="text-slate-400">Last updated: </span>
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                © 2024 Global Maintenance Network • Proprietary & Confidential
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 animate-float-slow">
          <div className="h-40 w-40 rounded-full bg-gradient-to-r from-brand-500/20 to-cyan-500/20 blur-2xl"></div>
        </div>
        <div className="absolute bottom-1/3 right-1/3 animate-float">
          <div className="h-32 w-32 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-2xl"></div>
        </div>
      </div>

      {/* Mobile Background */}
      <div className="lg:hidden absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-cyan-500/10"></div>
      </div>

      {/* Loading Animation for Demo */}
      {submitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900/90 border border-white/20 rounded-2xl p-8 max-w-sm w-full mx-4 backdrop-blur-xl">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin mx-auto mb-6"></div>
              <div className="text-lg font-semibold text-white mb-2">Security Verification</div>
              <div className="text-sm text-slate-400">Authenticating with enterprise servers...</div>
              <div className="mt-4 text-xs text-slate-500">Establishing secure connection</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-20px) rotate(120deg); }
    66% { transform: translateY(10px) rotate(240deg); }
  }
  
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .animate-float {
    animation: float 15s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: float-slow 8s ease-in-out infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 5px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #0ea5e9, #0284c7);
    border-radius: 5px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #38bdf8, #0ea5e9);
  }
  
  /* Selection color */
  ::selection {
    background: rgba(14, 165, 233, 0.3);
    color: white;
  }
`;
document.head.appendChild(style);