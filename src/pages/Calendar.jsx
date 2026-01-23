import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";
import Modal from "../components/Modal";

const WO_STORAGE_KEY = "gmn_workorders_v1";

/* ---------------- utils ---------------- */
function safeParseJSON(raw, fallback) {
  try {
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function loadWorkOrders() {
  const parsed = safeParseJSON(localStorage.getItem(WO_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveWorkOrders(list) {
  localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(list));
}

function sanitizeText(v, maxLen = 240) {
  return String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function minutesDiff(a, b) {
  // a - b in minutes
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((da - db) / 60000);
}

function statusNormalize(s) {
  const v = String(s || "").toLowerCase().trim();
  if (v === "pending") return "pending";
  if (v === "in_progress" || v === "in progress") return "in_progress";
  if (v === "completed") return "completed";
  return v || "pending";
}

/**
 * Expected WO fields (best-effort):
 * - id, wo, client, trade, status
 * - technicianName (optional)
 * - etaAt (ISO string)  <-- this page will set it
 * - notes (optional)
 */

function Badge({ tone = "slate", children, title }) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800",
    amber:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40",
    brand:
      "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-600/15 dark:text-brand-100 dark:ring-brand-600/30",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/40",
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

function Section({ title, right, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="text-sm font-bold">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ---------------- main ---------------- */
export default function Calendar() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh on focus (useful when you update WOs elsewhere)
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Refresh when localStorage changes (other tabs)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === WO_STORAGE_KEY) setRefreshKey((k) => k + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [q, setQ] = useState("");
  const [openEta, setOpenEta] = useState(false);
  const [editing, setEditing] = useState(null);

  const workOrders = useMemo(() => {
    const list = loadWorkOrders().map((w) => ({
      ...w,
      status: statusNormalize(w.status),
    }));
    return list;
  }, [refreshKey]);

  const now = useMemo(() => new Date(), [refreshKey]); // updates when refreshed

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return workOrders;

    return workOrders.filter((w) => {
      const blob = [
        w.wo,
        w.client,
        w.trade,
        w.status,
        w.technicianName,
        w.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(text);
    });
  }, [workOrders, q]);

  const active = useMemo(() => {
    return filtered.filter((w) => w.status !== "completed");
  }, [filtered]);

  const pending = useMemo(() => {
    return active.filter((w) => w.status === "pending");
  }, [active]);

  const inProgress = useMemo(() => {
    return active.filter((w) => w.status === "in_progress");
  }, [active]);

  const withEta = useMemo(() => {
    return active
      .filter((w) => w.etaAt)
      .filter((w) => !Number.isNaN(new Date(w.etaAt).getTime()));
  }, [active]);

  const overdue = useMemo(() => {
    const nowIso = now.toISOString();
    return withEta
      .filter((w) => minutesDiff(w.etaAt, nowIso) < 0)
      .sort((a, b) => new Date(a.etaAt) - new Date(b.etaAt));
  }, [withEta, now]);

  const dueToday = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return withEta
      .filter((w) => {
        const t = new Date(w.etaAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .sort((a, b) => new Date(a.etaAt) - new Date(b.etaAt));
  }, [withEta, now]);

  const upcoming = useMemo(() => {
    const nowIso = now.toISOString();
    return withEta
      .filter((w) => minutesDiff(w.etaAt, nowIso) >= 0)
      .sort((a, b) => new Date(a.etaAt) - new Date(b.etaAt));
  }, [withEta, now]);

  const stats = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter((w) => w.status !== "completed").length;
    const pendingCount = workOrders.filter((w) => w.status === "pending").length;
    const inProgCount = workOrders.filter((w) => w.status === "in_progress").length;
    return { total, open, pendingCount, inProgCount };
  }, [workOrders]);

  function upsertWO(patch) {
    // patch: { id, ...fields }
    const id = patch?.id;
    if (!id) return;

    const next = workOrders.map((w) =>
      w.id === id
        ? {
            ...w,
            ...patch,
            notes: sanitizeText(patch.notes ?? w.notes, 600),
            etaAt: patch.etaAt ?? w.etaAt ?? "",
            updatedAt: new Date().toISOString(),
          }
        : w
    );

    saveWorkOrders(next);
    setRefreshKey((k) => k + 1);
  }

  function openEtaModal(wo) {
    setEditing(wo);
    setOpenEta(true);
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Calendar"
          subtitle="To-do view for Work Orders: Pending, In Progress, ETAs, and Overdue."
          actions={
            <button
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white ui-hover ui-focus tap-feedback"
              onClick={() => {
                // This is intentionally NOT a random calendar event.
                // Ops reality: everything should tie back to a WO.
                alert("Add ETA from a Work Order row. Random events create chaos.");
              }}
            >
              + Add Event
            </button>
          }
        />

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Total WOs: <span className="ml-1 tabular-nums">{stats.total}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Open: <span className="ml-1 tabular-nums">{stats.open}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            Pending: <span className="ml-1 tabular-nums">{stats.pendingCount}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-600/30 dark:bg-brand-600/15 dark:text-brand-100">
            In Progress: <span className="ml-1 tabular-nums">{stats.inProgCount}</span>
          </span>
          {overdue.length ? (
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-200">
              Overdue: <span className="ml-1 tabular-nums">{overdue.length}</span>
            </span>
          ) : null}
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ui-hover">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-9">
              <input
                className="input"
                placeholder="Search WO#, client, trade, status, technician…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <span className="font-semibold">Showing</span>
              <span className="tabular-nums">{filtered.length}</span>
            </div>
          </div>
        </div>

        {/* OVERDUE */}
        <Section
          title="Overdue ETAs"
          right={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {overdue.length} items
            </span>
          }
        >
          {overdue.length ? (
            <div className="space-y-2">
              {overdue.map((w) => (
                <WOCard key={w.id} wo={w} now={now} onEta={() => openEtaModal(w)} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              None. Keep it that way.
            </div>
          )}
        </Section>

        {/* TODAY */}
        <Section
          title="Today"
          right={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {dueToday.length} items
            </span>
          }
        >
          {dueToday.length ? (
            <div className="space-y-2">
              {dueToday.map((w) => (
                <WOCard key={w.id} wo={w} now={now} onEta={() => openEtaModal(w)} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No ETAs scheduled for today.
            </div>
          )}
        </Section>

        {/* PENDING + IN PROGRESS */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Pending (To Assign / Schedule)"
            right={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {pending.length} items
              </span>
            }
          >
            {pending.length ? (
              <div className="space-y-2">
                {pending.map((w) => (
                  <WOCard key={w.id} wo={w} now={now} onEta={() => openEtaModal(w)} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                No pending WOs.
              </div>
            )}
          </Section>

          <Section
            title="In Progress (Track ETA)"
            right={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {inProgress.length} items
              </span>
            }
          >
            {inProgress.length ? (
              <div className="space-y-2">
                {inProgress.map((w) => (
                  <WOCard key={w.id} wo={w} now={now} onEta={() => openEtaModal(w)} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                No WOs in progress.
              </div>
            )}
          </Section>
        </div>

        {/* UPCOMING */}
        <Section
          title="Upcoming (Next ETAs)"
          right={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {upcoming.length} items
            </span>
          }
        >
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.slice(0, 10).map((w) => (
                <WOCard key={w.id} wo={w} now={now} onEta={() => openEtaModal(w)} />
              ))}
              {upcoming.length > 10 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Showing 10 of {upcoming.length}.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No upcoming ETAs set.
            </div>
          )}
        </Section>

        {/* ETA Modal */}
        <EtaModal
          open={openEta}
          onClose={() => setOpenEta(false)}
          wo={editing}
          onSave={(patch) => {
            upsertWO(patch);
            setOpenEta(false);
          }}
        />
      </div>
    </PageTransition>
  );
}

/* ---------------- components ---------------- */
function WOCard({ wo, now, onEta }) {
  const status = statusNormalize(wo.status);

  const etaTitle = wo.etaAt ? `ETA: ${formatWhen(wo.etaAt)}` : "No ETA set";

  let etaTone = "slate";
  let etaText = "ETA: —";

  if (wo.etaAt) {
    const diff = minutesDiff(wo.etaAt, now.toISOString());
    if (diff != null) {
      if (diff < 0) {
        etaTone = "rose";
        etaText = `Overdue by ${Math.abs(diff)}m`;
      } else if (diff <= 60) {
        etaTone = "amber";
        etaText = `Due in ${diff}m`;
      } else {
        etaTone = "brand";
        etaText = `In ${Math.round(diff / 60)}h`;
      }
    } else {
      etaText = `ETA: ${formatWhen(wo.etaAt)}`;
    }
  }

  const statusBadge =
    status === "pending" ? (
      <Badge tone="amber">Pending</Badge>
    ) : status === "in_progress" ? (
      <Badge tone="brand">In Progress</Badge>
    ) : status === "completed" ? (
      <Badge tone="emerald">Completed</Badge>
    ) : (
      <Badge>{wo.status || "—"}</Badge>
    );

  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        "ui-hover",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-bold">{wo.wo || "WO"}</div>
            {statusBadge}
            <Badge tone={etaTone} title={etaTitle}>
              {etaText}
            </Badge>
          </div>

          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200 truncate">
            {wo.client || "—"}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {wo.trade || "—"} • Tech: {wo.technicianName || "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-ghost px-3 py-2 text-xs" onClick={onEta}>
            Set ETA
          </button>
        </div>
      </div>

      {wo.notes ? (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Notes:</span> {wo.notes}
        </div>
      ) : null}
    </div>
  );
}

function EtaModal({ open, onClose, wo, onSave }) {
  const [etaLocal, setEtaLocal] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    const initial = wo?.etaAt
      ? (() => {
          const d = new Date(wo.etaAt);
          if (Number.isNaN(d.getTime())) return "";
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
            d.getDate()
          )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        })()
      : "";
    setEtaLocal(initial);
    setNotes(wo?.notes || "");
  }, [open, wo]);

  if (!wo) return null;

  const canSave = true; // allow clearing ETA too

  return (
    <Modal
      open={open}
      title="Set ETA"
      subtitle={`${wo.wo || "WO"} • ${wo.client || "—"} • ${wo.trade || "—"}`}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            ETA (date & time)
          </div>
          <div className="mt-1">
            <input
              type="datetime-local"
              className="input"
              value={etaLocal}
              onChange={(e) => setEtaLocal(e.target.value)}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Leave empty to clear ETA.
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Notes (ops)
          </div>
          <div className="mt-1">
            <textarea
              rows={3}
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, contact, urgency, tech constraints…"
            />
          </div>
        </label>

        <div className="flex items-center justify-between gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5">
            Cancel
          </button>

          <button
            disabled={!canSave}
            className={["btn-primary", !canSave ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
            onClick={() => {
              // Convert datetime-local to ISO
              const etaAt =
                etaLocal && etaLocal.trim()
                  ? new Date(etaLocal).toISOString()
                  : "";

              const ok = window.confirm(
                `Save ETA?\n\nWO: ${wo.wo}\nETA: ${etaAt ? new Date(etaAt).toLocaleString() : "— (cleared)"}`
              );
              if (!ok) return;

              onSave({
                id: wo.id,
                etaAt,
                notes: sanitizeText(notes, 600),
              });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
