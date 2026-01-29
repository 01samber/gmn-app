import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, FileText, ChevronDown, Printer, Edit2, Trash2, AlertTriangle } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage, { InlineError } from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { proposalsApi, workOrdersApi, techniciansApi } from "../api";

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    workOrderId: "", technicianId: "", helperId: "",
    tripFee: "", assessmentFee: "", techHours: "", techRate: "",
    helperHours: "", helperRate: "", costMultiplier: "1.35", taxRate: "0", notes: "",
    parts: [],
  });

  // Get the selected work order to filter technicians by trade
  const selectedWorkOrder = useMemo(() => {
    return workOrders.find(wo => wo.id === form.workOrderId);
  }, [workOrders, form.workOrderId]);

  // Filter technicians: must be in tech list, not blacklisted, and trade must match work order trade
  const eligibleTechnicians = useMemo(() => {
    if (!selectedWorkOrder) return [];
    
    return technicians.filter(tech => {
      // Must not be blacklisted
      if (tech.isBlacklisted) return false;
      
      // Trade must match (case-insensitive comparison)
      const techTrade = (tech.trade || "").toLowerCase().trim();
      const woTrade = (selectedWorkOrder.trade || "").toLowerCase().trim();
      
      return techTrade === woTrade;
    });
  }, [technicians, selectedWorkOrder]);

  // Filter helpers: same rules as technicians, but exclude the selected technician
  const eligibleHelpers = useMemo(() => {
    return eligibleTechnicians.filter(tech => tech.id !== form.technicianId);
  }, [eligibleTechnicians, form.technicianId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [propRes, woRes, techRes] = await Promise.all([
        proposalsApi.getAll({ limit: 100 }),
        workOrdersApi.getAll({ limit: 100 }),
        techniciansApi.getAll({ limit: 100 }),
      ]);
      setProposals(propRes.data || []);
      setWorkOrders(woRes.data || []);
      setTechnicians(techRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditingProposal(null);
    setForm({
      workOrderId: "", technicianId: "", helperId: "",
      tripFee: "", assessmentFee: "", techHours: "", techRate: "",
      helperHours: "", helperRate: "", costMultiplier: "1.35", taxRate: "0", notes: "",
      parts: [],
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(proposal) {
    setEditingProposal(proposal);
    const parts = typeof proposal.parts === "string" ? JSON.parse(proposal.parts || "[]") : (proposal.parts || []);
    setForm({
      workOrderId: proposal.workOrderId || "",
      technicianId: proposal.technicianId || "",
      helperId: proposal.helperId || "",
      tripFee: proposal.tripFee?.toString() || "",
      assessmentFee: proposal.assessmentFee?.toString() || "",
      techHours: proposal.techHours?.toString() || "",
      techRate: proposal.techRate?.toString() || "",
      helperHours: proposal.helperHours?.toString() || "",
      helperRate: proposal.helperRate?.toString() || "",
      costMultiplier: proposal.costMultiplier?.toString() || "1.35",
      taxRate: proposal.taxRate?.toString() || "0",
      notes: proposal.notes || "",
      parts,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.workOrderId) {
      setFormError("Work order is required");
      return;
    }
    if (form.helperId && form.helperId === form.technicianId) {
      setFormError("Helper cannot be the same as technician");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const data = {
        workOrderId: form.workOrderId,
        technicianId: form.technicianId || null,
        helperId: form.helperId || null,
        tripFee: parseFloat(form.tripFee) || 0,
        assessmentFee: parseFloat(form.assessmentFee) || 0,
        techHours: parseFloat(form.techHours) || 0,
        techRate: parseFloat(form.techRate) || 0,
        helperHours: parseFloat(form.helperHours) || 0,
        helperRate: parseFloat(form.helperRate) || 0,
        costMultiplier: parseFloat(form.costMultiplier) || 1.35,
        taxRate: parseFloat(form.taxRate) || 0,
        parts: form.parts,
        notes: form.notes,
      };

      if (editingProposal) {
        await proposalsApi.update(editingProposal.id, data);
      } else {
        await proposalsApi.create(data);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(proposal) {
    if (!confirm(`Delete proposal ${proposal.proposalNumber}?`)) return;
    try {
      await proposalsApi.delete(proposal.id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  function printProposal(proposal) {
    const wo = proposal.workOrder;
    const parts = typeof proposal.parts === "string" ? JSON.parse(proposal.parts || "[]") : (proposal.parts || []);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proposal ${proposal.proposalNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
          h1 { color: #0ea5e9; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f8fafc; }
          .total { font-size: 24px; font-weight: bold; color: #0ea5e9; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>GMN Proposal</h1>
        <p><strong>Proposal #:</strong> ${proposal.proposalNumber}</p>
        <p><strong>Date:</strong> ${new Date(proposal.createdAt).toLocaleDateString()}</p>
        <hr>
        <h2>Work Order Details</h2>
        <p><strong>WO #:</strong> ${wo?.woNumber || "N/A"}</p>
        <p><strong>Client:</strong> ${wo?.client || "N/A"}</p>
        <p><strong>Trade:</strong> ${wo?.trade || "N/A"}</p>
        <hr>
        <h2>Cost Breakdown</h2>
        <table>
          <tr><th>Item</th><th>Amount</th></tr>
          <tr><td>Trip Fee</td><td>$${proposal.tripFee?.toFixed(2) || "0.00"}</td></tr>
          <tr><td>Assessment Fee</td><td>$${proposal.assessmentFee?.toFixed(2) || "0.00"}</td></tr>
          <tr><td>Tech Labor (${proposal.techHours || 0} hrs @ $${proposal.techRate || 0}/hr)</td><td>$${((proposal.techHours || 0) * (proposal.techRate || 0)).toFixed(2)}</td></tr>
          <tr><td>Helper Labor (${proposal.helperHours || 0} hrs @ $${proposal.helperRate || 0}/hr)</td><td>$${((proposal.helperHours || 0) * (proposal.helperRate || 0)).toFixed(2)}</td></tr>
          ${parts.map(p => `<tr><td>${p.description || "Part"} (${p.quantity || 1} x $${p.unitPrice || 0})</td><td>$${((p.quantity || 1) * (p.unitPrice || 0)).toFixed(2)}</td></tr>`).join("")}
        </table>
        <p><strong>Subtotal:</strong> $${proposal.subtotal?.toFixed(2) || "0.00"}</p>
        <p><strong>Tax:</strong> $${proposal.tax?.toFixed(2) || "0.00"}</p>
        <p class="total"><strong>Total:</strong> $${proposal.total?.toFixed(2) || "0.00"}</p>
        <button onclick="window.print()">Print</button>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  }

  const filteredProposals = search
    ? proposals.filter(p =>
        p.proposalNumber?.toLowerCase().includes(search.toLowerCase()) ||
        p.workOrder?.woNumber?.toLowerCase().includes(search.toLowerCase()) ||
        p.workOrder?.client?.toLowerCase().includes(search.toLowerCase())
      )
    : proposals;

  if (loading) return <PageLoader message="Loading proposals..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Proposals"
        icon={FileText}
        subtitle="Create and manage service proposals"
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Proposal
          </button>
        }
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals found"
          description={search ? "Try adjusting your search" : "Create your first proposal"}
          actionLabel="New Proposal"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          {filteredProposals.map((proposal) => (
            <div key={proposal.id} className="card p-5 hover:shadow-lg transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
                      {proposal.proposalNumber}
                    </span>
                    <span className="text-sm text-slate-500">→</span>
                    <span className="font-mono text-sm text-brand-600 dark:text-brand-400">
                      {proposal.workOrder?.woNumber}
                    </span>
                  </div>
                  <h3 className="font-semibold">{proposal.workOrder?.client}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {proposal.workOrder?.trade} • {proposal.technician?.name || "No technician"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${proposal.total?.toLocaleString() || "0"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printProposal(proposal)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Print"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(proposal)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(proposal)}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProposal ? "Edit Proposal" : "New Proposal"} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          {formError && <InlineError error={formError} onDismiss={() => setFormError(null)} />}

          <div>
            <label className="block text-sm font-medium mb-2">Work Order *</label>
            <select
              value={form.workOrderId}
              onChange={(e) => {
                const wo = workOrders.find(w => w.id === e.target.value);
                // Check if the WO's assigned technician is eligible (not blacklisted, trade matches)
                let techId = "";
                if (wo?.technicianId) {
                  const assignedTech = technicians.find(t => t.id === wo.technicianId);
                  if (assignedTech && !assignedTech.isBlacklisted && 
                      assignedTech.trade?.toLowerCase() === wo.trade?.toLowerCase()) {
                    techId = wo.technicianId;
                  }
                }
                setForm({
                  ...form,
                  workOrderId: e.target.value,
                  technicianId: techId,
                  helperId: "", // Reset helper when WO changes
                });
              }}
              className="input"
              required
              disabled={!!editingProposal}
            >
              <option value="">Select work order</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.woNumber} - {wo.client} ({wo.trade})</option>
              ))}
            </select>
            {selectedWorkOrder && (
              <p className="mt-1 text-xs text-slate-500">
                Trade: <strong className="text-brand-600 dark:text-brand-400">{selectedWorkOrder.trade}</strong>
                {" • "}Only technicians with matching trade will be shown
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Technician</label>
              <select
                value={form.technicianId}
                onChange={(e) => {
                  setForm({ ...form, technicianId: e.target.value, helperId: "" });
                }}
                className="input"
                disabled={!form.workOrderId}
              >
                <option value="">Select technician</option>
                {eligibleTechnicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name} ({tech.trade})</option>
                ))}
              </select>
              {form.workOrderId && eligibleTechnicians.length === 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  <span>No available technicians for trade: <strong>{selectedWorkOrder?.trade}</strong></span>
                </div>
              )}
              {!form.workOrderId && (
                <p className="mt-1 text-xs text-slate-500">Select a work order first to see matching technicians</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Helper</label>
              <select
                value={form.helperId}
                onChange={(e) => setForm({ ...form, helperId: e.target.value })}
                className="input"
                disabled={!form.workOrderId || !form.technicianId}
              >
                <option value="">No helper</option>
                {eligibleHelpers.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name} ({tech.trade})</option>
                ))}
              </select>
              {form.technicianId && eligibleHelpers.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">No other technicians available for this trade</p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Trip Fee ($)</label>
              <input
                type="number"
                value={form.tripFee}
                onChange={(e) => setForm({ ...form, tripFee: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Assessment Fee ($)</label>
              <input
                type="number"
                value={form.assessmentFee}
                onChange={(e) => setForm({ ...form, assessmentFee: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tech Hours</label>
              <input
                type="number"
                value={form.techHours}
                onChange={(e) => setForm({ ...form, techHours: e.target.value })}
                className="input"
                placeholder="0"
                step="0.5"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tech Rate ($/hr)</label>
              <input
                type="number"
                value={form.techRate}
                onChange={(e) => setForm({ ...form, techRate: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Helper Hours</label>
              <input
                type="number"
                value={form.helperHours}
                onChange={(e) => setForm({ ...form, helperHours: e.target.value })}
                className="input"
                placeholder="0"
                step="0.5"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Helper Rate ($/hr)</label>
              <input
                type="number"
                value={form.helperRate}
                onChange={(e) => setForm({ ...form, helperRate: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Multiplier</label>
              <input
                type="number"
                value={form.costMultiplier}
                onChange={(e) => setForm({ ...form, costMultiplier: e.target.value })}
                className="input"
                placeholder="1.35"
                step="0.01"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="input"
                placeholder="0"
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
              placeholder="Proposal notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : editingProposal ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
