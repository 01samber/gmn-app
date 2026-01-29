import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Filter, Edit2, Trash2, User, MapPin, Calendar, DollarSign, ChevronDown, X, ClipboardList } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage, { InlineError } from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { workOrdersApi, techniciansApi } from "../api";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "waiting", label: "Waiting" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
];

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWo, setEditingWo] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    client: "", trade: "", description: "", nte: "", status: "waiting",
    city: "", state: "", address: "", etaAt: "", technicianId: "", notes: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [woRes, techRes] = await Promise.all([
        workOrdersApi.getAll({ limit: 100, status: statusFilter !== "all" ? statusFilter : undefined, search: search || undefined }),
        techniciansApi.getAll({ limit: 100 }),
      ]);
      setWorkOrders(woRes.data || []);
      setTechnicians(techRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditingWo(null);
    setForm({ client: "", trade: "", description: "", nte: "", status: "waiting", city: "", state: "", address: "", etaAt: "", technicianId: "", notes: "" });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(wo) {
    setEditingWo(wo);
    setForm({
      client: wo.client || "",
      trade: wo.trade || "",
      description: wo.description || "",
      nte: wo.nte?.toString() || "",
      status: wo.status || "waiting",
      city: wo.city || "",
      state: wo.state || "",
      address: wo.address || "",
      etaAt: wo.etaAt ? new Date(wo.etaAt).toISOString().slice(0, 16) : "",
      technicianId: wo.technicianId || "",
      notes: wo.notes || "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.client.trim() || !form.trade.trim()) {
      setFormError("Client and Trade are required");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const data = {
        ...form,
        nte: parseFloat(form.nte) || 0,
        etaAt: form.etaAt || null,
        technicianId: form.technicianId || null,
      };

      if (editingWo) {
        await workOrdersApi.update(editingWo.id, data);
      } else {
        await workOrdersApi.create(data);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(wo) {
    if (!confirm(`Delete work order ${wo.woNumber}?`)) return;
    try {
      await workOrdersApi.delete(wo.id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredWos = workOrders;

  if (loading) return <PageLoader message="Loading work orders..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Work Orders"
        icon={ClipboardList}
        subtitle="Manage and track all your work orders"
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Work Order
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
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input appearance-none pr-10 min-w-[160px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Work Orders List */}
      {filteredWos.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work orders found"
          description={search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first work order to get started"}
          actionLabel="New Work Order"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          {filteredWos.map((wo) => (
            <div key={wo.id} className="card p-5 hover:shadow-lg transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">{wo.woNumber}</span>
                    <StatusBadge status={wo.status} compact />
                  </div>
                  <h3 className="font-semibold text-lg truncate">{wo.client}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{wo.trade}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  {wo.technician && (
                    <span className="flex items-center gap-1.5">
                      <User size={14} /> {wo.technician.name}
                    </span>
                  )}
                  {wo.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} /> {wo.city}
                    </span>
                  )}
                  {wo.nte > 0 && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign size={14} /> NTE ${wo.nte}
                    </span>
                  )}
                  {wo.etaAt && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} /> {new Date(wo.etaAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(wo)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(wo)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingWo ? "Edit Work Order" : "New Work Order"} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          {formError && <InlineError error={formError} onDismiss={() => setFormError(null)} />}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Client *</label>
              <input
                type="text"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                className="input"
                placeholder="Client name"
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

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Work order details..."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">NTE ($)</label>
              <input
                type="number"
                value={form.nte}
                onChange={(e) => setForm({ ...form, nte: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                {STATUS_OPTIONS.filter(s => s.value !== "all").map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ETA</label>
              <input
                type="datetime-local"
                value={form.etaAt}
                onChange={(e) => setForm({ ...form, etaAt: e.target.value })}
                className="input"
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
              <label className="block text-sm font-medium mb-2">Technician</label>
              <select
                value={form.technicianId}
                onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
                className="input"
              >
                <option value="">Unassigned</option>
                {technicians.filter(t => !t.isBlacklisted).map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name} - {tech.trade}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : editingWo ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
