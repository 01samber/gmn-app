import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Phone, MapPin, Star, Ban, Users, ChevronDown } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage, { InlineError } from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { techniciansApi } from "../api";

export default function Technicians() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [trades, setTrades] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", trade: "", phone: "", email: "", address: "", city: "", state: "",
    zipCode: "", hourlyRate: "", notes: "", isBlacklisted: false, blacklistReason: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await techniciansApi.getAll({
        limit: 100,
        trade: tradeFilter !== "all" ? tradeFilter : undefined,
        search: search || undefined,
        includeBlacklisted: "true",
      });
      setTechnicians(res.data || []);
      
      // Get unique trades
      const uniqueTrades = [...new Set((res.data || []).map(t => t.trade))].filter(Boolean).sort();
      setTrades(uniqueTrades);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tradeFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditingTech(null);
    setForm({ name: "", trade: "", phone: "", email: "", address: "", city: "", state: "", zipCode: "", hourlyRate: "", notes: "", isBlacklisted: false, blacklistReason: "" });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(tech) {
    setEditingTech(tech);
    setForm({
      name: tech.name || "",
      trade: tech.trade || "",
      phone: tech.phone || "",
      email: tech.email || "",
      address: tech.address || "",
      city: tech.city || "",
      state: tech.state || "",
      zipCode: tech.zipCode || "",
      hourlyRate: tech.hourlyRate?.toString() || "",
      notes: tech.notes || "",
      isBlacklisted: tech.isBlacklisted || false,
      blacklistReason: tech.blacklistReason || "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.trade.trim()) {
      setFormError("Name and Trade are required");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const data = {
        ...form,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
      };

      if (editingTech) {
        await techniciansApi.update(editingTech.id, data);
      } else {
        await techniciansApi.create(data);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tech) {
    if (!confirm(`Delete ${tech.name}?`)) return;
    try {
      await techniciansApi.delete(tech.id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleBlacklist(tech) {
    const reason = tech.isBlacklisted ? "" : prompt("Reason for blacklisting:");
    if (!tech.isBlacklisted && reason === null) return;
    
    try {
      await techniciansApi.update(tech.id, {
        isBlacklisted: !tech.isBlacklisted,
        blacklistReason: tech.isBlacklisted ? "" : reason,
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <PageLoader message="Loading technicians..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Technicians"
        icon={Users}
        subtitle="Manage your technician database"
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Technician
          </button>
        }
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search technicians..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="relative">
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="input appearance-none pr-10 min-w-[160px]"
          >
            <option value="all">All Trades</option>
            {trades.map((trade) => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Technicians Grid */}
      {technicians.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No technicians found"
          description={search || tradeFilter !== "all" ? "Try adjusting your filters" : "Add your first technician to get started"}
          actionLabel="Add Technician"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <div key={tech.id} className={`card p-5 transition-all hover:shadow-lg ${tech.isBlacklisted ? "opacity-60 border-rose-200 dark:border-rose-800" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{tech.name}</h3>
                    {tech.isBlacklisted && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-xs font-medium">
                        Blacklisted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tech.trade}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-amber-500" />
                  <span className="text-sm font-medium">{tech.rating?.toFixed(1) || "5.0"}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                {tech.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    <span>{tech.phone}</span>
                  </div>
                )}
                {tech.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{tech.city}, {tech.state}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-sm">
                  <span className="text-slate-500">Jobs:</span>{" "}
                  <span className="font-semibold">{tech.jobsDone}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-500">Earned:</span>{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">${tech.gmnMoneyMade?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(tech)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => toggleBlacklist(tech)} className={`p-2 rounded-lg transition-colors ${tech.isBlacklisted ? "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500" : "hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500"}`}>
                    <Ban size={14} />
                  </button>
                  <button onClick={() => handleDelete(tech)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTech ? "Edit Technician" : "Add Technician"} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          {formError && <InlineError error={formError} onDismiss={() => setFormError(null)} />}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Trade *</label>
              <input
                type="text"
                value={form.trade}
                onChange={(e) => setForm({ ...form, trade: e.target.value })}
                className="input"
                placeholder="e.g., HVAC, Plumbing"
                required
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="555-555-5555"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="tech@example.com"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="input"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hourly Rate ($)</label>
              <input
                type="number"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : editingTech ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
