import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";
import Modal from "../components/Modal";

const TECH_STORAGE_KEY = "gmn_techs_v1";
const WO_STORAGE_KEY = "gmn_workorders_v1";
const COSTS_STORAGE_KEY = "gmn_costs_v1";
const PROPOSALS_STORAGE_KEY = "gmn_proposals_v1";

/**
 * Allowed trades (controlled vocabulary)
 * Keeps data clean for reports + future backend rules.
 */
const TRADE_OPTIONS = [
  "Handyman",
  "HVAC",
  "Plumbing",
  "Electric",
  "Doors",
  "Locksmith",
  "Painting",
  "Flooring",
  "Roofing",
  "Cleaning Services",
  "Landscaping",
  "Overhead Doors",
  "Window / Glass / Tinting",
  "All Trades",
  "Other (Custom)",
];

function safeParseJSON(raw, fallback) {
  try {
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function loadTechs() {
  const parsed = safeParseJSON(localStorage.getItem(TECH_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveTechs(techs) {
  localStorage.setItem(TECH_STORAGE_KEY, JSON.stringify(techs));
}

function loadWorkOrders() {
  const parsed = safeParseJSON(localStorage.getItem(WO_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadCosts() {
  const parsed = safeParseJSON(localStorage.getItem(COSTS_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadProposals() {
  const parsed = safeParseJSON(localStorage.getItem(PROPOSALS_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
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

function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function formatMoney(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function sanitizeText(v, maxLen = 240) {
  // remove control chars, trim, collapse whitespace
  const s = String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, maxLen);
}

function normalizePhone(v) {
  const raw = sanitizeText(v, 64);
  // keep + and digits only
  const cleaned = raw.replace(/[^\d+]/g, "");
  // avoid lone '+'
  return cleaned === "+" ? "" : cleaned;
}

function normalizeKey(v) {
  return sanitizeText(v, 240).toLowerCase();
}

/**
 * Normalize trade for display/storage.
 * If user chose Other (Custom), we store the custom value as trade.
 */
function resolveTrade(trade, tradeOther) {
  if (trade === "Other (Custom)") {
    const v = sanitizeText(tradeOther, 60);
    return v ? `Other: ${v}` : "Other";
  }
  return sanitizeText(trade, 60);
}

function computeUsageMaps() {
  const wos = loadWorkOrders();
  const costs = loadCosts();
  const proposals = loadProposals();

  const woByTech = new Map(); // techId -> count assigned
  const costsByTech = new Map(); // techId -> count
  const proposalsByTech = new Map(); // techId -> count (tech or helper)

  for (const w of wos) {
    if (!w?.technicianId) continue;
    woByTech.set(w.technicianId, (woByTech.get(w.technicianId) || 0) + 1);
  }

  for (const c of costs) {
    if (!c?.technicianId) continue;
    costsByTech.set(c.technicianId, (costsByTech.get(c.technicianId) || 0) + 1);
  }

  for (const p of proposals) {
    const tid = p?.technicianId;
    const hid = p?.helperId;
    if (tid) proposalsByTech.set(tid, (proposalsByTech.get(tid) || 0) + 1);
    if (hid) proposalsByTech.set(hid, (proposalsByTech.get(hid) || 0) + 1);
  }

  return { woByTech, costsByTech, proposalsByTech };
}

export default function Technicians() {
  const [techs, setTechs] = useState(() => loadTechs());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // ✅ Refresh usage counts when returning from other pages
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    function onFocus() {
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // usage maps for “do not delete if referenced”
  const usage = useMemo(() => computeUsageMaps(), [techs.length, refreshKey]);

  useEffect(() => {
    saveTechs(techs);
  }, [techs]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return techs;

    return techs.filter((t) => {
      const blob = [
        t.name,
        t.trade,
        t.phone,
        t.city,
        t.state,
        t.address,
        t.fullAddress,
        t.notes,
        t.blacklistReason,
        t.recommendations,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(text);
    });
  }, [techs, q]);

  const stats = useMemo(() => {
    const total = techs.length;
    const active = techs.filter((t) => !t.blacklisted).length;
    const blacklisted = techs.filter((t) => t.blacklisted).length;
    return { total, active, blacklisted };
  }, [techs]);

  function isDuplicate(form, ignoreId = null) {
    const nameK = normalizeKey(form.name);
    const phoneK = normalizeKey(form.phone);
    const tradeK = normalizeKey(form.trade);
    const cityK = normalizeKey(form.city);

    return techs.some((t) => {
      if (ignoreId && t.id === ignoreId) return false;

      const tName = normalizeKey(t.name);
      const tPhone = normalizeKey(t.phone);
      const tTrade = normalizeKey(t.trade);
      const tCity = normalizeKey(t.city);

      // Strong match: same name + phone
      if (nameK && phoneK && tName === nameK && tPhone === phoneK) return true;

      // Fallback match when no phone: name + trade + city
      if (!phoneK && !tPhone && tName === nameK && tTrade === tradeK && tCity === cityK)
        return true;

      return false;
    });
  }

  function upsertTech(form) {
    const nowIso = new Date().toISOString();

    if (editing) {
      if (isDuplicate(form, editing.id)) {
        alert("Duplicate technician detected. Please verify name/phone/trade/city.");
        return;
      }

      setTechs((prev) =>
        prev.map((t) =>
          t.id === editing.id
            ? {
                ...t,
                ...form,
                updatedAt: nowIso,
              }
            : t
        )
      );
    } else {
      if (isDuplicate(form, null)) {
        alert("Duplicate technician detected. Please verify name/phone/trade/city.");
        return;
      }

      setTechs((prev) => [
        {
          id: uid(),
          createdAt: nowIso,
          updatedAt: nowIso,
          ...form,
        },
        ...prev,
      ]);
    }
  }

  function techUsageCounts(techId) {
    const woCount = usage.woByTech.get(techId) || 0;
    const costsCount = usage.costsByTech.get(techId) || 0;
    const proposalsCount = usage.proposalsByTech.get(techId) || 0;
    return { woCount, costsCount, proposalsCount };
  }

  function removeTech(id) {
    const t = techs.find((x) => x.id === id);
    if (!t) return;

    const u = techUsageCounts(id);
    const inUse = u.woCount > 0 || u.costsCount > 0 || u.proposalsCount > 0;

    if (inUse) {
      alert(
        `Deletion blocked (high security).\n\nThis technician is referenced by:\n- Work Orders assigned: ${u.woCount}\n- Costs records: ${u.costsCount}\n- Proposals (tech/helper): ${u.proposalsCount}\n\nRecommendation: Blacklist instead, so history stays consistent.`
      );
      return;
    }

    const ok = window.confirm(
      `Delete this technician?\n\nTechnician: ${t.name}\n\nThis cannot be undone.`
    );
    if (!ok) return;
    setTechs((prev) => prev.filter((x) => x.id !== id));
  }

  function toggleBlacklist(tech) {
    if (!tech) return;

    if (!tech.blacklisted) {
      const ok = window.confirm(
        `Blacklist this technician?\n\n${tech.name}\n\nThey will NOT appear in assignment lists.`
      );
      if (!ok) return;

      const needsReason = !sanitizeText(tech.blacklistReason, 200);
      if (needsReason) {
        const ok2 = window.confirm(
          "High security: Blacklist should include a reason.\n\nPress OK to continue now (you can add reason by editing), or Cancel to go edit first."
        );
        if (!ok2) return;
      }

      setTechs((prev) =>
        prev.map((t) =>
          t.id === tech.id
            ? { ...t, blacklisted: true, updatedAt: new Date().toISOString() }
            : t
        )
      );
    } else {
      const ok = window.confirm(
        `Remove blacklist?\n\n${tech.name}\n\nThey will become assignable again.`
      );
      if (!ok) return;

      setTechs((prev) =>
        prev.map((t) =>
          t.id === tech.id
            ? {
                ...t,
                blacklisted: false,
                blacklistReason: "",
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    }
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Technicians"
          subtitle="Your official technician list. Other pages can only assign from this list."
          actions={
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              type="button"
            >
              + Add Technician
            </button>
          }
        />

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Total: <span className="ml-1 tabular-nums">{stats.total}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            Active: <span className="ml-1 tabular-nums">{stats.active}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
            Blacklisted: <span className="ml-1 tabular-nums">{stats.blacklisted}</span>
          </span>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ui-hover">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-9">
              <input
                className="input"
                placeholder="Search by name, trade, phone, city, notes…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
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
              <div className="text-sm font-bold">Tech List</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Source of truth for assignments (Work Orders, Proposals, Costs).
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
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Trade</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">City / State</th>
                  <th className="px-4 py-3 text-left font-semibold">Stats</th>
                  <th className="px-4 py-3 text-left font-semibold">Blacklist</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((t, idx) => {
                  const u = techUsageCounts(t.id);
                  const inUse = u.woCount > 0 || u.costsCount > 0 || u.proposalsCount > 0;

                  const auditTitle = [
                    t.createdAt ? `Created: ${new Date(t.createdAt).toLocaleString()}` : "",
                    t.updatedAt ? `Updated: ${new Date(t.updatedAt).toLocaleString()}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <tr
                      key={t.id}
                      className={[
                        "group border-t border-slate-100 dark:border-slate-800/70",
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-900/60",
                        "hover:bg-brand-50/40 dark:hover:bg-brand-600/10",
                        "transition-colors",
                      ].join(" ")}
                      title={auditTitle}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[320px]">
                          {t.address ? t.address : "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">{t.trade || "—"}</td>
                      <td className="px-4 py-3">{t.phone || "—"}</td>
                      <td className="px-4 py-3">
                        {(t.city || "—") + (t.state ? `, ${t.state}` : "")}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Jobs:{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                            {t.jobsDone ?? 0}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          GMN Made:{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                            {formatMoney(t.gmnMoneyMade ?? 0)}
                          </span>
                        </div>
                        {inUse ? (
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            In use: WO {u.woCount} • Costs {u.costsCount} • Proposals {u.proposalsCount}
                          </div>
                        ) : (
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            Not referenced
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {t.blacklisted ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-900/40">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-200 dark:ring-emerald-900/40">
                            No
                          </span>
                        )}
                        {t.blacklisted && t.blacklistReason ? (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[240px] truncate">
                            {t.blacklistReason}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() => {
                              setEditing(t);
                              setOpen(true);
                            }}
                            type="button"
                          >
                            Edit
                          </button>

                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() => toggleBlacklist(t)}
                            title="High security: Prefer blacklisting over deleting to preserve history"
                            type="button"
                          >
                            {t.blacklisted ? "Unblacklist" : "Blacklist"}
                          </button>

                          <button
                            className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 dark:bg-white dark:text-slate-900 ui-hover ui-focus tap-feedback disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => removeTech(t.id)}
                            disabled={inUse}
                            title={inUse ? "Deletion blocked if referenced" : "Delete technician"}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="text-sm font-semibold">No technicians</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Add technicians here. Other pages will assign only from this list.
                      </div>

                      <button
                        className="mt-4 btn-primary"
                        onClick={() => {
                          setEditing(null);
                          setOpen(true);
                        }}
                        type="button"
                      >
                        + Add your first technician
                      </button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <TechnicianModal
          open={open}
          onClose={() => setOpen(false)}
          editing={editing}
          onSave={(form) => {
            upsertTech(form);
            setOpen(false);
          }}
        />
      </div>
    </PageTransition>
  );
}

function TechnicianModal({ open, onClose, onSave, editing }) {
  const [form, setForm] = useState(() => ({
    name: editing?.name || "",
    trade: editing?.trade || "Handyman",
    tradeOther: "",
    address: editing?.address || "",
    city: editing?.city || "",
    state: editing?.state || "",
    fullAddress: editing?.fullAddress || "",
    phone: editing?.phone || "",
    notes: editing?.notes || "",
    jobsDone: editing?.jobsDone ?? 0,
    gmnMoneyMade: editing?.gmnMoneyMade ?? 0,
    blacklisted: editing?.blacklisted || false,
    blacklistReason: editing?.blacklistReason || "",
    recommendations: editing?.recommendations || "",
  }));

  useEffect(() => {
    const existingTrade = editing?.trade || "Handyman";
    const isOther = String(existingTrade).toLowerCase().startsWith("other:");
    const otherValue = isOther ? existingTrade.split(":").slice(1).join(":").trim() : "";

    setForm({
      name: editing?.name || "",
      trade: isOther ? "Other (Custom)" : existingTrade,
      tradeOther: otherValue || "",
      address: editing?.address || "",
      city: editing?.city || "",
      state: editing?.state || "",
      fullAddress: editing?.fullAddress || "",
      phone: editing?.phone || "",
      notes: editing?.notes || "",
      jobsDone: editing?.jobsDone ?? 0,
      gmnMoneyMade: editing?.gmnMoneyMade ?? 0,
      blacklisted: editing?.blacklisted || false,
      blacklistReason: editing?.blacklistReason || "",
      recommendations: editing?.recommendations || "",
    });
  }, [editing]);

  const resolvedTrade = resolveTrade(form.trade, form.tradeOther);

  const nameOk = sanitizeText(form.name, 80).length >= 2;
  const tradeOk =
    resolvedTrade.trim().length >= 2 &&
    (form.trade !== "Other (Custom)" || sanitizeText(form.tradeOther, 60).length >= 2);

  const phoneNormalized = normalizePhone(form.phone);
  const blacklistReasonOk = !form.blacklisted || sanitizeText(form.blacklistReason, 200).length >= 3;

  const canSubmit = nameOk && tradeOk && blacklistReasonOk;

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  return (
    <Modal
      open={open}
      title={editing ? "Edit Technician" : "Add Technician"}
      subtitle="High security: strict validation, duplicates blocked, and blacklist requires a reason."
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name *">
          <input
            className="input"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Technician name"
          />
          {!nameOk ? (
            <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">
              Name must be at least 2 characters.
            </div>
          ) : null}
        </Field>

        <Field label="Trade *">
          <select
            className="input"
            value={form.trade}
            onChange={(e) => {
              update("trade", e.target.value);
              if (e.target.value !== "Other (Custom)") update("tradeOther", "");
            }}
          >
            {TRADE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        {form.trade === "Other (Custom)" ? (
          <div className="md:col-span-2">
            <Field label="Other trade name *">
              <input
                className="input"
                value={form.tradeOther}
                onChange={(e) => update("tradeOther", e.target.value)}
                placeholder="e.g. Fire Alarm, Pest Control, Solar…"
              />
              {!tradeOk ? (
                <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">
                  Custom trade must be at least 2 characters.
                </div>
              ) : null}
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Saved as <span className="font-semibold">Other: Your Value</span>.
              </div>
            </Field>
          </div>
        ) : null}

        <Field label="Address (line 1)">
          <input
            className="input"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Street / District"
          />
        </Field>

        <Field label="City">
          <input
            className="input"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="City"
          />
        </Field>

        <Field label="State">
          <input
            className="input"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="State"
          />
        </Field>

        <Field label="Full address (optional)">
          <input
            className="input"
            value={form.fullAddress}
            onChange={(e) => update("fullAddress", e.target.value)}
            placeholder="Full address details"
          />
        </Field>

        <Field label="Phone number">
          <input
            className="input"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+1 555 000 0000"
          />
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Stored as: <span className="font-semibold">{phoneNormalized || "—"}</span>
          </div>
        </Field>

        <Field label="Jobs done with GMN">
          <input
            type="number"
            min="0"
            className="input"
            value={form.jobsDone}
            onChange={(e) => update("jobsDone", Math.max(0, Number(e.target.value || 0)))}
          />
        </Field>

        <Field label="Money made by GMN">
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={form.gmnMoneyMade}
            onChange={(e) => update("gmnMoneyMade", Math.max(0, Number(e.target.value || 0)))}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Notes">
            <textarea
              rows={3}
              className="input"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any notes about this technician..."
            />
          </Field>
        </div>

        <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <div className="text-sm font-semibold">Blacklisted</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              If yes, they should not be assignable.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !form.blacklisted;
              if (next) {
                const ok = window.confirm("Blacklist this technician? A reason will be required.");
                if (!ok) return;
              } else {
                const ok = window.confirm("Remove blacklist? This will clear the blacklist reason.");
                if (!ok) return;
                update("blacklistReason", "");
              }
              update("blacklisted", next);
            }}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold ui-hover ui-focus tap-feedback",
              form.blacklisted
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {form.blacklisted ? "Yes" : "No"}
          </button>
        </div>

        {form.blacklisted ? (
          <div className="md:col-span-2">
            <Field label="Reason for black list *">
              <input
                className="input"
                value={form.blacklistReason}
                onChange={(e) => update("blacklistReason", e.target.value)}
                placeholder="Reason (required)..."
              />
              {!blacklistReasonOk ? (
                <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">
                  Reason must be at least 3 characters.
                </div>
              ) : null}
            </Field>
          </div>
        ) : null}

        <div className="md:col-span-2">
          <Field label="Recommendations">
            <textarea
              rows={3}
              className="input"
              value={form.recommendations}
              onChange={(e) => update("recommendations", e.target.value)}
              placeholder="Recommendations / strengths / notes..."
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Required: Name + Trade. Blacklist requires a reason.
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5" type="button">
            Cancel
          </button>

          <button
            disabled={!canSubmit}
            onClick={() =>
              onSave({
                ...form,
                name: sanitizeText(form.name, 80),
                trade: resolvedTrade,
                tradeOther: "",
                address: sanitizeText(form.address, 120),
                city: sanitizeText(form.city, 80),
                state: sanitizeText(form.state, 40),
                fullAddress: sanitizeText(form.fullAddress, 200),
                phone: phoneNormalized,
                notes: sanitizeText(form.notes, 600),
                recommendations: sanitizeText(form.recommendations, 600),
                blacklistReason: form.blacklisted ? sanitizeText(form.blacklistReason, 200) : "",
                jobsDone: Number.isFinite(Number(form.jobsDone)) ? Number(form.jobsDone) : 0,
                gmnMoneyMade: Number.isFinite(Number(form.gmnMoneyMade)) ? Number(form.gmnMoneyMade) : 0,
              })
            }
            className={[
              "rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm ui-hover ui-focus tap-feedback",
              canSubmit ? "bg-brand-600 hover:bg-brand-700" : "bg-slate-300 cursor-not-allowed dark:bg-slate-700",
            ].join(" ")}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
