import { useMemo, useState, useEffect } from "react";
import PageTransition from "../components/PageTransition";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  DollarSign,
  FileText,
  ArrowUpRight,
  Sparkles,
  Paperclip,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Zap,
  Bell,
  RefreshCw,
  ChevronRight,
  Calendar,
  Target,
  FileSearch,
  Download,
  Eye,
  Filter,
} from "lucide-react";

const WO_STORAGE_KEY = "gmn_workorders_v1";
const PROPOSALS_STORAGE_KEY = "gmn_proposals_v1";
const COSTS_STORAGE_KEY = "gmn_costs_v1";
const FILES_STORAGE_KEY = "gmn_files_v1";

function safeParse(raw, fallback) {
  try {
    const v = raw ? JSON.parse(raw) : fallback;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadList(key) {
  const v = safeParse(localStorage.getItem(key), []);
  return Array.isArray(v) ? v : [];
}

function toMs(iso) {
  const t = Date.parse(String(iso || ""));
  return Number.isFinite(t) ? t : 0;
}

function relativeTime(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (value === 0) {
      setCount(0);
      return;
    }
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    const updateCounter = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      const currentValue = Math.floor(progress * value);
      
      setCount(currentValue);
      
      if (now < endTime) {
        requestAnimationFrame(updateCounter);
      } else {
        setCount(value);
      }
    };
    
    requestAnimationFrame(updateCounter);
  }, [value, duration]);
  
  return <span className="tabular-nums">{count}</span>;
}

function StatCard({ title, value, sub, hint, onClick, icon: Icon, trend, color = "brand" }) {
  const colors = {
    brand: {
      bg: "bg-brand-50 dark:bg-brand-900/20",
      border: "border-brand-200 dark:border-brand-800",
      text: "text-brand-700 dark:text-brand-300",
      icon: "bg-brand-100 text-brand-600 dark:bg-brand-800 dark:text-brand-200",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-200",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-900/20",
      border: "border-rose-200 dark:border-rose-800",
      text: "text-rose-700 dark:text-rose-300",
      icon: "bg-rose-100 text-rose-600 dark:bg-rose-800 dark:text-rose-200",
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-200 dark:border-violet-800",
      text: "text-violet-700 dark:text-violet-300",
      icon: "bg-violet-100 text-violet-600 dark:bg-violet-800 dark:text-violet-200",
    },
  };

  const theme = colors[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative group text-left w-full",
        "rounded-2xl border p-5 shadow-sm transition-all duration-300",
        theme.bg,
        theme.border,
        "hover:shadow-lg hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-slate-900",
      ].join(" ")}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/20 dark:from-black/0 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {Icon && (
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.icon}`}>
                  <Icon size={20} />
                </div>
              )}
              <div className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
                {title}
              </div>
            </div>
            
            <div className="mt-2 text-3xl font-bold tracking-tight">
              <AnimatedCounter value={value} />
            </div>
            
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sub}</div>
          </div>

          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.icon} transition-transform group-hover:scale-110`}>
            <ArrowUpRight size={18} />
          </div>
        </div>

        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{trend}</span>
            <span className="text-slate-500 dark:text-slate-400 ml-1">from last week</span>
          </div>
        )}

        {hint && (
          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
            💡 {hint}
          </div>
        )}
      </div>
    </button>
  );
}

function Card({ title, right, children, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, description, onClick, color = "brand" }) {
  const colors = {
    brand: "bg-brand-600 hover:bg-brand-700 text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    amber: "bg-amber-600 hover:bg-amber-700 text-white",
    violet: "bg-violet-600 hover:bg-violet-700 text-white",
    slate: "bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col items-center justify-center rounded-2xl p-4 text-center transition-all duration-300",
        colors[color],
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
      ].join(" ")}
    >
      <div className="mb-3 rounded-xl bg-white/20 p-3">
        <Icon size={24} />
      </div>
      <div className="text-sm font-semibold">{label}</div>
      {description && (
        <div className="mt-1 text-xs opacity-90">{description}</div>
      )}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={16} />
      </div>
    </button>
  );
}

