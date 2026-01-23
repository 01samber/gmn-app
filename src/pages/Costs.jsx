import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";
import Modal from "../components/Modal";

const WO_STORAGE_KEY = "gmn_workorders_v1";
const TECH_STORAGE_KEY = "gmn_techs_v1";
const COSTS_STORAGE_KEY = "gmn_costs_v1";

function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function money(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

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

function loadTechs() {
  const parsed = safeParseJSON(localStorage.getItem(TECH_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadCosts() {
  const parsed = safeParseJSON(localStorage.getItem(COSTS_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveCosts(list) {
  localStorage.setItem(COSTS_STORAGE_KEY, JSON.stringify(list));
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

function formatStamp(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

/**
 * STRICT RULES (frontend enforced):
 * ✅ You can only create a Cost request for a WO if:
 * - WO.status === "completed"
 * - WO has assigned technicianId
 * - technician exists in Tech List AND is not blacklisted
 *
 * Security additions:
 * ✅ Prevent duplicate open requests for same WO (requested/approved)
 * ✅ Confirm before APPROVE and before PAID
 *
 * Workflow:
 * requested -> approved (AP) -> paid
 */
export default function Costs() {
  const [costs, setCosts] = useState(() => loadCosts());
  const [open, setOpen] = useState(false);

  const workOrders = useMemo(() => loadWorkOrders(), []);
  const techs = useMemo(() => loadTechs(), []);

  useEffect(() => {
    saveCosts(costs);
  }, [costs]);

  const techById = useMemo(() => {
    const m = new Map();
    for (const t of techs) m.set(t.id, t);
    return m;
  }, [techs]);

  const eligibleWOs = useMemo(() => {
    return workOrders.filter((w) => {
      if (w.status !== "completed") return false;
      if (!w.technicianId) return false;

      const tech = techById.get(w.technicianId);
      if (!tech) return false;
      if (tech.blacklisted) return false;

      return true;
    });
  }, [workOrders, techById]);

  const counts = useMemo(() => {
    const total = costs.length;
    const requested = costs.filter((c) => c.status === "requested").length;
    const approved = costs.filter((c) => c.status === "approved").length;
    const paid = costs.filter((c) => c.status === "paid").length;
    return { total, requested, approved, paid };
  }, [costs]);

  function hasOpenRequestForWO(woId) {
    // High-security rule: only ONE open (requested/approved) at a time per WO
    return costs.some(
      (c) => c.woId === woId && (c.status === "requested" || c.status === "approved")
    );
  }

  function createCostRequest(form) {
    const wo = workOrders.find((w) => w.id === form.woId);
    if (!wo) {
      alert("Work Order not found.");
      return;
    }

    if (wo.status !== "completed") {
      alert("You can only request payment when the Work Order is COMPLETED.");
      return;
    }

    if (!wo.technicianId) {
      alert("This Work Order has no assigned technician.");
      Attachment;
      return;
    }

    const tech = techById.get(wo.technicianId);
    if (!tech || tech.blacklisted) {
      alert("Assigned technician is not valid (missing or blacklisted).");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Amount must be a valid number greater than 0.");
      return;
    }

    // ✅ High-security improvement: prevent duplicates
    if (hasOpenRequestForWO(wo.id)) {
      alert(
        "A payment request already exists for this Work Order (Requested or Approved). Please complete it (Paid) or revert/correct the existing request."
      );
      return;
    }

    const item = {
      id: uid(),
      woId: wo.id,
      wo: wo.wo,
      client: wo.client,
      trade: wo.trade,
      technicianId: tech.id,
      technicianName: tech.name,
      status: "requested", // AP workflow starts here
      amount,
      note: String(form.note || ""),
      requestedAt: new Date().toISOString(),
      approvedAt: "",
      paidAt: "",
    };

    setCosts((prev) => [item, ...prev]);
  }

  function setCostStatus(id, next) {
    setCosts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        if (next === "approved") {
          if (c.status !== "requested") return c;
          return { ...c, status: "approved", approvedAt: new Date().toISOString() };
        }

        if (next === "paid") {
          if (c.status !== "approved") return c;
          return { ...c, status: "paid", paidAt: new Date().toISOString() };
        }

        if (next === "requested") {
          // Allow revert for corrections (optional)
          // Security note: This does NOT allow reverting from paid.
          if (c.status === "paid") return c;
          return { ...c, status: "requested", approvedAt: "", paidAt: "" };
        }

        return c;
      })
    );
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Costs"
          subtitle="Payments are requested to AP first. Payments can only be made for COMPLETED work orders, to the assigned technician from the Tech List."
          actions={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              + Request Payment
            </button>
          }
        />

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Total: <span className="ml-1 tabular-nums">{counts.total}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            Requested: <span className="ml-1 tabular-nums">{counts.requested}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-600/30 dark:bg-brand-600/15 dark:text-brand-100">
            Approved (AP): <span className="ml-1 tabular-nums">{counts.approved}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            Paid: <span className="ml-1 tabular-nums">{counts.paid}</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Payment Requests</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Requested → Approved (AP) → Paid
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {costs.length} items
            </div>
          </div>

          <div className="overflow-auto gmn-scroll">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">WO#</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Technician</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {costs.map((c, idx) => {
                  const stampTitle = [
                    c.requestedAt ? `Requested: ${formatStamp(c.requestedAt)}` : "",
                    c.approvedAt ? `Approved: ${formatStamp(c.approvedAt)}` : "",
                    c.paidAt ? `Paid: ${formatStamp(c.paidAt)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <tr
                      key={c.id}
                      className={[
                        "group border-t border-slate-100 dark:border-slate-800/70",
                        idx % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50/30 dark:bg-slate-900/60",
                        "hover:bg-brand-50/40 dark:hover:bg-brand-600/10",
                        "transition-colors",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-semibold">{c.wo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.client}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {c.trade}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{c.technicianName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          from Tech List
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{money(c.amount)}</td>
                      <td className="px-4 py-3">
                        {c.status === "requested" ? (
                          <Badge tone="amber" title={stampTitle}>
                            Requested
                          </Badge>
                        ) : c.status === "approved" ? (
                          <Badge tone="brand" title={stampTitle}>
                            Approved (AP)
                          </Badge>
                        ) : (
                          <Badge tone="emerald" title={stampTitle}>
                            Paid
                          </Badge>
                        )}
                        {c.note ? (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[280px] truncate">
                            {c.note}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status === "requested" ? (
                            <button
                              className="btn-primary px-3 py-1.5 text-xs"
                              onClick={() => {
                                const ok = confirm(
                                  `Approve this payment request (AP)?\n\nWO: ${c.wo}\nTech: ${c.technicianName}\nAmount: ${money(c.amount)}`
                                );
                                if (!ok) return;
                                setCostStatus(c.id, "approved");
                              }}
                              title="AP approves the request"
                            >
                              Approve (AP)
                            </button>
                          ) : null}

                          {c.status === "approved" ? (
                            <button
                              className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 dark:bg-white dark:text-slate-900 ui-hover ui-focus tap-feedback"
                              onClick={() => {
                                const ok = confirm(
                                  `Mark this payment as PAID?\n\nWO: ${c.wo}\nTech: ${c.technicianName}\nAmount: ${money(c.amount)}\n\nThis cannot be undone.`
                                );
                                if (!ok) return;
                                setCostStatus(c.id, "paid");
                              }}
                              title="Mark as paid to technician"
                            >
                              Mark Paid
                            </button>
                          ) : null}

                          {c.status !== "paid" ? (
                            <button
                              className="btn-ghost px-3 py-1.5 text-xs"
                              onClick={() => {
                                const ok = confirm(
                                  "Revert this request back to REQUESTED for correction?\n\n(Approved/Paid timestamps will be cleared.)"
                                );
                                if (!ok) return;
                                setCostStatus(c.id, "requested");
                              }}
                              title="Revert for correction"
                            >
                              Revert
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {costs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <div className="text-sm font-semibold">No payment requests yet</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        You can only request payment for a COMPLETED Work Order with an assigned technician.
                      </div>
                      <button className="mt-4 btn-primary" onClick={() => setOpen(true)}>
                        + Request Payment
                      </button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <RequestPaymentModal
          open={open}
          onClose={() => setOpen(false)}
          eligibleWOs={eligibleWOs}
          hasOpenRequestForWO={hasOpenRequestForWO}
          onCreate={(form) => {
            createCostRequest(form);
            setOpen(false);
          }}
        />
      </div>
    </PageTransition>
  );
}

function RequestPaymentModal({ open, onClose, eligibleWOs, hasOpenRequestForWO, onCreate }) {
  const [form, setForm] = useState({
    woId: "",
    amount: "",
    note: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({ woId: "", amount: "", note: "" });
  }, [open]);

  const selectedWO = useMemo(
    () => eligibleWOs.find((w) => w.id === form.woId) || null,
    [eligibleWOs, form.woId]
  );

  const amountNum = Number(form.amount);
  const amountOk = Number.isFinite(amountNum) && amountNum > 0;

  const duplicateOpen = selectedWO ? hasOpenRequestForWO(selectedWO.id) : false;

  const canSubmit = !!selectedWO && amountOk && !duplicateOpen;

  return (
    <Modal
      open={open}
      title="Request Payment (Costs)"
      subtitle="This creates an AP request. Payment can only be requested for completed work orders with an assigned, valid technician."
      onClose={onClose}
    >
      <div className="grid gap-4">
        {eligibleWOs.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            No eligible Work Orders right now.
            <div className="mt-1 text-xs opacity-90">
              To request payment, the WO must be <b>COMPLETED</b> and have an assigned technician from the Tech List.
            </div>
          </div>
        ) : null}

        <Field label="Work Order (Completed + assigned tech only)">
          <select
            className="input"
            value={form.woId}
            onChange={(e) => setForm((p) => ({ ...p, woId: e.target.value }))}
            disabled={eligibleWOs.length === 0}
          >
            <option value="" disabled>
              Select WO#
            </option>
            {eligibleWOs.map((w) => (
              <option key={w.id} value={w.id}>
                {w.wo} • {w.client} • Tech: {w.technicianName}
              </option>
            ))}
          </select>
        </Field>

        {selectedWO ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Paying to technician
            </div>
            <div className="mt-1 font-semibold">{selectedWO.technicianName}</div>

            {duplicateOpen ? (
              <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                A payment request already exists for this Work Order (Requested/Approved). You must complete it (Paid) or revert/correct the existing request.
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                WO must remain completed. If technician changes, create a new request.
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Amount *">
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="500"
              disabled={!selectedWO}
            />
            {!amountOk && String(form.amount).trim().length > 0 ? (
              <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">
                Amount must be greater than 0.
              </div>
            ) : null}
          </Field>

          <Field label="Note (optional)">
            <input
              className="input"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="AP reference / details…"
              disabled={!selectedWO}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5">
            Cancel
          </button>

          <button
            disabled={!canSubmit}
            className={[
              "btn-primary",
              !canSubmit ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            onClick={() => {
              const ok = confirm(
                `Submit payment request to AP?\n\nWO: ${selectedWO?.wo}\nTech: ${selectedWO?.technicianName}\nAmount: ${money(amountNum)}`
              );
              if (!ok) return;
              onCreate({ ...form, amount: amountNum });
            }}
          >
            Submit to AP
          </button>
        </div>
      </div>
    </Modal>
  );
}
