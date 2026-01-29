const MAP = {
  waiting: { label: "Waiting", cls: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 ring-amber-200/80 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-200 dark:ring-amber-700/50", dot: "bg-amber-500" },
  in_progress: { label: "In Progress", cls: "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 ring-sky-200/80 dark:from-sky-900/30 dark:to-blue-900/30 dark:text-sky-200 dark:ring-sky-700/50", dot: "bg-sky-500 animate-pulse" },
  completed: { label: "Completed", cls: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200/80 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-200 dark:ring-emerald-700/50", dot: "bg-emerald-500" },
  invoiced: { label: "Invoiced", cls: "bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 ring-violet-200/80 dark:from-violet-900/30 dark:to-purple-900/30 dark:text-violet-200 dark:ring-violet-700/50", dot: "bg-violet-500" },
  paid: { label: "Paid", cls: "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 ring-green-200/80 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200 dark:ring-green-700/50", dot: "bg-green-500" },
  overdue: { label: "Overdue", cls: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200/80 dark:from-rose-900/30 dark:to-red-900/30 dark:text-rose-200 dark:ring-rose-700/50", dot: "bg-rose-500 animate-pulse" },
  blocked: { label: "Blocked", cls: "bg-slate-100 text-slate-800 ring-slate-300/80 dark:bg-slate-800/60 dark:text-slate-100 dark:ring-slate-600/50", dot: "bg-slate-500" },
  canceled: { label: "Canceled", cls: "bg-slate-50 text-slate-500 ring-slate-200/80 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700/50", dot: "bg-slate-400" },
};

function normalizeStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "in progress" || s === "in-progress") return "in_progress";
  return s || "waiting";
}

export default function StatusBadge({ status = "waiting", title, compact = false, withDot = false }) {
  const key = normalizeStatus(status);
  const s = MAP[key] || { label: "Unknown", cls: "bg-slate-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" };

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center font-semibold ring-1 ring-inset transition-all duration-300",
        compact ? "rounded-full px-2.5 py-1 text-[11px]" : "rounded-full px-3 py-1.5 text-xs",
        s.cls,
      ].join(" ")}
    >
      {withDot && <span className={`mr-2 inline-block h-2 w-2 rounded-full ${s.dot}`} />}
      {s.label}
    </span>
  );
}
