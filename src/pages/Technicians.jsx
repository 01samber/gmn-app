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

// Badge component for status display
function Badge({ children, tone = "slate" }) {
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
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap",
        tones[tone] || tones.slate,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function Technicians() {
  const [techs, setTechs] = useState(() => loadTechs());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showOnlyBlacklisted, setShowOnlyBlacklisted] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState("all");

  // ✅ Refresh usage counts when returning from other pages
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    function onFocus() {
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // usage maps for "do not delete if referenced"
  const usage = useMemo(() => computeUsageMaps(), [techs.length, refreshKey]);

  useEffect(() => {
    saveTechs(techs);
  }, [techs]);

  // Get unique trades for filter
  const uniqueTrades = useMemo(() => {
    const trades = new Set(techs.map(t => t.trade).filter(Boolean));
    return ["all", ...Array.from(trades).sort()];
  }, [techs]);

  const filtered = useMemo(() => {
    let result = techs;

    // Text search
    const text = q.trim().toLowerCase();
    if (text) {
      result = result.filter((t) => {
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
    }

    // Blacklist filter
    if (showOnlyBlacklisted) {
      result = result.filter(t => t.blacklisted);
    }

    // Active filter
    if (showOnlyActive) {
      result = result.filter(t => !t.blacklisted);
    }

    // Trade filter
    if (selectedTrade !== "all") {
      result = result.filter(t => t.trade === selectedTrade);
    }

    return result;
  }, [techs, q, showOnlyBlacklisted, showOnlyActive, selectedTrade]);

  const stats = useMemo(() => {
    const total = techs.length;
    const active = techs.filter((t) => !t.blacklisted).length;
    const blacklisted = techs.filter((t) => t.blacklisted).length;
    
    // Calculate total GMN money made
    const totalMoneyMade = techs.reduce((sum, t) => sum + (t.gmnMoneyMade || 0), 0);
    
    // Calculate total jobs done
    const totalJobsDone = techs.reduce((sum, t) => sum + (t.jobsDone || 0), 0);
    
    // Count technicians with usage
    const usedTechs = techs.filter(t => {
      const u = usage.woByTech.get(t.id) || 0;
      const c = usage.costsByTech.get(t.id) || 0;
      const p = usage.proposalsByTech.get(t.id) || 0;
      return u > 0 || c > 0 || p > 0;
    }).length;

    return { total, active, blacklisted, totalMoneyMade, totalJobsDone, usedTechs };
  }, [techs, usage]);

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

  function quickActions(tech) {
    const actions = [];
    
    // Quick completion percentage for jobs done
    if (tech.jobsDone > 0) {
      actions.push(`${tech.jobsDone} jobs`);
    }
    
    // Quick GMN money display
    if (tech.gmnMoneyMade > 0) {
      actions.push(formatMoney(tech.gmnMoneyMade));
    }
    
    // Usage info
    const usage = techUsageCounts(tech.id);
    if (usage.woCount > 0) {
      actions.push(`${usage.woCount} active WOs`);
    }
    
    return actions.length > 0 ? actions.join(" • ") : "No activity";
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

        {/* Enhanced Summary chips with better visuals */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm">
              <div className="font-semibold text-slate-700 dark:text-slate-200">Total Techs</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            </div>
          </div>
          
          <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <div className="text-sm">
              <div className="font-semibold text-emerald-700 dark:text-emerald-200">Active</div>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-100">{stats.active}</div>
            </div>
          </div>
          
          <div className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-900/20">
            <div className="text-sm">
              <div className="font-semibold text-rose-700 dark:text-rose-200">Blacklisted</div>
              <div className="text-2xl font-bold text-rose-800 dark:text-rose-100">{stats.blacklisted}</div>
            </div>
          </div>
          
          <div className="inline-flex items-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-600/30 dark:bg-brand-600/15">
            <div className="text-sm">
              <div className="font-semibold text-brand-700 dark:text-brand-100">Used in System</div>
              <div className="text-2xl font-bold text-brand-800 dark:text-brand-100">{stats.usedTechs}</div>
            </div>
          </div>
          
          <div className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
            <div className="text-sm">
              <div className="font-semibold text-amber-800 dark:text-amber-200">Total GMN Made</div>
              <div className="text-lg font-bold text-amber-900 dark:text-amber-100">{formatMoney(stats.totalMoneyMade)}</div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ui-hover">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="relative">
                <input
                  className="input pl-10"
                  placeholder="Search technicians by name, trade, phone, city..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-3">
              <select
                className="input"
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
              >
                <option value="all">All Trades</option>
                {uniqueTrades.filter(t => t !== "all").map(trade => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <button
                onClick={() => setShowOnlyActive(!showOnlyActive)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showOnlyActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'}`}
              >
                Active Only
              </button>
              <button
                onClick={() => setShowOnlyBlacklisted(!showOnlyBlacklisted)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showOnlyBlacklisted 
                  ? 'bg-rose-600 text-white' 
                  : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200'}`}
              >
                Blacklisted
              </button>
              <button
                onClick={() => {
                  setShowOnlyActive(false);
                  setShowOnlyBlacklisted(false);
                  setSelectedTrade("all");
                  setQ("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <div className="font-semibold">Showing {filtered.length} technicians</div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="text-brand-600 hover:text-brand-800 dark:text-brand-400"
              >
                ↻ Refresh Data
              </button>
              <button
                onClick={() => {
                  const techsWithIssues = techs.filter(t => 
                    !t.phone || !t.city || !t.address
                  );
                  if (techsWithIssues.length > 0) {
                    alert(`Found ${techsWithIssues.length} technicians missing contact info.`);
                  } else {
                    alert("All technicians have complete contact info!");
                  }
                }}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400"
              >
                Check Incomplete
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Table with Scrollability */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">Technician Master List</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Source of truth for all technician assignments
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {filtered.length} of {techs.length}
              </div>
              <button
                onClick={() => {
                  const csv = techs.map(t => 
                    `${t.name},${t.trade},${t.phone},${t.city},${t.state},${t.blacklisted ? 'Yes' : 'No'}`
                  ).join('\n');
                  navigator.clipboard.writeText(csv);
                  alert('Technician list copied to clipboard!');
                }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Export List
              </button>
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-350px)]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">Technician Details</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">Contact & Location</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">Performance</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">Status</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((t, idx) => {
                  const u = techUsageCounts(t.id);
                  const inUse = u.woCount > 0 || u.costsCount > 0 || u.proposalsCount > 0;

                  return (
                    <tr
                      key={t.id}
                      className={[
                        "group border-t border-slate-100 dark:border-slate-800/70 hover:bg-brand-50/40 dark:hover:bg-brand-600/10 transition-colors",
                        t.blacklisted ? "bg-rose-50/20 dark:bg-rose-900/10" : "",
                      ].join(" ")}
                    >
                      {/* Technician Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.blacklisted ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200' : 'bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'}`}>
                            <span className="font-bold">{t.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                            <div className="mt-1">
                              <Badge tone={t.blacklisted ? "rose" : "brand"}>{t.trade || "No Trade"}</Badge>
                            </div>
                            {t.notes && (
                              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-[300px]">
                                📝 {t.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {t.phone ? (
                            <div className="flex items-center gap-2">
                              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <a href={`tel:${t.phone}`} className="text-brand-600 hover:text-brand-800 dark:text-brand-400">
                                {t.phone}
                              </a>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500">No phone</div>
                          )}
                          
                          {t.address ? (
                            <div className="flex items-start gap-2">
                              <svg className="h-3.5 w-3.5 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div>
                                <div className="text-sm text-slate-700 dark:text-slate-200">{t.address}</div>
                                {(t.city || t.state) && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {[t.city, t.state].filter(Boolean).join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500">No address</div>
                          )}
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Jobs</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{t.jobsDone || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">GMN Made</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              {formatMoney(t.gmnMoneyMade || 0)}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {inUse ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                                  Active in {u.woCount} WOs, {u.costsCount} costs, {u.proposalsCount} proposals
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                  No active assignments
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div>
                            {t.blacklisted ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Blacklisted
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Active
                              </div>
                            )}
                          </div>
                          
                          {t.blacklisted && t.blacklistReason && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 max-w-[200px]">
                              ⚠️ {t.blacklistReason}
                            </div>
                          )}
                          
                          {t.recommendations && (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              ⭐ {t.recommendations.substring(0, 40)}...
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button
                              className="btn-ghost flex-1 px-3 py-1.5 text-xs"
                              onClick={() => {
                                setEditing(t);
                                setOpen(true);
                              }}
                              title="Edit technician"
                            >
                              Edit
                            </button>
                            <button
                              className="btn-ghost flex-1 px-3 py-1.5 text-xs"
                              onClick={() => toggleBlacklist(t)}
                              title={t.blacklisted ? "Remove blacklist" : "Blacklist technician"}
                            >
                              {t.blacklisted ? "Activate" : "Blacklist"}
                            </button>
                          </div>
                          <button
                            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 ui-hover disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => removeTech(t.id)}
                            disabled={inUse}
                            title={inUse ? "Cannot delete - technician has active assignments" : "Delete technician"}
                          >
                            {inUse ? "Locked" : "Delete"}
                          </button>
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 text-center">
                            {quickActions(t)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="rounded-full bg-slate-100 p-4 inline-block dark:bg-slate-800">
                          <svg className="h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="mt-6">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">No technicians found</div>
                          <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {techs.length === 0 
                              ? "Add your first technician to start assigning work orders and tracking performance."
                              : "Try adjusting your search filters to find what you're looking for."}
                          </div>
                          {techs.length === 0 && (
                            <button
                              className="mt-6 btn-primary px-8 py-3 text-base font-semibold"
                              onClick={() => {
                                setEditing(null);
                                setOpen(true);
                              }}
                              type="button"
                            >
                              + Add Your First Technician
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Footer with statistics */}
          {filtered.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-4">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <div>
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span> of{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">{techs.length}</span> technicians
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span>Active: {stats.active}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                    <span>Blacklisted: {stats.blacklisted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand-500"></div>
                    <span>Used: {stats.usedTechs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
      title={editing ? "Edit Technician" : "Add New Technician"}
      subtitle="High security: strict validation, duplicates blocked, and blacklist requires a reason."
      onClose={onClose}
      size="large"
    >
      {/* Make modal content scrollable */}
      <div className="max-h-[80vh] overflow-y-auto pr-2 -mr-2">
        <div className="space-y-6 pb-4">
          {/* Personal Info Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Information</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Basic details about the technician</p>
              </div>
              <div className={`h-3 w-3 rounded-full ${canSubmit ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name *">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="John Doe"
                  autoFocus
                />
                {!nameOk && (
                  <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                    Name must be at least 2 characters
                  </div>
                )}
              </Field>

              <Field label="Primary Trade *">
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

              {form.trade === "Other (Custom)" && (
                <div className="md:col-span-2">
                  <Field label="Custom Trade Name *">
                    <input
                      className="input"
                      value={form.tradeOther}
                      onChange={(e) => update("tradeOther", e.target.value)}
                      placeholder="e.g., Fire Alarm, Pest Control, Solar Installation..."
                    />
                    {!tradeOk && (
                      <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                        Please specify a custom trade name
                      </div>
                    )}
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Location Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Contact & Location</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone Number">
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
                {phoneNormalized && (
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Will be stored as: <span className="font-mono">{phoneNormalized}</span>
                  </div>
                )}
              </Field>

              <Field label="City">
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="New York"
                />
              </Field>

              <Field label="Street Address">
                <input
                  className="input"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="123 Main Street"
                />
              </Field>

              <Field label="State">
                <input
                  className="input"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  placeholder="NY"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Full Address (for maps/navigation)">
                  <textarea
                    rows={2}
                    className="input"
                    value={form.fullAddress}
                    onChange={(e) => update("fullAddress", e.target.value)}
                    placeholder="Full detailed address including zip code, apartment number, etc."
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Performance & Statistics Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Performance & Statistics</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Jobs Completed with GMN">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className="input pl-12"
                    value={form.jobsDone}
                    onChange={(e) => update("jobsDone", Math.max(0, Number(e.target.value || 0)))}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </Field>

              <Field label="Total GMN Revenue Generated">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-400">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input pl-10"
                    value={form.gmnMoneyMade}
                    onChange={(e) => update("gmnMoneyMade", Math.max(0, Number(e.target.value || 0)))}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Notes & Additional Info */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Internal Notes">
                <textarea
                  rows={4}
                  className="input"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Performance notes, special skills, equipment owned, reliability rating..."
                />
              </Field>

              <Field label="Recommendations & Strengths">
                <textarea
                  rows={4}
                  className="input"
                  value={form.recommendations}
                  onChange={(e) => update("recommendations", e.target.value)}
                  placeholder="Areas of expertise, certifications, preferred work types..."
                />
              </Field>
            </div>
          </div>

          {/* Blacklist Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Blacklist Status</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Blacklisted technicians won't appear in assignment lists
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  const next = !form.blacklisted;
                  if (next) {
                    if (!window.confirm("Blacklist this technician? A reason will be required.")) return;
                  } else {
                    if (!window.confirm("Remove blacklist? This will clear the blacklist reason.")) return;
                    update("blacklistReason", "");
                  }
                  update("blacklisted", next);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${form.blacklisted 
                  ? "bg-rose-600 text-white hover:bg-rose-700" 
                  : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
              >
                {form.blacklisted ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Blacklisted
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Active
                  </>
                )}
              </button>
            </div>

            {form.blacklisted && (
              <div className="mt-4">
                <Field label="Blacklist Reason *">
                  <textarea
                    rows={3}
                    className="input"
                    value={form.blacklistReason}
                    onChange={(e) => update("blacklistReason", e.target.value)}
                    placeholder="Why is this technician blacklisted? (Quality issues, payment problems, safety concerns, etc.)"
                  />
                  {!blacklistReasonOk && (
                    <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                      Please provide a reason for blacklisting (min. 3 characters)
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Footer - Stays at bottom */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-slate-200 bg-white pt-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {editing ? "Update Technician" : "Create New Technician"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Fields marked with * are required
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-ghost px-5 py-2.5"
              type="button"
            >
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
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${canSubmit 
                ? "bg-brand-600 hover:bg-brand-700" 
                : "bg-slate-300 cursor-not-allowed dark:bg-slate-700"}`}
              type="button"
            >
              {editing ? "Save Changes" : "Create Technician"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}