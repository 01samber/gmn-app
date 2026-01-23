import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";
import Modal from "../components/Modal";
import { Printer, Eye } from "lucide-react";

const WO_STORAGE_KEY = "gmn_workorders_v1";
const PROPOSALS_STORAGE_KEY = "gmn_proposals_v1";
const TECH_STORAGE_KEY = "gmn_techs_v1";

function loadWorkOrders() {
  try {
    const raw = localStorage.getItem(WO_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadProposals() {
  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProposals(list) {
  localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(list));
}

function loadTechs() {
  try {
    const raw = localStorage.getItem(TECH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </div>
        {hint ? (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {hint}
          </div>
        ) : null}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function calcTotals(state) {
  const trip = Number(state.tripFee || 0);
  const assessment = Number(state.assessmentFee || 0);
  const incurred = trip + assessment;

  const techLabor = Number(state.techHours || 0) * Number(state.techRate || 0);
  const helperLabor =
    Number(state.helperHours || 0) * Number(state.helperRate || 0);
  const repair = techLabor + helperLabor;

  const parts = (state.parts || []).reduce((sum, p) => {
    const total = Number(p.qty || 0) * Number(p.unit || 0);
    return sum + total;
  }, 0);

  const cost = Number(state.cost || 0);
  const multiplier = Number(state.multiplier || 1.75);

  const grandBeforeTax = cost * multiplier;

  const taxPct = Number(state.taxPct || 0);
  const taxAmount = grandBeforeTax * (taxPct / 100);

  const grandWithTax = grandBeforeTax + taxAmount;

  return {
    incurred,
    repair,
    parts,
    techLabor,
    helperLabor,
    grandBeforeTax,
    taxAmount,
    grandWithTax,
  };
}

function fmtMoney(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openPrintWindow(payload) {
  const { wo, state, totals, createdAt, companyName } = payload;

  const partsRows =
    (state.parts || [])
      .filter((p) => (p.name || "").trim())
      .map((p) => {
        const qty = Number(p.qty || 0);
        const unit = Number(p.unit || 0);
        const total = qty * unit;
        return `
          <tr>
            <td>${escapeHtml(p.name || "")}</td>
            <td class="num">${qty}</td>
            <td class="num">${fmtMoney(unit)}</td>
            <td class="num">${fmtMoney(total)}</td>
          </tr>
        `;
      })
      .join("") || "";

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups to print.");
    return;
  }

  const techLine = state.technicianName
    ? `${escapeHtml(state.technicianName)}`
    : "—";
  const helperLine = state.helperName ? `${escapeHtml(state.helperName)}` : "—";

  w.document.open();
  w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proposal - ${escapeHtml(wo?.wo || "WO")}</title>
  <style>
    :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#ffffff; --brand:#2563eb; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: var(--ink); background: var(--bg); }
    .page { width: 210mm; min-height: 297mm; padding: 18mm; margin: 0 auto; }
    .row { display:flex; gap: 16px; justify-content: space-between; align-items: flex-start; }
    .brand { display:flex; align-items:center; gap: 10px; }
    .logo { width: 42px; height: 42px; border-radius: 14px; background: var(--brand); color: white; font-weight: 800; display:grid; place-items:center; letter-spacing: .02em; }
    h1 { margin: 0; font-size: 20px; letter-spacing: -0.02em; }
    .sub { margin-top: 4px; color: var(--muted); font-size: 12px; }
    .chip { display:inline-block; padding: 6px 10px; border: 1px solid var(--line); border-radius: 999px; font-size: 12px; color: var(--ink); }
    hr { border: 0; border-top: 1px solid var(--line); margin: 14px 0; }
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { border: 1px solid var(--line); border-radius: 14px; padding: 12px; }
    .label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
    .value { font-size: 13px; font-weight: 700; }
    .mono { font-variant-numeric: tabular-nums; }
    .scope { white-space: pre-wrap; line-height: 1.45; font-size: 13px; color: #111827; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid var(--line); padding: 10px 8px; font-size: 12px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 10px; }
    .totals .line { display:flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
    .totals .line strong { font-size: 14px; }
    .foot { margin-top: 18px; font-size: 11px; color: var(--muted); }
    @media print {
      body { background: white; }
      .page { margin: 0; width: auto; min-height: auto; padding: 14mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="row">
      <div class="brand">
        <div class="logo">GMN</div>
        <div>
          <h1>Client Proposal</h1>
          <div class="sub">${escapeHtml(companyName || "GLOBAL MAINTENANCE NETWORK")}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="chip"><b>${escapeHtml(wo?.wo || "WO")}</b></div>
        <div class="sub" style="margin-top:8px;">Created: ${escapeHtml(
          new Date(createdAt || Date.now()).toLocaleString()
        )}</div>
      </div>
    </div>

    <hr />

    <div class="grid2">
      <div class="card">
        <div class="label">Client</div>
        <div class="value">${escapeHtml(wo?.client || "—")}</div>
      </div>
      <div class="card">
        <div class="label">Trade</div>
        <div class="value">${escapeHtml(wo?.trade || "—")}</div>
      </div>

      <div class="card">
        <div class="label">Technician</div>
        <div class="value">${techLine}</div>
      </div>
      <div class="card">
        <div class="label">Helper</div>
        <div class="value">${helperLine}</div>
      </div>
    </div>

    <div class="card" style="margin-top:10px;">
      <div class="label">Scope / Description</div>
      <div class="scope">${escapeHtml(state.scopeText || "")}</div>
    </div>

    <div class="grid2" style="margin-top:10px;">
      <div class="card">
        <div class="label">Incurred</div>
        <div class="sub">Trip fees: <span class="mono">${fmtMoney(state.tripFee)}</span></div>
        <div class="sub">Assessment fees: <span class="mono">${fmtMoney(state.assessmentFee)}</span></div>
        <div class="totals">
          <div class="line"><span>Total Incurred</span><b class="mono">${fmtMoney(totals.incurred)}</b></div>
        </div>
      </div>

      <div class="card">
        <div class="label">Repair</div>
        <div class="sub">Tech: <span class="mono">${Number(state.techHours || 0)}</span> hrs × <span class="mono">${fmtMoney(
    state.techRate
  )}</span> = <b class="mono">${fmtMoney(totals.techLabor)}</b></div>
        <div class="sub">Helper: <span class="mono">${Number(state.helperHours || 0)}</span> hrs × <span class="mono">${fmtMoney(
    state.helperRate
  )}</span> = <b class="mono">${fmtMoney(totals.helperLabor)}</b></div>
        <div class="totals">
          <div class="line"><span>Total Repair</span><b class="mono">${fmtMoney(totals.repair)}</b></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:10px;">
      <div class="label">Parts & Materials</div>

      ${
        partsRows
          ? `
        <table>
          <thead>
            <tr>
              <th>Part / Material</th>
              <th class="num">Qty</th>
              <th class="num">Unit</th>
              <th class="num">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${partsRows}
          </tbody>
        </table>
        <div class="totals">
          <div class="line"><span>Total Parts & Materials</span><b class="mono">${fmtMoney(totals.parts)}</b></div>
        </div>
      `
          : `<div class="sub">No parts listed.</div>`
      }
    </div>

    <div class="card" style="margin-top:10px;">
      <div class="label">Pricing</div>
      <div class="totals">
        <div class="line"><span>Cost (tech estimate)</span><b class="mono">${fmtMoney(state.cost)}</b></div>
        <div class="line"><span>Markup multiplier</span><b class="mono">${Number(state.multiplier || 1.75).toFixed(2)}</b></div>
        <div class="line"><span>Grand total (Cost × multiplier)</span><b class="mono">${fmtMoney(totals.grandBeforeTax)}</b></div>
        <div class="line"><span>Tax (${Number(state.taxPct || 0).toFixed(2)}%)</span><b class="mono">${fmtMoney(
    totals.taxAmount
  )}</b></div>
        <div class="line" style="border-top:1px solid var(--line); margin-top:6px; padding-top:10px;">
          <strong>Grand Total + Tax</strong>
          <strong class="mono">${fmtMoney(totals.grandWithTax)}</strong>
        </div>
      </div>
    </div>

    <div class="foot">
      This document is a proposal generated by GMN Field Service Manager. Final invoice may vary based on onsite conditions and approved change orders.
    </div>
  </div>

  <script>
    window.focus();
    setTimeout(() => window.print(), 350);
  </script>
</body>
</html>
  `);
  w.document.close();
}

export default function Proposals() {
  const location = useLocation();
  const navigate = useNavigate();

  const workOrders = useMemo(() => loadWorkOrders(), []);
  const [proposals, setProposals] = useState(() => loadProposals());

  // Create modal
  const [open, setOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);

  // Details modal
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsProposal, setDetailsProposal] = useState(null);

  const initialFromWOId = location.state?.woId;

  useEffect(() => {
    saveProposals(proposals);
  }, [proposals]);

  useEffect(() => {
    if (!initialFromWOId) return;
    const wo = workOrders.find((w) => w.id === initialFromWOId);
    if (wo) {
      setSelectedWO(wo);
      setOpen(true);
      navigate("/proposals", { replace: true });
    }
  }, [initialFromWOId, workOrders, navigate]);

  function createProposal(data) {
    setProposals((prev) => [
      { id: uid(), createdAt: new Date().toISOString(), ...data },
      ...prev,
    ]);
  }

  function printSavedProposal(p) {
    const wo = { wo: p.wo, client: p.client, trade: p.trade };

    const state = {
      scopeText: p.body || "",
      tripFee: p.incurred?.tripFee ?? 0,
      assessmentFee: p.incurred?.assessmentFee ?? 0,
      techHours: p.repair?.techHours ?? 0,
      techRate: p.repair?.techRate ?? 0,
      helperHours: p.repair?.helperHours ?? 0,
      helperRate: p.repair?.helperRate ?? 0,
      parts: (p.parts || []).map((x) => ({
        name: x.name,
        qty: x.qty,
        unit: x.unit,
      })),
      multiplier: p.pricing?.multiplier ?? 1.75,
      taxPct: p.pricing?.taxPct ?? 0,
      cost: p.pricing?.cost ?? 0,
      technicianName: p.technicianName || "",
      helperName: p.helperName || "",
    };

    const totals = p.totals || calcTotals(state);

    openPrintWindow({
      wo,
      state,
      totals,
      createdAt: p.createdAt,
      companyName: "GLOBAL MAINTENANCE NETWORK",
    });
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Proposals"
          subtitle="Create proposals from a Work Order with calculations."
          actions={
            <button
              className="btn-primary"
              onClick={() => {
                setSelectedWO(null);
                setOpen(true);
              }}
            >
              + Create Proposal
            </button>
          }
        />

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Saved Proposals</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Click a row to open details. Print anytime.
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {proposals.length} items
            </div>
          </div>

          <div className="overflow-auto gmn-scroll">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">WO#</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Trade</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Grand + Tax
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {proposals.map((p, idx) => (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    className={[
                      "group border-t border-slate-100 dark:border-slate-800/70",
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/30 dark:bg-slate-900/60",
                      "hover:bg-brand-50/40 dark:hover:bg-brand-600/10",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 focus-visible:ring-inset",
                      "transition-colors cursor-pointer",
                    ].join(" ")}
                    onClick={() => {
                      setDetailsProposal(p);
                      setOpenDetails(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setDetailsProposal(p);
                        setOpenDetails(true);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-semibold">{p.wo}</td>
                    <td className="px-4 py-3">{p.client}</td>
                    <td className="px-4 py-3">{p.trade}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {money(p.totals?.grandWithTax || 0)}
                    </td>

                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                          onClick={() => {
                            setDetailsProposal(p);
                            setOpenDetails(true);
                          }}
                        >
                          <Eye size={14} />
                          Open
                        </button>

                        <button
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 dark:bg-white dark:text-slate-900 ui-hover ui-focus tap-feedback"
                          onClick={() => printSavedProposal(p)}
                        >
                          <Printer size={14} />
                          Print PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {proposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="text-sm font-semibold">
                        No proposals created yet
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Start by creating a proposal from a Work Order.
                      </div>
                      <button
                        className="mt-4 btn-primary"
                        onClick={() => setOpen(true)}
                      >
                        + Create Proposal
                      </button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Proposal */}
        <CreateProposalModal
          open={open}
          onClose={() => setOpen(false)}
          initialWO={selectedWO}
          workOrders={workOrders}
          onCreate={(data) => {
            createProposal(data);
            setOpen(false);
          }}
        />

        {/* Proposal Details Modal */}
        <ProposalDetailsModal
          open={openDetails}
          proposal={detailsProposal}
          onClose={() => setOpenDetails(false)}
          onPrint={() => {
            if (!detailsProposal) return;
            printSavedProposal(detailsProposal);
          }}
        />
      </div>
    </PageTransition>
  );
}

/* ---------------------- Details Modal ---------------------- */
function ProposalDetailsModal({ open, proposal, onClose, onPrint }) {
  if (!proposal) return null;

  const created = proposal.createdAt
    ? new Date(proposal.createdAt).toLocaleString()
    : "—";

  const parts = Array.isArray(proposal.parts) ? proposal.parts : [];

  return (
    <Modal
      open={open}
      title="Proposal Details"
      subtitle={`${proposal.wo} • ${proposal.client} • Created: ${created}`}
      onClose={onClose}
    >
      <div className="max-h-[72vh] overflow-auto pr-1 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">WO#</div>
            <div className="mt-1 font-semibold">{proposal.wo}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Trade
            </div>
            <div className="mt-1 font-semibold">{proposal.trade}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Technician
            </div>
            <div className="mt-1 font-semibold">
              {proposal.technicianName || "—"}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Helper
            </div>
            <div className="mt-1 font-semibold">{proposal.helperName || "—"}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-bold">Scope / Description</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
            {proposal.body || "—"}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-bold">Incurred</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Trip fees
                </span>
                <span className="tabular-nums">
                  {money(proposal.incurred?.tripFee || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Assessment fees
                </span>
                <span className="tabular-nums">
                  {money(proposal.incurred?.assessmentFee || 0)}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Incurred</span>
                <span className="tabular-nums">
                  {money(proposal.incurred?.total || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-bold">Repair</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Tech labor
                </span>
                <span className="tabular-nums">
                  {money(
                    Number(proposal.repair?.techHours || 0) *
                      Number(proposal.repair?.techRate || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Helper labor
                </span>
                <span className="tabular-nums">
                  {money(
                    Number(proposal.repair?.helperHours || 0) *
                      Number(proposal.repair?.helperRate || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Repair</span>
                <span className="tabular-nums">
                  {money(proposal.repair?.total || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Parts & Materials</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Listed items for this proposal
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {parts.length} items
            </div>
          </div>

          <div className="overflow-auto gmn-scroll">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {parts.length ? (
                  parts.map((p, idx) => {
                    const qty = Number(p.qty || 0);
                    const unit = Number(p.unit || 0);
                    const total = qty * unit;
                    return (
                      <tr
                        key={idx}
                        className={[
                          "border-t border-slate-100 dark:border-slate-800/70",
                          idx % 2 === 0
                            ? "bg-white dark:bg-slate-900"
                            : "bg-slate-50/30 dark:bg-slate-900/60",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3">{p.name || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {qty}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {money(unit)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {money(total)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="text-sm font-semibold">No parts</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        This proposal has no parts listed.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total Parts & Materials
            </div>
            <div className="text-sm font-bold tabular-nums">
              {money(proposal.totals?.parts || 0)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-sm font-bold">Grand Total</div>
          <div className="mt-2 grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Grand total (Cost × multiplier)
              </span>
              <span className="tabular-nums">
                {money(proposal.totals?.grandBeforeTax || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tax</span>
              <span className="tabular-nums">
                {money(proposal.totals?.taxAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between text-base font-black">
              <span>Grand Total + Tax</span>
              <span className="tabular-nums">
                {money(proposal.totals?.grandWithTax || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5">
            Close
          </button>

          <button
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 dark:bg-white dark:text-slate-900 ui-hover ui-focus tap-feedback"
          >
            <Printer size={16} />
            Print PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------- Create Proposal Modal ---------------------- */
function CreateProposalModal({ open, onClose, initialWO, workOrders, onCreate }) {
  const [woId, setWoId] = useState("");

  const wo = useMemo(
    () => workOrders.find((w) => w.id === woId) || null,
    [workOrders, woId]
  );

  const techs = useMemo(() => loadTechs(), [open]);
  const activeTechs = useMemo(
    () => techs.filter((t) => !t.blacklisted),
    [techs]
  );

  const [state, setState] = useState({
    scopeText:
      "Our technician assessed the doors and found that both door closures are damaged and no longer functioning properly. To ensure reliable and safe door operation, we will need to remove and replace both closures with new, heavy-duty commercial-grade units. This will restore proper closing action, prevent slamming, and maintain compliance with safety and accessibility standards.",
    emergency: false,
    tripFee: 75,
    assessmentFee: 75,

    technicianId: "",
    technicianName: "",
    helperId: "",
    helperName: "",

    techHours: 0,
    techRate: 75,
    helperHours: 0,
    helperRate: 65,
    parts: [],
    multiplier: 1.75,
    taxPct: 0,
    cost: 0,
  });

  useEffect(() => {
    if (!open) return;

    if (initialWO?.id) setWoId(initialWO.id);
    else setWoId("");

    setState((p) => ({
      ...p,
      emergency: false,
      tripFee: 75,
      assessmentFee: 75,
      technicianId: "",
      technicianName: "",
      helperId: "",
      helperName: "",
      techHours: 0,
      helperHours: 0,
      parts: [],
      multiplier: 1.75,
      taxPct: 0,
      cost: 0,
    }));
  }, [open, initialWO]);

  // auto-fill technician from WO assignment
  useEffect(() => {
    if (!open) return;
    if (!wo) return;

    if (wo.technicianId && wo.technicianName) {
      setState((p) => ({
        ...p,
        technicianId: wo.technicianId,
        technicianName: wo.technicianName,
      }));
    }
  }, [open, wo]);

  // Emergency job trip fee
  useEffect(() => {
    setState((p) => ({
      ...p,
      tripFee: p.emergency ? 112.5 : 75,
    }));
  }, [state.emergency]);

  const totals = useMemo(() => calcTotals(state), [state]);

  function update(k, v) {
    setState((p) => ({ ...p, [k]: v }));
  }

  function addPart() {
    setState((p) => ({
      ...p,
      parts: [...p.parts, { id: uid(), name: "", qty: 1, unit: 0 }],
    }));
  }

  function updatePart(id, patch) {
    setState((p) => ({
      ...p,
      parts: p.parts.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }

  function removePart(id) {
    setState((p) => ({ ...p, parts: p.parts.filter((x) => x.id !== id) }));
  }

  const canSubmit = !!wo;

  return (
    <Modal
      open={open}
      title="Create Proposal"
      subtitle="Linked to a Work Order, with your exact structure and calculations."
      onClose={onClose}
    >
      <div className="max-h-[72vh] overflow-auto pr-1">
        <div className="grid gap-4">
          <Field label="Work Order # *" hint="Required">
            <select
              className="input"
              value={woId}
              onChange={(e) => setWoId(e.target.value)}
            >
              <option value="" disabled>
                Select WO#
              </option>
              {workOrders.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.wo} • {w.client}
                </option>
              ))}
            </select>
          </Field>

          {/* Crew */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-bold">Crew</div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="Technician (from Tech List)">
                <select
                  className="input"
                  value={state.technicianId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const t = activeTechs.find((x) => x.id === id);
                    setState((p) => ({
                      ...p,
                      technicianId: id,
                      technicianName: t?.name || "",
                    }));
                  }}
                  disabled={!activeTechs.length}
                >
                  <option value="">
                    {activeTechs.length ? "Select technician" : "Add techs first"}
                  </option>
                  {activeTechs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.trade}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Helper (optional)" hint="Also from Tech List">
                <select
                  className="input"
                  value={state.helperId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const t = activeTechs.find((x) => x.id === id);

                    // Optional rule: keep helper but could block if same as tech
                    setState((p) => ({
                      ...p,
                      helperId: id,
                      helperName: t?.name || "",
                    }));
                  }}
                  disabled={!activeTechs.length}
                >
                  <option value="">Select helper (optional)</option>
                  {activeTechs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.trade}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Scope */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Description / Scope
            </div>
            <textarea
              rows={5}
              className="mt-2 input"
              value={state.scopeText}
              onChange={(e) => update("scopeText", e.target.value)}
            />
          </div>

          {/* Incurred */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">Incurred</div>
              <button
                type="button"
                className={[
                  "rounded-xl px-3 py-2 text-xs font-semibold ui-hover ui-focus tap-feedback",
                  state.emergency
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800",
                ].join(" ")}
                onClick={() => update("emergency", !state.emergency)}
                title="Trip fee becomes 112.5 for emergency"
              >
                {state.emergency ? "Emergency: ON" : "Emergency: OFF"}
              </button>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label={`Trip fees (${state.emergency ? "$112.5" : "$75"})`}>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.tripFee}
                  onChange={(e) => update("tripFee", Number(e.target.value))}
                />
              </Field>

              <Field label="Assessment fees (depends on trade)">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.assessmentFee}
                  onChange={(e) =>
                    update("assessmentFee", Number(e.target.value))
                  }
                />
              </Field>
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Total Incurred:{" "}
              <b className="tabular-nums">{money(totals.incurred)}</b>
            </div>
          </div>

          {/* Repair */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-bold">Repair</div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="Tech labor hours">
                <input
                  type="number"
                  step="0.25"
                  className="input"
                  value={state.techHours}
                  onChange={(e) => update("techHours", Number(e.target.value))}
                />
              </Field>

              <Field label="Tech rate (per hour)">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.techRate}
                  onChange={(e) => update("techRate", Number(e.target.value))}
                />
              </Field>

              <Field label="Helper labor hours">
                <input
                  type="number"
                  step="0.25"
                  className="input"
                  value={state.helperHours}
                  onChange={(e) =>
                    update("helperHours", Number(e.target.value))
                  }
                />
              </Field>

              <Field label="Helper rate (65/75/85/95...)">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.helperRate}
                  onChange={(e) => update("helperRate", Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div>
                Tech labor total:{" "}
                <b className="tabular-nums">{money(totals.techLabor)}</b>
              </div>
              <div>
                Helper labor total:{" "}
                <b className="tabular-nums">{money(totals.helperLabor)}</b>
              </div>
              <div>
                Total Repair:{" "}
                <b className="tabular-nums">{money(totals.repair)}</b>
              </div>
            </div>
          </div>

          {/* Parts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">Parts & Materials</div>
              <button
                type="button"
                className="btn-ghost ui-hover ui-focus tap-feedback"
                onClick={addPart}
              >
                + Add part/material
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {state.parts.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  No parts yet. Add materials if needed.
                </div>
              ) : null}

              {state.parts.map((p) => {
                const lineTotal = Number(p.qty || 0) * Number(p.unit || 0);
                return (
                  <div
                    key={p.id}
                    className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-12"
                  >
                    <div className="md:col-span-6">
                      <input
                        className="input"
                        placeholder="Part or material"
                        value={p.name}
                        onChange={(e) =>
                          updatePart(p.id, { name: e.target.value })
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min="0"
                        className="input"
                        value={p.qty}
                        onChange={(e) =>
                          updatePart(p.id, { qty: Number(e.target.value) })
                        }
                        placeholder="Qty"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={p.unit}
                        onChange={(e) =>
                          updatePart(p.id, { unit: Number(e.target.value) })
                        }
                        placeholder="$"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {money(lineTotal)}
                      </div>
                      <button
                        type="button"
                        className="btn-ghost px-3 py-2 text-xs ui-hover ui-focus tap-feedback"
                        onClick={() => removePart(p.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Total Parts & Materials:{" "}
              <b className="tabular-nums">{money(totals.parts)}</b>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-bold">Pricing</div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="Cost (given by tech estimate)">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.cost}
                  onChange={(e) => update("cost", Number(e.target.value))}
                />
              </Field>

              <Field label="Markup multiplier (default 1.75)">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.multiplier}
                  onChange={(e) =>
                    update("multiplier", Number(e.target.value))
                  }
                />
              </Field>

              <Field label="Tax % (editable)">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={state.taxPct}
                  onChange={(e) => update("taxPct", Number(e.target.value))}
                />
              </Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Grand total (Cost × multiplier)
                </div>
                <div className="mt-1 font-bold tabular-nums">
                  {money(totals.grandBeforeTax)}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Tax amount
                </div>
                <div className="mt-1 font-semibold tabular-nums">
                  {money(totals.taxAmount)}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Grand Total + tax
                </div>
                <div className="mt-1 text-lg font-black tabular-nums">
                  {money(totals.grandWithTax)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={onClose} className="btn-ghost px-4 py-2.5">
              Cancel
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 ui-hover ui-focus tap-feedback"
                onClick={() => {
                  if (!wo) {
                    alert("Select a Work Order first.");
                    return;
                  }
                  openPrintWindow({
                    wo,
                    state,
                    totals,
                    createdAt: new Date().toISOString(),
                    companyName: "GLOBAL MAINTENANCE NETWORK",
                  });
                }}
              >
                <Printer size={16} />
                Print PDF
              </button>

              <button
                disabled={!canSubmit}
                className={[
                  "btn-primary",
                  !canSubmit ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
                onClick={() => {
                  if (!wo) return;

                  onCreate({
                    woId: wo.id,
                    wo: wo.wo,
                    client: wo.client,
                    trade: wo.trade,

                    technicianId: state.technicianId,
                    technicianName: state.technicianName,
                    helperId: state.helperId,
                    helperName: state.helperName,

                    body: state.scopeText,
                    incurred: {
                      emergency: state.emergency,
                      tripFee: Number(state.tripFee || 0),
                      assessmentFee: Number(state.assessmentFee || 0),
                      total: totals.incurred,
                    },
                    repair: {
                      techHours: Number(state.techHours || 0),
                      techRate: Number(state.techRate || 0),
                      helperHours: Number(state.helperHours || 0),
                      helperRate: Number(state.helperRate || 0),
                      total: totals.repair,
                    },
                    parts: state.parts.map((p) => ({
                      name: p.name,
                      qty: Number(p.qty || 0),
                      unit: Number(p.unit || 0),
                    })),
                    totals,
                    pricing: {
                      cost: Number(state.cost || 0),
                      multiplier: Number(state.multiplier || 1.75),
                      taxPct: Number(state.taxPct || 0),
                    },
                  });
                }}
              >
                Save Proposal
              </button>
            </div>
          </div>

          <div className="h-2" />
        </div>
      </div>
    </Modal>
  );
}
