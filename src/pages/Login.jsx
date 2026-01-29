import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, EyeOff, Sparkles, ArrowRight, UserPlus, LogIn, 
  Wrench, ClipboardList, Users, Calendar, DollarSign, 
  Shield, Zap, TrendingUp, CheckCircle
} from "lucide-react";
import { authApi } from "../api";

// Animated background component with floating elements
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-brand-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-500/20 to-purple-500/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 10}s`,
          }}
        />
      ))}
      
      {/* Glowing lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="1" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="30%" x2="100%" y2="70%" stroke="url(#line-gradient)" strokeWidth="1" className="animate-draw-line" />
        <line x1="100%" y1="20%" x2="0" y2="80%" stroke="url(#line-gradient)" strokeWidth="1" className="animate-draw-line" style={{ animationDelay: '2s' }} />
      </svg>
    </div>
  );
}

// Feature card component
function FeatureCard({ icon: Icon, title, description, delay }) {
  return (
    <div 
      className="group p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon size={20} className="text-brand-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white/90">{title}</h3>
          <p className="text-sm text-white/50 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Stats component
function StatItem({ value, label, delay }) {
  return (
    <div className="text-center animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("dispatcher");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    if (authApi.isAuthenticated()) {
      navigate("/", { replace: true });
      return;
    }
    setMounted(true);
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        await authApi.register(email, password, name, role);
      } else {
        await authApi.login(email, password);
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Authentication failed");
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex relative">
      {/* Left side - Branding & Features */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <AnimatedBackground />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo & Brand */}
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-400 to-cyan-400 blur-xl opacity-50" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-2xl">
                  <Sparkles size={28} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">GMN</h1>
                <p className="text-sm text-white/50 font-medium">Field Service Manager</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="max-w-lg animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Professional 
                <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent"> Field Service </span>
                Management
              </h2>
              <p className="mt-4 text-lg text-white/60">
                Streamline operations, boost efficiency, and deliver exceptional service with our comprehensive maintenance platform.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-12 py-6 border-y border-white/10">
              <StatItem value="10K+" label="Work Orders" delay={400} />
              <StatItem value="500+" label="Technicians" delay={500} />
              <StatItem value="99.9%" label="Uptime" delay={600} />
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4">
              <FeatureCard 
                icon={ClipboardList} 
                title="Work Orders" 
                description="Track and manage all jobs"
                delay={700}
              />
              <FeatureCard 
                icon={Users} 
                title="Technicians" 
                description="Full team management"
                delay={800}
              />
              <FeatureCard 
                icon={DollarSign} 
                title="Cost Tracking" 
                description="Financial oversight"
                delay={900}
              />
              <FeatureCard 
                icon={Calendar} 
                title="Scheduling" 
                description="Smart calendar system"
                delay={1000}
              />
            </div>
          </div>

          {/* Bottom badges */}
          <div className="flex items-center gap-6 animate-fade-in-up" style={{ animationDelay: '1100ms' }}>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Shield size={16} className="text-emerald-400" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Zap size={16} className="text-amber-400" />
              <span>Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <TrendingUp size={16} className="text-brand-400" />
              <span>Real-time Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 relative">
        {/* Mobile animated bg */}
        <div className="lg:hidden absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-200/30 to-cyan-200/30 dark:from-brand-800/20 dark:to-cyan-800/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-200/30 to-purple-200/30 dark:from-violet-800/20 dark:to-purple-800/20 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-xl shadow-brand-500/30 mb-4">
              <Sparkles size={32} />
            </div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-brand-600 to-cyan-600 bg-clip-text text-transparent">GMN</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Field Service Manager</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/50 dark:border-slate-700/50 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {isRegister ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {isRegister ? "Join the GMN platform" : "Sign in to continue"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  >
                    <option value="dispatcher">Dispatcher</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="account_manager">Account Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-3 text-sm flex items-center gap-2 animate-shake">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRegister ? (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
              </button>
            </div>

            {/* Demo credentials */}
            {!isRegister && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span>Demo credentials available</span>
                </div>
                <div className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg">
                  demo@gmn.com / demo123
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            © 2026 Global Maintenance Network. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
