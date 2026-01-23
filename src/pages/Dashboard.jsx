import { useMemo } from "react";
import PageTransition from "../components/PageTransition";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  DollarSign,
  FileText,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

function StatCard({ title, value, sub, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left w-full",
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        "ui-hover ui-focus tap-feedback",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {title}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {sub}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          <ArrowUpRight size={16} />
        </div>
      </div>

      {hint ? (
        <div className="mt-4 text-xs text-slate-600 dark:text-slate-300">
          {hint}
        </div>
      ) : null}
    </button>
  );
}

function Card({ title, right, children }) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
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

export default function Dashboard() {
  const navigate = useNavigate();

  const now = useMemo(() => new Date().toLocaleString(), []);

  const activity = [
    { t: "WO-1044 created", d: "TechCorp Inc.", time: "2h ago" },
    { t: "WO-1039 completed", d: "DataSystems LLC", time: "5h ago" },
    { t: "Cost submitted", d: "WO-1041 · $450", time: "9h ago" },
  ];

  const notifications = [
    "5 work orders pending approval",
    "New proposal drafted for WO-1044",
    "Payment received for WO-1032",
  ];

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Hero header (animated, but subtle and readable) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* animated brand glow */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-600/10 via-transparent to-brand-600/10 animate-pulse" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl" />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-600/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-100">
                <Sparkles size={14} />
                Today’s Snapshot
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight">
                Dashboard Overview
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Quick snapshot of work orders, costs, and team activity.
              </p>

              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {now}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/work-orders")}
              >
                <ClipboardList size={16} />
                Create Work Order
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/costs")}
              >
                <DollarSign size={16} />
                Add Cost
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/proposals")}
              >
                <FileText size={16} />
                Create Proposal
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Work Orders"
            value="128"
            sub="All time"
            hint="View full list and filters"
            onClick={() => navigate("/work-orders")}
          />
          <StatCard
            title="Pending"
            value="12"
            sub="Waiting for assignment"
            hint="Assign technicians quickly"
            onClick={() => navigate("/work-orders")}
          />
          <StatCard
            title="In Progress"
            value="7"
            sub="Technicians onsite"
            hint="Track ETA & updates"
            onClick={() => navigate("/work-orders")}
          />
          <StatCard
            title="Completed"
            value="109"
            sub="Closed this month"
            hint="Review and invoice"
            onClick={() => navigate("/work-orders")}
          />
        </div>

        {/* Activity + Notifications */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card
              title="Recent Activity"
              right={
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last 24h
                </span>
              }
            >
              <div className="space-y-3">
                {activity.map((x, i) => (
                  <button
                    key={i}
                    type="button"
                    className={[
                      "w-full text-left flex items-center justify-between gap-3",
                      "rounded-xl border border-slate-200 p-4",
                      "dark:border-slate-800",
                      "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      "ui-hover ui-focus tap-feedback",
                    ].join(" ")}
                    onClick={() => navigate("/work-orders")}
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{x.t}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {x.d}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {x.time}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Notifications">
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <div
                  key={i}
                  className={[
                    "rounded-xl border border-slate-200 p-4 text-sm",
                    "dark:border-slate-800",
                    "bg-white dark:bg-slate-900",
                    "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                    "ui-hover",
                  ].join(" ")}
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/work-orders")}
              >
                View Work Orders
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
