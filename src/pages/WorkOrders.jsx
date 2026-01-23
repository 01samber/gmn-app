import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import PageTransition from "../components/PageTransition";
import {
  Eye,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  CalendarDays,
} from "lucide-react";

const FILES_STORAGE_KEY = "gmn_files_v1";
const TECH_STORAGE_KEY = "gmn_techs_v1";
const WO_STORAGE_KEY = "gmn_workorders_v1";
const PROPOSALS_STORAGE_KEY = "gmn_proposals_v1";
const COSTS_STORAGE_KEY = "gmn_costs_v1";

/**
 * ETA RULE (important):
 * - `etaAt` is the truth (ISO string).
 * - `eta` is display fallback only (legacy).
 * Calendar/Todo should use etaAt.
 */
const seed = [
  {
    id: "1",
    wo: "WO-1044",
    client: "TechCorp Inc.",
    trade: "Electric",
    nte: 1500,
    status: "in_progress",
    etaAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2h
    eta: "Today 2:00 PM",
    city: "Riyadh",
    technicianId: "",
    technicianName: "",
  },
  {
    id: "2",
    wo: "WO-1041",
    client: "DataSystems LLC",
    trade: "HVAC",
    nte: 2500,
    status: "waiting",
    etaAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24h
    eta: "Tomorrow 10:00 AM",
    city: "Jeddah",
    technicianId: "",
    technicianName: "",
  },
  {
    id: "3",
    wo: "WO-1039",
    client: "Innovate Co.",
    trade: "Plumbing",
    nte: 980,
    status: "completed",
    etaAt: "",
    eta: "Yesterday",
    city: "Dammam",
    technicianId: "",
    technicianName: "",
  },
];