function NotificationBadge({ count }) {
  if (!count || count === 0) return null;
  
  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white animate-pulse">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
      setLoading(false);
    }, 300);
  };

  const now = useMemo(() => {
    const date = new Date();
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
      full: date.toLocaleString(),
    };
  }, [refreshTrigger]);

  const wos = useMemo(() => loadList(WO_STORAGE_KEY), [refreshTrigger]);
  const proposals = useMemo(() => loadList(PROPOSALS_STORAGE_KEY), [refreshTrigger]);
  const costs = useMemo(() => loadList(COSTS_STORAGE_KEY), [refreshTrigger]);
  const files = useMemo(() => loadList(FILES_STORAGE_KEY), [refreshTrigger]);

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const totalProposalValue = proposals.reduce((sum, p) => sum + (Number(p?.total) || 0), 0);
    const totalCostValue = costs.reduce((sum, c) => sum + (Number(c?.amount) || 0), 0);
    const estimatedProfit = totalProposalValue - totalCostValue;
    const profitMargin = totalProposalValue > 0 ? (estimatedProfit / totalProposalValue) * 100 : 0;
    
    const paidCosts = costs.filter(c => c?.status === 'paid');
    const totalPaid = paidCosts.reduce((sum, c) => sum + (Number(c?.amount) || 0), 0);
    const unpaidCosts = costs.filter(c => c?.status !== 'paid');
    const totalUnpaid = unpaidCosts.reduce((sum, c) => sum + (Number(c?.amount) || 0), 0);
    
    return {
      totalProposalValue,
      totalCostValue,
      estimatedProfit,
      profitMargin,
      totalPaid,
      totalUnpaid,
      paidCount: paidCosts.length,
      unpaidCount: unpaidCosts.length,
    };
  }, [proposals, costs]);

  const woCounts = useMemo(() => {
    const total = wos.length;
    const waiting = wos.filter((w) => w?.status === "waiting" || w?.status === "pending").length;
    const inProgress = wos.filter((w) => w?.status === "in_progress").length;
    const completed = wos.filter((w) => w?.status === "completed").length;
    const invoiced = wos.filter((w) => w?.status === "invoiced").length;
    const paid = wos.filter((w) => w?.status === "paid").length;

    // Calculate overdue (ETA passed)
    const now = new Date();
    const overdue = wos.filter(w => {
      if (!w?.etaAt || w?.status === 'completed' || w?.status === 'paid') return false;
      const eta = new Date(w.etaAt);
      return eta < now;
    }).length;

    // Calculate today's schedule
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySchedule = wos.filter(w => {
      if (!w?.etaAt) return false;
      const eta = new Date(w.etaAt);
      return eta >= today && eta < tomorrow;
    }).length;

    return { total, waiting, inProgress, completed, invoiced, paid, overdue, todaySchedule };
  }, [wos]);

  const activity = useMemo(() => {
    const events = [];

    for (const w of wos.slice(0, 20)) {
      const t = toMs(w?.updatedAt) || toMs(w?.createdAt) || 0;
      if (!t) continue;
      
      let icon = "📋";
      let color = "brand";
      if (w?.status === 'completed') {
        icon = "✅";
        color = "emerald";
      } else if (w?.status === 'in_progress') {
        icon = "⚡";
        color = "amber";
      } else if (w?.status === 'waiting') {
        icon = "⏰";
        color = "violet";
      }
      
      events.push({
        at: t,
        type: "wo",
        title: `${w.wo || "WO"} ${w.status ? w.status.replaceAll("_", " ") : "updated"}`,
        desc: w.client || "—",
        go: () => navigate("/work-orders"),
        icon,
        color,
      });
    }

    for (const p of proposals.slice(0, 10)) {
      const t = toMs(p?.createdAt) || 0;
      if (!t) continue;
      events.push({
        at: t,
        type: "proposal",
        title: `Proposal ${p?.status || 'created'}`,
        desc: `${p.wo || "WO"} · ${p.client || "—"} · ${formatCurrency(p?.total || 0)}`,
        go: () => navigate("/proposals"),
        icon: "📄",
        color: "emerald",
      });
    }

    for (const c of costs.slice(0, 10)) {
      const t = toMs(c?.createdAt) || 0;
      if (!t) continue;
      const amt = Number(c?.amount || 0);
      events.push({
        at: t,
        type: "cost",
        title: `Cost ${c?.status || "recorded"}`,
        desc: `${c?.wo || "WO"} · ${formatCurrency(amt)}`,
        go: () => navigate("/costs"),
        icon: c?.status === 'paid' ? "💰" : "💳",
        color: c?.status === 'paid' ? "emerald" : "amber",
      });
    }

    for (const f of files.slice(0, 10)) {
      const t = toMs(f?.createdAt) || 0;
      if (!t) continue;
      events.push({
        at: t,
        type: "file",
        title: `File uploaded`,
        desc: `${f.name || "File"} · ${f.type || "—"}`,
        go: () => navigate("/files"),
        icon: "📎",
        color: "violet",
      });
    }

    // Sort by time and take top 8
    return events
      .sort((a, b) => b.at - a.at)
      .slice(0, 8)
      .map((e) => ({ ...e, time: relativeTime(e.at) }));
  }, [wos, proposals, costs, files, navigate]);

  const notifications = useMemo(() => {
    const notes = [];

    // Critical notifications
    if (woCounts.overdue > 0) {
      notes.push({
        text: `${woCounts.overdue} work order(s) overdue`,
        type: "critical",
        icon: <AlertCircle className="text-rose-500" size={16} />,
        action: () => navigate("/calendar"),
      });
    }

    if (woCounts.waiting > 0) {
      notes.push({
        text: `${woCounts.waiting} work order(s) waiting for assignment`,
        type: "warning",
        icon: <Clock className="text-amber-500" size={16} />,
        action: () => navigate("/work-orders?status=waiting"),
      });
    }

    // Warnings
    const proposalByWoId = new Set(proposals.map((p) => p?.woId).filter(Boolean));
    const missingProposal = wos.filter((w) => w?.id && !proposalByWoId.has(w.id)).length;
    if (missingProposal > 0) {
      notes.push({
        text: `${missingProposal} work order(s) without proposals`,
        type: "warning",
        icon: <FileSearch className="text-amber-500" size={16} />,
        action: () => navigate("/proposals"),
      });
    }

    const unpaidCosts = costs.filter((c) => c?.status && c.status !== "paid").length;
    if (unpaidCosts > 0) {
      notes.push({
        text: `${unpaidCosts} unpaid cost record(s)`,
        type: "warning",
        icon: <DollarSign className="text-amber-500" size={16} />,
        action: () => navigate("/costs?status=unpaid"),
      });
    }

    const woIds = new Set(wos.map((w) => w?.id).filter(Boolean));
    const orphans = files.filter((f) => f?.woId && !woIds.has(f.woId)).length;
    if (orphans > 0) {
      notes.push({
        text: `${orphans} orphaned file(s)`,
        type: "info",
        icon: <Paperclip className="text-blue-500" size={16} />,
        action: () => navigate("/files"),
      });
    }

    // Positive notifications
    if (woCounts.completed > 0) {
      notes.push({
        text: `${woCounts.completed} work order(s) completed`,
        type: "success",
        icon: <CheckCircle className="text-emerald-500" size={16} />,
        action: () => navigate("/work-orders?status=completed"),
      });
    }

    if (financialMetrics.estimatedProfit > 0) {
      notes.push({
        text: `Estimated profit: ${formatCurrency(financialMetrics.estimatedProfit)}`,
        type: "success",
        icon: <TrendingUp className="text-emerald-500" size={16} />,
        action: () => navigate("/costs"),
      });
    }

    // Add a positive message if no critical issues
    if (notes.length === 0) {
      notes.push({
        text: "All systems operational. No critical alerts.",
        type: "success",
        icon: <CheckCircle className="text-emerald-500" size={16} />,
        action: () => navigate("/work-orders"),
      });
    }

    return notes.slice(0, 6);
  }, [woCounts, proposals, wos, costs, files, financialMetrics, navigate]);

  // Top performing technicians (simulated)
  const topPerformers = useMemo(() => {
    const performers = [
      { name: "Mike Johnson", jobs: 12, revenue: 45000, rating: 4.8 },
      { name: "Sarah Chen", jobs: 8, revenue: 32000, rating: 4.9 },
      { name: "Alex Rodriguez", jobs: 6, revenue: 28000, rating: 4.7 },
    ];
    return performers;
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 via-transparent to-brand-600/5" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl animate-pulse" />
          
          <div className="relative">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-600/10 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-100">
                  <Sparkles size={16} className="animate-spin-slow" />
                  Real-time Dashboard
                  <div className="ml-2 h-2 w-2 animate-ping rounded-full bg-brand-500"></div>
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-brand-700 bg-clip-text text-transparent dark:from-white dark:to-brand-300">
                  Operations Command Center
                </h1>
                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                  Live overview of your field operations, finances, and team performance.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300">{now.date}</span>
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300">{now.time}</span>
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/50 p-3 text-center dark:bg-slate-800/50">
                    <div className="text-lg font-bold text-brand-600 dark:text-brand-400">
                      {wos.length}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Total WOs</div>
                  </div>
                  <div className="rounded-xl bg-white/50 p-3 text-center dark:bg-slate-800/50">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {proposals.length}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Proposals</div>
                  </div>
                  <div className="rounded-xl bg-white/50 p-3 text-center dark:bg-slate-800/50">
                    <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                      {files.length}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Files</div>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Data synced</div>
                  <div className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500"></div>
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Live
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionButton
            icon={ClipboardList}
            label="Create Work Order"
            description="Start new job"
            onClick={() => navigate("/work-orders")}
            color="brand"
          />
          <QuickActionButton
            icon={FileText}
            label="Create Proposal"
            description="Generate quote"
            onClick={() => navigate("/proposals")}
            color="emerald"
          />
          <QuickActionButton
            icon={DollarSign}
            label="Record Cost"
            description="Track expenses"
            onClick={() => navigate("/costs")}
            color="amber"
          />
          <QuickActionButton
            icon={Paperclip}
            label="Upload File"
            description="Attach documents"
            onClick={() => navigate("/files")}
            color="violet"
          />
        </div>

        {/* Main Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Work Orders"
            value={woCounts.total}
            sub="Total jobs"
            hint="View all work orders"
            onClick={() => navigate("/work-orders")}
            icon={ClipboardList}
            color="brand"
          />
          <StatCard
            title="Today's Schedule"
            value={woCounts.todaySchedule}
            sub="Jobs scheduled"
            hint="Check calendar view"
            onClick={() => navigate("/calendar")}
            icon={Calendar}
            color="emerald"
          />
          <StatCard
            title="Overdue"
            value={woCounts.overdue}
            sub="Require attention"
            hint="Review overdue items"
            onClick={() => navigate("/calendar")}
            icon={AlertCircle}
            color="rose"
          />
          <StatCard
            title="Estimated Profit"
            value={formatCurrency(financialMetrics.estimatedProfit)}
            sub="Based on proposals & costs"
            hint="Analyze financials"
            onClick={() => navigate("/costs")}
            icon={TrendingUp}
            color="violet"
          />
        </div>

        {/* Detailed Stats Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard
            title="Waiting"
            value={woCounts.waiting}
            sub="Need assignment"
            hint="Assign technicians"
            onClick={() => navigate("/work-orders?status=waiting")}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="In Progress"
            value={woCounts.inProgress}
            sub="Active jobs"
            hint="Track progress"
            onClick={() => navigate("/work-orders?status=in_progress")}
            icon={Zap}
            color="brand"
          />
          <StatCard
            title="Completed"
            value={woCounts.completed}
            sub="Ready for review"
            hint="Review completed work"
            onClick={() => navigate("/work-orders?status=completed")}
            icon={CheckCircle}
            color="emerald"
          />
        </div>

        {/* Activity & Notifications */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card
              title="Recent Activity"
              right={
                <button
                  onClick={() => navigate("/work-orders")}
                  className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  View all
                  <ChevronRight size={16} />
                </button>
              }
              className="h-full"
            >
              {activity.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 dark:border-slate-700">
                  <FileText size={48} className="text-slate-400 dark:text-slate-600" />
                  <div className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                    No activity yet
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Create a work order to get started
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.map((x, i) => (
                    <button
                      key={i}
                      type="button"
                      className={[
                        "group w-full text-left flex items-center gap-3",
                        "rounded-xl border border-slate-200 p-4 transition-all",
                        "dark:border-slate-800",
                        "hover:bg-slate-50 hover:border-slate-300",
                        "dark:hover:bg-slate-800/60 dark:hover:border-slate-700",
                        "active:scale-[0.98]",
                      ].join(" ")}
                      onClick={x.go}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">
                        {x.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white">{x.title}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {x.desc}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {x.time}
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Notifications & Quick Links */}
          <div className="space-y-6">
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <Bell size={18} />
                  Notifications
                  <NotificationBadge count={notifications.filter(n => n.type === 'critical').length} />
                </div>
              }
            >
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <button
                    key={i}
                    onClick={n.action}
                    className={[
                      "group w-full text-left flex items-start gap-3",
                      "rounded-xl p-3 transition-all",
                      n.type === 'critical' ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800' :
                      n.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                      'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800',
                      "hover:shadow-sm active:scale-[0.98]",
                    ].join(" ")}
                  >
                    <div className="mt-0.5">{n.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{n.text}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to view
                        <ChevronRight size={12} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Quick Links */}
            <Card title="Quick Links">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/work-orders?filter=urgent")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <Target size={20} className="text-rose-500" />
                  <span className="text-xs font-medium">Urgent</span>
                </button>
                <button
                  onClick={() => navigate("/calendar")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <Calendar size={20} className="text-brand-500" />
                  <span className="text-xs font-medium">Calendar</span>
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <BarChart3 size={20} className="text-emerald-500" />
                  <span className="text-xs font-medium">Reports</span>
                </button>
                <button
                  onClick={() => navigate("/technicians")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <Users size={20} className="text-violet-500" />
                  <span className="text-xs font-medium">Team</span>
                </button>
              </div>
            </Card>

            {/* Performance Summary */}
            <Card title="Performance Summary">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Profit Margin</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {financialMetrics.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                    style={{ width: `${Math.min(100, financialMetrics.profitMargin)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Proposals Value</span>
                  <span className="text-sm font-semibold">{formatCurrency(financialMetrics.totalProposalValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Costs</span>
                  <span className="text-sm font-semibold">{formatCurrency(financialMetrics.totalCostValue)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Section - Additional Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Performers */}
          <Card title="Top Performers">
            <div className="space-y-3">
              {topPerformers.map((performer, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-brand-500 to-violet-500 text-sm font-bold text-white">
                      {performer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium">{performer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {performer.jobs} jobs • ⭐ {performer.rating}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(performer.revenue)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Health */}
          <Card title="System Health">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm">Data Integrity</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">100%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm">Storage Usage</span>
                </div>
                <span className="text-sm font-semibold">
                  {((wos.length + proposals.length + costs.length + files.length) / 1000 * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm">Sync Status</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">Live</span>
              </div>
              
              <button
                onClick={() => {
                  const data = {
                    workOrders: wos.length,
                    proposals: proposals.length,
                    costs: costs.length,
                    files: files.length,
                    summary: `Dashboard export at ${now.full}`,
                  };
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                  alert("Dashboard summary copied to clipboard!");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-center gap-2">
                  <Download size={16} />
                  Export Summary
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}