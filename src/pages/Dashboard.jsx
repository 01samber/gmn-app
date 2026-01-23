import { useMemo } from "react";
import PageTransition from "../components/PageTransition";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  DollarSign,
  FileText,
  ArrowUpRight,
  Sparkles,
  Paperclip,
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
  return `${d}d ago`;
}

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
          <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          <ArrowUpRight size={16} />
        </div>
      </div>

      {hint ? (
        <div className="mt-4 text-xs text-slate-600 dark:text-slate-300">{hint}</div>
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

  const wos = useMemo(() => loadList(WO_STORAGE_KEY), []);
  const proposals = useMemo(() => loadList(PROPOSALS_STORAGE_KEY), []);
  const costs = useMemo(() => loadList(COSTS_STORAGE_KEY), []);
  const files = useMemo(() => loadList(FILES_STORAGE_KEY), []);

  const woCounts = useMemo(() => {
    const total = wos.length;
    const waiting = wos.filter((w) => w?.status === "waiting").length;
    const inProgress = wos.filter((w) => w?.status === "in_progress").length;
    const completed = wos.filter((w) => w?.status === "completed").length;
    const invoiced = wos.filter((w) => w?.status === "invoiced").length;
    const paid = wos.filter((w) => w?.status === "paid").length;

    return { total, waiting, inProgress, completed, invoiced, paid };
  }, [wos]);

  const activity = useMemo(() => {
    const events = [];

    for (const w of wos) {
      const t = toMs(w?.updatedAt) || toMs(w?.createdAt) || 0;
      if (!t) continue;
      events.push({
        at: t,
        type: "wo",
        title: `${w.wo || "WO"} ${w.status ? w.status.replaceAll("_", " ") : "updated"}`,
        desc: w.client || "—",
        go: () => navigate("/work-orders"),
      });
    }

    for (const p of proposals) {
      const t = toMs(p?.createdAt) || 0;
      if (!t) continue;
      events.push({
        at: t,
        type: "proposal",
        title: `Proposal saved`,
        desc: `${p.wo || "WO"} · ${p.client || "—"}`,
        go: () => navigate("/proposals"),
      });
    }

    for (const c of costs) {
      const t = toMs(c?.createdAt) || 0;
      if (!t) continue;
      const amt = Number(c?.amount || 0);
      events.push({
        at: t,
        type: "cost",
        title: `Cost ${c?.status || "saved"}`,
        desc: `${c?.wo || "WO"} · $${amt.toFixed(2)}`,
        go: () => navigate("/costs"),
      });
    }

    for (const f of files) {
      const t = toMs(f?.createdAt) || 0;
      if (!t) continue;
      events.push({
        at: t,
        type: "file",
        title: `File uploaded`,
        desc: `${f.name || "File"} · ${f.type || "—"}`,
        go: () => navigate("/files"),
      });
    }

    // keep last 24h (soft), but show something even if empty
    const last24 = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = events.filter((e) => e.at >= last24);

    return (filtered.length ? filtered : events)
      .sort((a, b) => b.at - a.at)
      .slice(0, 6)
      .map((e) => ({ ...e, time: relativeTime(e.at) }));
  }, [wos, proposals, costs, files, navigate]);

  const notifications = useMemo(() => {
    const notes = [];

    const waiting = woCounts.waiting;
    if (waiting > 0) notes.push(`${waiting} work order(s) waiting for assignment`);

    // “missing proposal” = WOs with no proposal saved
    const proposalByWoId = new Set(proposals.map((p) => p?.woId).filter(Boolean));
    const missingProposal = wos.filter((w) => w?.id && !proposalByWoId.has(w.id)).length;
    if (missingProposal > 0) notes.push(`${missingProposal} work order(s) without a proposal yet`);

    // unpaid costs
    const unpaidCosts = costs.filter((c) => c?.status && c.status !== "paid").length;
    if (unpaidCosts > 0) notes.push(`${unpaidCosts} cost record(s) not marked paid`);

    // orphaned files
    const woIds = new Set(wos.map((w) => w?.id).filter(Boolean));
    const orphans = files.filter((f) => f?.woId && !woIds.has(f.woId)).length;
    if (orphans > 0) notes.push(`${orphans} file(s) attached to missing work orders (orphans)`);

    return notes.length ? notes.slice(0, 6) : ["All caught up. No critical alerts right now."];
  }, [woCounts.waiting, proposals, wos, costs, files]);

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                Live snapshot from your saved data (Work Orders, Proposals, Costs, Files).
              </p>

              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {now}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/work-orders")}
              >
                <ClipboardList size={16} />
                Create Work Order
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/costs")}
              >
                <DollarSign size={16} />
                Add Cost
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/proposals")}
              >
                <FileText size={16} />
                Create Proposal
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/files")}
              >
                <Paperclip size={16} />
                Upload File
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Work Orders"
            value={woCounts.total}
            sub="All saved"
            hint="View full list and filters"
            onClick={() => navigate("/work-orders")}
          />
          <StatCard
            title="Waiting"
            value={woCounts.waiting}
            sub="Needs assignment / action"
            hint="Assign technicians quickly"
            onClick={() => navigate("/work-orders")}
          />
          <StatCard
            title="In Progress"
            value={woCounts.inProgress}
            sub="Technicians onsite"
            hint="Track ETA & updates"
            onClick={() => navigate("/work-orders")}
          />
          <StatCard
            title="Completed"
            value={woCounts.completed}
            sub="Done (not invoiced/paid)"
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
                  Latest
                </span>
              }
            >
              {activity.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  No activity yet. Create a work order to get started.
                </div>
              ) : (
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
                      onClick={x.go}
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{x.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {x.desc}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {x.time}
                      </div>
                    </button>
                  ))}
                </div>
              )}
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/work-orders")}
              >
                Work Orders
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => navigate("/proposals")}
              >
                Proposals
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
