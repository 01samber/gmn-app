import clsx from "clsx";

const MAP = {
  waiting: {
    label: "Waiting",
    cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40",
  },
  in_progress: {
    label: "In Progress",
    cls: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-900/40",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/40",
  },
  invoiced: {
    label: "Invoiced",
    cls: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-200 dark:ring-violet-900/40",
  },
  paid: {
    label: "Paid",
    cls: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-900/40",
  },

  // Real-world statuses you will need:
  overdue: {
    label: "Overdue",
    cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-200 dark:ring-rose-900/40",
  },
  blocked: {
    label: "Blocked",
    cls: "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-100 dark:ring-slate-700",
  },
  canceled: {
    label: "Canceled",
    cls: "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-800",
  },
};

function normalizeStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  // allow common variants
  if (s === "in progress") return "in_progress";
  if (s === "in-progress") return "in_progress";
  return s || "waiting";
}

export default function StatusBadge({
  status = "waiting",
  title,
  compact = false,
  withDot = false,
}) {
  const key = normalizeStatus(status);
  const s = MAP[key] || {
    label: "Unknown",
    cls: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800",
  };

  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center font-semibold ring-1 ring-inset",
        compact ? "rounded-full px-2 py-0.5 text-[11px]" : "rounded-full px-2.5 py-1 text-xs",
        s.cls
      )}
    >
      {withDot ? (
        <span
          className={clsx(
            "mr-1.5 inline-block h-2 w-2 rounded-full",
            // dot inherits tone by using currentColor-ish approach:
            "bg-current opacity-60"
          )}
          aria-hidden="true"
        />
      ) : null}
      {s.label}
    </span>
  );
}
