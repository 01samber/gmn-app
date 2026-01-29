import { useEffect, useState, useCallback } from "react";
import { Plus, Search, DollarSign, ChevronDown, CheckCircle, Clock, CreditCard, AlertCircle } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage, { InlineError } from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { costsApi, workOrdersApi, techniciansApi } from "../api";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
];

const STATUS_CONFIG = {
  requested: { label: "Requested", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  approved: { label: "Approved", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", icon: CheckCircle },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CreditCard },
};

export default function Costs() {
  const [costs, setCosts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ workOrderId: "", technicianId: "", amount: "", note: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [costsRes, woRes, techRes] = await Promise.all([
        costsApi.getAll({ limit: 100, status: statusFilter !== "all" ? statusFilter : undefined }),
        workOrdersApi.getAll({ limit: 100, status: "completed" }),
        techniciansApi.getAll({ limit: 100 }),
      ]);
      setCosts(costsRes.data || []);
      setWorkOrders(woRes.data || []);
      setTechnicians(techRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setForm({ workOrderId: "", technicianId: "", amount: "", note: "" });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.workOrderId || !form.technicianId || !form.amount) {
      setFormError("Work order, technician, and amount are required");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await costsApi.create({
        workOrderId: form.workOrderId,
        technicianId: form.technicianId,
        amount: parseFloat(form.amount),
        note: form.note,
      });
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(cost, newStatus) {
    try {
      await costsApi.update(cost.id, { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Filter by search
  const filteredCosts = search
    ? costs.filter(c => 
        c.workOrder?.woNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.workOrder?.client?.toLowerCase().includes(search.toLowerCase()) ||
        c.technician?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : costs;

  // Calculate totals
  const totalRequested = costs.filter(c => c.status === "requested").reduce((sum, c) => sum + c.amount, 0);
  const totalApproved = costs.filter(c => c.status === "approved").reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = costs.filter(c => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);

  if (loading) return <PageLoader message="Loading costs..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Costs"
        icon={DollarSign}
        subtitle="Manage technician payments and costs"
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Request Payment
          </button>
        }
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="card p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-600 dark:text-amber-400" size={24} />
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-300">Requested</p>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-200">${totalRequested.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border-sky-200 dark:border-sky-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-sky-600 dark:text-sky-400" size={24} />
            <div>
              <p className="text-sm text-sky-700 dark:text-sky-300">Approved</p>
              <p className="text-xl font-bold text-sky-800 dark:text-sky-200">${totalApproved.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <CreditCard className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Paid</p>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search costs..."
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

      {/* Costs List */}
      {filteredCosts.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No costs found"
          description={search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first payment request"}
          actionLabel="Request Payment"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          {filteredCosts.map((cost) => {
            const config = STATUS_CONFIG[cost.status] || STATUS_CONFIG.requested;
            const Icon = config.icon;
            
            return (
              <div key={cost.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                        {cost.workOrder?.woNumber}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                        <Icon size={12} />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {cost.workOrder?.client} • {cost.technician?.name}
                    </p>
                    {cost.note && <p className="text-sm text-slate-500 mt-1">{cost.note}</p>}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">${cost.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(cost.requestedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {cost.status === "requested" && (
                      <button
                        onClick={() => updateStatus(cost, "approved")}
                        className="px-3 py-2 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 text-sm font-medium hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {cost.status === "approved" && (
                      <button
                        onClick={() => updateStatus(cost, "paid")}
                        className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Payment" size="md">
        <form onSubmit={handleSave} className="space-y-5">
          {formError && <InlineError error={formError} onDismiss={() => setFormError(null)} />}

          <div>
            <label className="block text-sm font-medium mb-2">Work Order *</label>
            <select
              value={form.workOrderId}
              onChange={(e) => {
                const wo = workOrders.find(w => w.id === e.target.value);
                setForm({
                  ...form,
                  workOrderId: e.target.value,
                  technicianId: wo?.technicianId || form.technicianId,
                });
              }}
              className="input"
              required
            >
              <option value="">Select work order</option>
              {workOrders.filter(wo => wo.status === "completed").map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.woNumber} - {wo.client}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Only completed work orders can have payment requests</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Technician *</label>
            <select
              value={form.technicianId}
              onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
              className="input"
              required
            >
              <option value="">Select technician</option>
              {technicians.filter(t => !t.isBlacklisted).map((tech) => (
                <option key={tech.id} value={tech.id}>{tech.name} - {tech.trade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount ($) *</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Payment details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Submitting..." : "Request Payment"}
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
