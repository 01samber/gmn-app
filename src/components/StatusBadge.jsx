import clsx from "clsx";

const map = {
  waiting: { label: "Waiting", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  in_progress: { label: "In Progress", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  invoiced: { label: "Invoiced", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  paid: { label: "Paid", cls: "bg-green-50 text-green-700 ring-green-200" },
};

export default function StatusBadge({ status = "waiting" }) {
  const s = map[status] || { label: status, cls: "bg-slate-50 text-slate-700 ring-slate-200" };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        s.cls
      )}
    >
      {s.label}
    </span>
  );
}
