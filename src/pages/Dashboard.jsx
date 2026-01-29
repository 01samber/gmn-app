import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList, Users, DollarSign, FileText, TrendingUp, AlertTriangle,
  CalendarDays, Clock, CheckCircle2, ArrowUpRight, Sparkles, Activity
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { dashboardApi } from "../api";

function StatCard({ icon: Icon, label, value, subValue, trend, color = "brand", to }) {
  const colors = {
    brand: "from-brand-500 to-brand-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    violet: "from-violet-500 to-violet-600",
    rose: "from-rose-500 to-rose-600",
  };

  const content = (
    <div className="card p-6 group hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {subValue && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subValue}</p>}
      </div>
      {to && (
        <div className="mt-4 flex items-center text-sm font-medium text-brand-600 dark:text-brand-400 group-hover:gap-2 transition-all">
          View all <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function AlertCard({ icon: Icon, title, count, description, to, color = "amber" }) {
  const colors = {
    amber: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800",
    rose: "from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border-rose-200 dark:border-rose-800",
  };

  return (
    <Link to={to} className={`block p-4 rounded-xl bg-gradient-to-r ${colors[color]} border transition-all hover:shadow-lg`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color === "rose" ? "bg-rose-100 dark:bg-rose-900/30" : "bg-amber-100 dark:bg-amber-900/30"} flex items-center justify-center`}>
          <Icon size={20} className={color === "rose" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color === "rose" ? "bg-rose-200 text-rose-800 dark:bg-rose-800 dark:text-rose-200" : "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"}`}>
              {count}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageLoader message="Loading dashboard..." />;
  if (error) return <ErrorMessage error={error} onRetry={loadStats} />;
  if (!stats) return null;

  const { overview, alerts, financial, topTechnicians, statusBreakdown, recentActivity } = stats;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="text-brand-500" />
              Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back! Here's your overview.</p>
          </div>
        </div>

        {/* Alerts */}
        {(alerts.overdueWorkOrders > 0 || alerts.pendingCosts > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {alerts.overdueWorkOrders > 0 && (
              <AlertCard
                icon={AlertTriangle}
                title="Overdue Work Orders"
                count={alerts.overdueWorkOrders}
                description="Need immediate attention"
                to="/calendar?filter=overdue"
                color="rose"
              />
            )}
            {alerts.pendingCosts > 0 && (
              <AlertCard
                icon={DollarSign}
                title="Pending Payments"
                count={alerts.pendingCosts}
                description="Awaiting approval"
                to="/costs?status=requested"
                color="amber"
              />
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Total Work Orders"
            value={overview.totalWorkOrders}
            subValue={`${overview.activeWorkOrders} active`}
            color="brand"
            to="/work-orders"
          />
          <StatCard
            icon={Users}
            label="Technicians"
            value={overview.totalTechnicians}
            subValue="Available"
            color="emerald"
            to="/technicians"
          />
          <StatCard
            icon={FileText}
            label="Proposals"
            value={overview.totalProposals}
            subValue={`$${financial.totalProposalValue.toLocaleString()} total`}
            color="violet"
            to="/proposals"
          />
          <StatCard
            icon={DollarSign}
            label="Costs"
            value={overview.totalCosts}
            subValue={`$${financial.totalCostPaid.toLocaleString()} paid`}
            color="amber"
            to="/costs"
          />
        </div>

        {/* Financial & Status */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Financial Summary */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="text-emerald-500" size={20} />
              Financial Summary
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400">Total Proposal Value</span>
                <span className="font-semibold text-lg">${financial.totalProposalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400">Total Costs</span>
                <span className="font-semibold text-lg">${financial.totalCostRequested.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <span className="text-emerald-700 dark:text-emerald-400">Profit Margin</span>
                <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">{financial.profitMargin}%</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Activity className="text-brand-500" size={20} />
              Work Order Status
            </h2>
            <div className="space-y-3">
              {[
                { key: "waiting", label: "Waiting", color: "bg-amber-500" },
                { key: "in_progress", label: "In Progress", color: "bg-sky-500" },
                { key: "completed", label: "Completed", color: "bg-emerald-500" },
              ].map(({ key, label, color }) => {
                const count = statusBreakdown[key] || 0;
                const percentage = overview.totalWorkOrders ? Math.round((count / overview.totalWorkOrders) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="font-medium">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Technicians & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Technicians */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Users className="text-violet-500" size={20} />
              Top Performers
            </h2>
            <div className="space-y-3">
              {topTechnicians.slice(0, 5).map((tech, idx) => (
                <div key={tech.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-200 text-slate-700" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{tech.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tech.trade}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{tech.jobsDone} jobs</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">${tech.gmnMoneyMade.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="text-cyan-500" size={20} />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((wo) => (
                <Link
                  key={wo.id}
                  to="/work-orders"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${wo.status === "completed" ? "bg-emerald-500" : wo.status === "in_progress" ? "bg-sky-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{wo.woNumber}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{wo.client}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(wo.updatedAt).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