function safeParse(raw, fallback) {
  try {
    const v = raw ? JSON.parse(raw) : fallback;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadFiles() {
  const parsed = safeParse(localStorage.getItem(FILES_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadTechs() {
  const parsed = safeParse(localStorage.getItem(TECH_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadWorkOrders() {
  const parsed = safeParse(localStorage.getItem(WO_STORAGE_KEY), null);
  if (Array.isArray(parsed) && parsed.length) return parsed;
  return null;
}

function saveWorkOrders(rows) {
  localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(rows));
}

function loadProposals() {
  const parsed = safeParse(localStorage.getItem(PROPOSALS_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadCosts() {
  const parsed = safeParse(localStorage.getItem(COSTS_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function money(n) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(n || 0));
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/**
 * Strict rule:
 * - Only technicians from Tech List
 * - Exclude blacklisted
 */
function normalizeTrade(s) {
  return String(s || "").trim().toLowerCase();
}

function isEligibleForTrade(techTrade, woTrade) {
  const t = normalizeTrade(techTrade);
  const w = normalizeTrade(woTrade);

  if (!t || !w) return true;
  if (t === "all trades") return true;
  if (t.startsWith("other:")) return true;
  if (w === "general" && t === "handyman") return true;

  return t === w;
}

function Badge({ tone = "slate", children, title }) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800",
    brand:
      "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-600/15 dark:text-brand-100 dark:ring-brand-600/30",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/40",
    sky:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-900/40",
    amber:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40",
    rose:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-200 dark:ring-rose-900/40",
  };

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap",
        tones[tone] || tones.slate,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v) {
  // v from <input type="datetime-local"> is local time without timezone.
  // Convert to ISO reliably.
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function formatEta(etaAt, legacyEta) {
  if (etaAt) {
    const d = new Date(etaAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return legacyEta || "TBD";
}

function isOverdue(status, etaAt) {
  if (!etaAt) return false;
  if (status === "completed" || status === "paid" || status === "invoiced")
    return false;
  const t = new Date(etaAt).getTime();
  if (!Number.isFinite(t)) return false;
  return t < Date.now();
}

export default function WorkOrders() {
  const navigate = useNavigate();

  const [rows, setRows] = useState(() => loadWorkOrders() || seed);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [openCreate, setOpenCreate] = useState(false);

  const [openAssign, setOpenAssign] = useState(false);
  const [assignRow, setAssignRow] = useState(null);

  const [openView, setOpenView] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  // ✅ Migrate legacy rows to include etaAt (non-breaking)
  useEffect(() => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        etaAt: typeof r.etaAt === "string" ? r.etaAt : "",
        eta: typeof r.eta === "string" ? r.eta : "",
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist WOs
  useEffect(() => {
    saveWorkOrders(rows);
  }, [rows]);

  // Refresh badges when page refocuses
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    function onFocus() {
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const proposals = useMemo(() => loadProposals(), [refreshKey, rows.length]);
  const costs = useMemo(() => loadCosts(), [refreshKey, rows.length]);
  const files = useMemo(() => loadFiles(), [refreshKey, rows.length]);

  const proposalByWO = useMemo(() => {
    const map = new Map();
    for (const p of proposals) {
      if (!p?.woId) continue;
      map.set(p.woId, (map.get(p.woId) || 0) + 1);
    }
    return map;
  }, [proposals]);

  const paidByWO = useMemo(() => {
    const map = new Map();
    for (const c of costs) {
      if (!c?.woId) continue;
      if (c.status === "paid") map.set(c.woId, (map.get(c.woId) || 0) + 1);
    }
    return map;
  }, [costs]);

  const filesByWO = useMemo(() => {
    const map = new Map();
    for (const f of files) {
      if (!f?.woId) continue;
      map.set(f.woId, (map.get(f.woId) || 0) + 1);
    }
    return map;
  }, [files]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesText =
        !text ||
        r.wo.toLowerCase().includes(text) ||
        r.client.toLowerCase().includes(text) ||
        r.trade.toLowerCase().includes(text) ||
        (r.city || "").toLowerCase().includes(text) ||
        (r.technicianName || "").toLowerCase().includes(text);

      const matchesStatus = status === "all" || r.status === status;
      return matchesText && matchesStatus;
    });
  }, [rows, q, status]);

  function createWorkOrder(form) {
    const etaAt = fromLocalInputValue(form.etaLocal);
    const newRow = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      wo: form.wo || `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      client: form.client,
      trade: form.trade,
      nte: Number(form.nte || 0),
      status: form.status,
      etaAt, // ✅ source of truth
      eta: etaAt ? "" : (form.etaText || "TBD"), // fallback only
      city: form.city || "",
      technicianId: "",
      technicianName: "",
    };
    setRows((prev) => [newRow, ...prev]);
  }

  function setWorkOrderStatus(rowId, nextStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, status: nextStatus } : r))
    );
  }

  function setWorkOrderEta(rowId, nextEtaAt, nextEtaText = "") {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              etaAt: nextEtaAt,
              eta: nextEtaAt ? "" : String(nextEtaText || ""),
            }
          : r
      )
    );
  }

  function assignTechnicianToRow(rowId, tech) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              technicianId: tech?.id || "",
              technicianName: tech?.name || "",
            }
          : r
      )
    );
  }

  function unassignTechnician(rowId) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, technicianId: "", technicianName: "" } : r
      )
    );
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Work Orders"
          subtitle="Search, filter, assign technicians, and track Proposal/Files/Payment state."
          actions={
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost"
                onClick={() => {
                  setQ("");
                  setStatus("all");
                }}
                type="button"
              >
                Reset
              </button>

              <button
                className="btn-primary"
                onClick={() => setOpenCreate(true)}
                type="button"
              >
                + Create Work Order
              </button>
            </div>
          }
        />

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ui-hover">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <input
                className="input"
                placeholder="Search WO#, client, trade, city, technician…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Status: All</option>
                <option value="waiting">Waiting</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="md:col-span-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <span className="font-semibold">Results</span>
              <span className="tabular-nums">{filtered.length}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Work Orders</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Badges are auto-detected from saved Proposals, attached Files,
                and paid Costs. ETA uses a real timestamp (etaAt) for Calendar/Todo.
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {filtered.length} items
            </div>
          </div>

          <div className="overflow-auto gmn-scroll">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">WO#</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Trade</th>
                  <th className="px-4 py-3 text-left font-semibold">City</th>
                  <th className="px-4 py-3 text-left font-semibold">NTE</th>
                  <th className="px-4 py-3 text-left font-semibold">ETA</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, idx) => {
                  const proposalCount = proposalByWO.get(r.id) || 0;
                  const paidCount = paidByWO.get(r.id) || 0;
                  const fileCount = filesByWO.get(r.id) || 0;

                  const needsTech =
                    r.status === "completed" ||
                    r.status === "invoiced" ||
                    r.status === "paid";

                  const overdue = isOverdue(r.status, r.etaAt);

                  return (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      className={[
                        "group border-t border-slate-100 dark:border-slate-800/70",
                        idx % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50/30 dark:bg-slate-900/60",
                        "hover:bg-brand-50/40 dark:hover:bg-brand-600/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 focus-visible:ring-inset",
                        "transition-colors",
                      ].join(" ")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setViewRow(r);
                          setOpenView(true);
                        }
                      }}
                      onDoubleClick={() => {
                        setViewRow(r);
                        setOpenView(true);
                      }}
                    >
                      <td className="px-4 py-3 font-semibold">{r.wo}</td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{r.client}</div>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {r.technicianName ? (
                            <Badge tone="slate" title="Assigned technician">
                              Tech: {r.technicianName}
                            </Badge>
                          ) : (
                            <Badge
                              tone={needsTech ? "amber" : "slate"}
                              title={
                                needsTech
                                  ? "This status normally needs a technician assigned"
                                  : "No technician assigned yet"
                              }
                            >
                              Tech: —
                            </Badge>
                          )}

                          {proposalCount > 0 ? (
                            <Badge
                              tone="brand"
                              title={`${proposalCount} proposal(s) saved for this WO`}
                            >
                              Proposal ✓
                            </Badge>
                          ) : null}

                          {fileCount > 0 ? (
                            <Badge
                              tone="sky"
                              title={`${fileCount} file(s) attached to this WO`}
                            >
                              Files ✓
                            </Badge>
                          ) : null}

                          {paidCount > 0 ? (
                            <Badge
                              tone="emerald"
                              title={`Paid costs found (${paidCount}) for this WO`}
                            >
                              Costs Paid ✓
                            </Badge>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3">{r.trade}</td>
                      <td className="px-4 py-3">{r.city || "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{money(r.nte)}</td>

                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {formatEta(r.etaAt, r.eta)}
                        </div>
                        {overdue ? (
                          <div className="mt-1">
                            <Badge tone="rose" title="ETA is in the past and WO is not closed">
                              Overdue
                            </Badge>
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
<StatusBadge status={r.status} compact withDot />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                            onClick={() => {
                              setViewRow(r);
                              setOpenView(true);
                            }}
                            type="button"
                          >
                            <Eye size={14} />
                            View
                          </button>

                          <button
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 dark:bg-white dark:text-slate-900 ui-hover ui-focus tap-feedback"
                            onClick={() => {
                              setAssignRow(r);
                              setOpenAssign(true);
                            }}
                            type="button"
                          >
                            <UserPlus size={14} />
                            Assign
                          </button>

                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                            onClick={() =>
                              navigate("/calendar", { state: { woId: r.id } })
                            }
                            title="Open Calendar/Todo focused on this WO"
                            type="button"
                          >
                            <CalendarDays size={14} />
                            Calendar
                          </button>

                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                            onClick={() =>
                              navigate("/proposals", { state: { woId: r.id } })
                            }
                            title="Create proposal from this Work Order"
                            type="button"
                          >
                            <FileText size={14} />
                            Proposal
                          </button>

                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                            onClick={() =>
                              navigate("/files", { state: { woId: r.id } })
                            }
                            title="Attach files to this Work Order"
                            type="button"
                          >
                            <FolderOpen size={14} />
                            Files
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="text-sm font-semibold">No results</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Try clearing filters or searching by WO#.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Next: Invoice export (PDF) after we finalize invoice layout.
            </div>
            <div className="flex gap-2">
              <button
                className="btn-ghost inline-flex items-center gap-2 text-xs"
                onClick={() => alert("Pagination coming next")}
                type="button"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                className="btn-ghost inline-flex items-center gap-2 text-xs"
                onClick={() => alert("Pagination coming next")}
                type="button"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <CreateWorkOrderModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onCreate={(form) => {
            createWorkOrder(form);
            setOpenCreate(false);
          }}
        />

        <AssignTechnicianModal
          open={openAssign}
          row={assignRow}
          onClose={() => setOpenAssign(false)}
          onGoToTechnicians={() => {
            setOpenAssign(false);
            navigate("/technicians");
          }}
          onAssign={(tech) => {
            if (!assignRow) return;
            assignTechnicianToRow(assignRow.id, tech);
            setOpenAssign(false);
          }}
          onUnassign={() => {
            if (!assignRow) return;
            unassignTechnician(assignRow.id);
            setOpenAssign(false);
          }}
        />

        <ViewWorkOrderModal
          open={openView}
          row={viewRow}
          onClose={() => setOpenView(false)}
          onSetStatus={(next) => {
            if (!viewRow) return;
            setWorkOrderStatus(viewRow.id, next);
            setViewRow((p) => (p ? { ...p, status: next } : p));
          }}
          onSetEta={(etaAt, etaText) => {
            if (!viewRow) return;
            setWorkOrderEta(viewRow.id, etaAt, etaText);
            setViewRow((p) => (p ? { ...p, etaAt, eta: etaAt ? "" : (etaText || "") } : p));
          }}
          proposals={proposals}
          files={files}
          onGoToProposals={(woId) => navigate("/proposals", { state: { woId } })}
          onGoToFiles={(woId) => navigate("/files", { state: { woId } })}
          onGoToCalendar={(woId) => navigate("/calendar", { state: { woId } })}
        />
      </div>
    </PageTransition>
  );
}

function CreateWorkOrderModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    wo: "",
    client: "",
    trade: "Electrical",
    city: "",
    nte: "",
    status: "waiting",
    // ✅ real scheduling
    etaLocal: "",
    // legacy fallback (optional)
    etaText: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      wo: "",
      client: "",
      trade: "Electrical",
      city: "",
      nte: "",
      status: "waiting",
      etaLocal: "",
      etaText: "",
    });
  }, [open]);

  const canSubmit =
    form.client.trim().length >= 2 && String(form.nte).trim().length > 0;

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  return (
    <Modal
      open={open}
      title="Create Work Order"
      subtitle="Use a real ETA date/time so Calendar/Todo can stay synced."
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Work Order # (optional)">
          <input
            className="input"
            placeholder="Auto-generate if empty"
            value={form.wo}
            onChange={(e) => update("wo", e.target.value)}
          />
        </Field>

        <Field label="Client *">
          <input
            className="input"
            placeholder="Company name"
            value={form.client}
            onChange={(e) => update("client", e.target.value)}
          />
        </Field>

        <Field label="Trade">
          <select
            className="input"
            value={form.trade}
            onChange={(e) => update("trade", e.target.value)}
          >
            <option>Handyman</option>
            <option>HVAC</option>
            <option>Plumbing</option>
            <option>Electric</option>
            <option>Doors</option>
            <option>Locksmith</option>
            <option>Painting</option>
            <option>Flooring</option>
            <option>Roofing</option>
            <option>Cleaning Services</option>
            <option>Landscaping</option>
            <option>Overhead Doors</option>
            <option>Window / Glass / Tinting</option>
            <option>All Trades</option>
            <option>Other (Custom)</option>
          </select>
        </Field>

        <Field label="City">
          <input
            className="input"
            placeholder="Riyadh, Jeddah…"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </Field>

        <Field label="NTE (Not To Exceed) *">
          <input
            type="number"
            min="0"
            className="input"
            placeholder="1500"
            value={form.nte}
            onChange={(e) => update("nte", e.target.value)}
          />
        </Field>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="waiting">Waiting</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </Field>

        <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
          <Field label="ETA (date/time — recommended)">
            <input
              type="datetime-local"
              className="input"
              value={form.etaLocal}
              onChange={(e) => update("etaLocal", e.target.value)}
            />
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Calendar/Todo will use this.
            </div>
          </Field>

          <Field label="ETA label (legacy fallback)">
            <input
              className="input"
              placeholder="If you refuse to schedule, put text here…"
              value={form.etaText}
              onChange={(e) => update("etaText", e.target.value)}
            />
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Only used if no date/time is set.
            </div>
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Fields marked * are required.
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5" type="button">
            Cancel
          </button>

          <button
            disabled={!canSubmit}
            onClick={() => onCreate(form)}
            className={[
              "rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm ui-hover ui-focus tap-feedback",
              canSubmit
                ? "bg-brand-600 hover:bg-brand-700"
                : "bg-slate-300 cursor-not-allowed dark:bg-slate-700",
            ].join(" ")}
            type="button"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssignTechnicianModal({
  open,
  row,
  onClose,
  onGoToTechnicians,
  onAssign,
  onUnassign,
}) {
  const techs = useMemo(() => loadTechs(), [open]);
  const activeTechs = useMemo(() => techs.filter((t) => !t.blacklisted), [techs]);

  const eligibleTechs = useMemo(() => {
    if (!row) return activeTechs;
    return activeTechs.filter((t) => isEligibleForTrade(t.trade, row.trade));
  }, [activeTechs, row]);

  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (open) setSelectedId("");
  }, [open]);

  const hasAnyTechs = activeTechs.length > 0;
  const hasEligible = eligibleTechs.length > 0;

  return (
    <Modal
      open={open}
      title="Assign Technician"
      subtitle={
        row
          ? `Work Order: ${row.wo} • Trade: ${row.trade}`
          : "Choose from the official tech list."
      }
      onClose={onClose}
    >
      {!hasAnyTechs ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
            No technicians found. You must add technicians first.
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost px-4 py-2.5" type="button">
              Close
            </button>
            <button onClick={onGoToTechnicians} className="btn-primary" type="button">
              Go to Technicians
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!hasEligible ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
              No eligible technicians match this trade. Add more technicians or
              mark a technician as “All Trades”.
            </div>
          ) : null}

          <Field label="Technician (from Tech List only)">
            <select
              className="input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!hasEligible}
            >
              <option value="" disabled>
                Select technician
              </option>
              {eligibleTechs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} • {t.trade}
                </option>
              ))}
            </select>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Blacklisted technicians never appear here.
            </div>
          </Field>

          <div className="flex items-center justify-between gap-2">
            {row?.technicianName ? (
              <button
                type="button"
                onClick={onUnassign}
                className="btn-ghost px-4 py-2.5"
              >
                Unassign
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost px-4 py-2.5" type="button">
                Cancel
              </button>

              <button
                className="btn-primary"
                disabled={!selectedId}
                onClick={() => {
                  const chosen = eligibleTechs.find((t) => t.id === selectedId);
                  if (!chosen) return;
                  onAssign(chosen);
                }}
                type="button"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ViewWorkOrderModal({
  open,
  row,
  onClose,
  onSetStatus,
  onSetEta,
  proposals = [],
  files = [],
  onGoToProposals,
  onGoToFiles,
  onGoToCalendar,
}) {
  const [etaLocal, setEtaLocal] = useState("");
  const [etaText, setEtaText] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setEtaLocal(toLocalInputValue(row.etaAt));
    setEtaText(row.eta || "");
  }, [open, row]);

  if (!row) return null;

  const relatedProposals = proposals.filter((p) => p?.woId === row.id);
  const relatedFiles = files.filter((f) => f?.woId === row.id);

  return (
    <Modal
      open={open}
      title="Work Order Details"
      subtitle={`${row.wo} • ${row.client}`}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Trade</div>
          <div className="mt-1 font-semibold">{row.trade}</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">City</div>
          <div className="mt-1 font-semibold">{row.city || "—"}</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">NTE</div>
          <div className="mt-1 font-semibold tabular-nums">{money(row.nte)}</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">ETA</div>
          <div className="mt-1 font-semibold">
            {formatEta(row.etaAt, row.eta)}
          </div>
          <div className="mt-3 grid gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                ETA (date/time)
              </div>
              <input
                type="datetime-local"
                className="input mt-1"
                value={etaLocal}
                onChange={(e) => setEtaLocal(e.target.value)}
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                ETA label (fallback)
              </div>
              <input
                className="input mt-1"
                value={etaText}
                onChange={(e) => setEtaText(e.target.value)}
                placeholder="Optional…"
              />
            </div>

            <div className="flex justify-between gap-2">
              <button
                type="button"
                className="btn-ghost px-4 py-2.5"
                onClick={() => onGoToCalendar?.(row.id)}
              >
                Open Calendar
              </button>

              <button
                type="button"
                className="btn-primary px-4 py-2.5"
                onClick={() => {
                  const nextEtaAt = fromLocalInputValue(etaLocal);
                  onSetEta?.(nextEtaAt, etaText);
                }}
              >
                Save ETA
              </button>
            </div>
          </div>
        </div>

        <div className="card p-4 md:col-span-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Technician
          </div>
          <div className="mt-1 font-semibold">{row.technicianName || "—"}</div>
        </div>

        <div className="card p-4 md:col-span-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["waiting", "in_progress", "completed", "invoiced", "paid"].map(
              (s) => (
                <button
                  key={s}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold ui-hover ui-focus tap-feedback",
                    row.status === s
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800",
                  ].join(" ")}
                  onClick={() => onSetStatus?.(s)}
                  type="button"
                >
                  {s.replace("_", " ").toUpperCase()}
                </button>
              )
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Mark <b>COMPLETED</b> to allow Costs payment later.
          </div>
        </div>

        {/* Proposals */}
        <div className="card p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Proposals
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {relatedProposals.length}
            </div>
          </div>

          {relatedProposals.length === 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">No proposals saved yet.</div>
              <button
                className="btn-primary"
                onClick={() => onGoToProposals?.(row.id)}
                type="button"
              >
                Create Proposal
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {relatedProposals.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {p.client} • {p.trade}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Created:{" "}
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>

                  <button
                    className="btn-ghost px-3 py-2 text-xs"
                    onClick={() => onGoToProposals?.(row.id)}
                    type="button"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Files */}
        <div className="card p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">Files</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {relatedFiles.length}
            </div>
          </div>

          {relatedFiles.length === 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">No files attached yet.</div>
              <button
                className="btn-primary inline-flex items-center gap-2"
                onClick={() => onGoToFiles?.(row.id)}
                type="button"
              >
                <FolderOpen size={16} />
                Upload Files
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {relatedFiles.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{f.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {f.type || "—"} •{" "}
                      {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>

                  <button
                    className="btn-ghost px-3 py-2 text-xs"
                    onClick={() => onGoToFiles?.(row.id)}
                    type="button"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5" type="button">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
