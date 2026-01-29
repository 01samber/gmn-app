import { useEffect, useState, useCallback, useMemo } from "react";
import { Calculator, DollarSign, TrendingUp, Award, AlertTriangle, CheckCircle, Info, ChevronDown, Sparkles } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { workOrdersApi, costsApi, authApi } from "../api";

// Commission rate tiers based on qualified work order count
const COMMISSION_TIERS = [
  { min: 0, max: 24, rate: 0 },      // Below threshold - no commission
  { min: 25, max: 35, rate: 3 },
  { min: 36, max: 45, rate: 4 },
  { min: 46, max: 55, rate: 5 },
  { min: 56, max: 65, rate: 5.5 },
  { min: 66, max: 75, rate: 6 },
  { min: 76, max: 85, rate: 6.5 },
  { min: 86, max: 95, rate: 7 },
  { min: 96, max: 105, rate: 7.5 },
  { min: 106, max: Infinity, rate: 8 },
];

function getCommissionRate(qualifiedCount) {
  for (const tier of COMMISSION_TIERS) {
    if (qualifiedCount >= tier.min && qualifiedCount <= tier.max) {
      return tier.rate;
    }
  }
  return 0;
}

// Calculate profit ratio: (NTE - Cost) / Cost
function calculateProfitRatio(nte, cost) {
  if (!cost || cost === 0) return Infinity; // No cost = infinite profit
  return (nte - cost) / cost;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
}

export default function Commission() {
  const [workOrders, setWorkOrders] = useState([]);
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const user = authApi.getUser();
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [woRes, costsRes] = await Promise.all([
        workOrdersApi.getAll({ limit: 1000 }),
        costsApi.getAll({ limit: 1000 }),
      ]);
      setWorkOrders(woRes.data || []);
      setCosts(costsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and calculate commission data based on rules
  const commissionData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Rule 1: Only PAID jobs within the same month
    // Filter work orders that are PAID and updated within the selected month
    const eligibleWOs = workOrders.filter(wo => {
      const status = wo.status?.toLowerCase();
      // Only PAID jobs count for commission (not invoiced)
      if (status !== 'paid') return false;
      
      // Check if completed/updated within the month
      const woDate = new Date(wo.updatedAt || wo.completedAt || wo.createdAt);
      return woDate >= startDate && woDate <= endDate;
    });

    // Calculate costs and profit for each work order
    const woWithCalculations = eligibleWOs.map(wo => {
      // Get all paid costs for this work order
      const woCosts = costs.filter(c => c.workOrderId === wo.id && c.status === 'paid');
      const totalCost = woCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
      const nte = wo.nte || 0;
      
      // Rule 2: Commission = (NTE - Cost) / Cost
      const profitRatio = calculateProfitRatio(nte, totalCost);
      
      // Check special conditions
      const notesLower = (wo.notes || '').toLowerCase();
      const isIncurred = notesLower.includes('incurred');
      const isLowNte = nte <= 225;
      const isReassigned = notesLower.includes('reassign');
      
      // Determine qualification and count value
      let qualificationStatus = 'excluded';
      let countValue = 0;
      let exclusionReason = '';

      // Rule 4: Jobs closed as "Incurred" or NTE <= 225 count as 0.5
      if (isIncurred) {
        qualificationStatus = 'partial';
        countValue = 0.5;
        exclusionReason = 'Incurred job (counts as 0.5)';
      } else if (isLowNte) {
        qualificationStatus = 'partial';
        countValue = 0.5;
        exclusionReason = `NTE ≤ $225 (counts as 0.5)`;
      } 
      // Rule 3: Jobs below 75% profit are excluded
      else if (profitRatio < 0.75) {
        qualificationStatus = 'excluded';
        countValue = 0;
        exclusionReason = `Profit ratio ${(profitRatio * 100).toFixed(1)}% < 75%`;
      } 
      // Rule 5: Reassigned jobs count as x2
      else if (isReassigned) {
        qualificationStatus = 'qualified';
        countValue = 2;
        exclusionReason = 'Reassigned (counts as ×2)';
      }
      // Regular qualified job
      else {
        qualificationStatus = 'qualified';
        countValue = 1;
      }

      return {
        ...wo,
        totalCost,
        profitRatio,
        qualificationStatus,
        countValue,
        exclusionReason,
        isIncurred,
        isLowNte,
        isReassigned,
      };
    });

    // Calculate totals
    const qualifiedWOs = woWithCalculations.filter(wo => wo.qualificationStatus !== 'excluded');
    const excludedWOs = woWithCalculations.filter(wo => wo.qualificationStatus === 'excluded');
    const totalCount = qualifiedWOs.reduce((sum, wo) => sum + wo.countValue, 0);
    
    // Rule 6: Get commission rate based on qualified count
    const commissionRate = getCommissionRate(Math.floor(totalCount));
    const totalCommission = totalCount * commissionRate;

    return {
      allWOs: woWithCalculations,
      qualifiedWOs,
      excludedWOs,
      totalCount,
      commissionRate,
      totalCommission,
      stats: {
        total: woWithCalculations.length,
        qualified: woWithCalculations.filter(wo => wo.qualificationStatus === 'qualified' && wo.countValue === 1).length,
        partial: woWithCalculations.filter(wo => wo.qualificationStatus === 'partial').length,
        reassigned: woWithCalculations.filter(wo => wo.isReassigned && wo.qualificationStatus === 'qualified').length,
        excluded: excludedWOs.length,
      },
    };
  }, [workOrders, costs, selectedMonth]);

  if (loading) return <PageLoader message="Calculating commission..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Commission Calculator"
        icon={Calculator}
        subtitle={`Calculate your monthly commission based on completed work orders • ${user?.name || 'Dispatcher'}`}
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      {/* Month Selector */}
      <div className="mb-6">
        <div className="relative inline-block">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input appearance-none pr-10 min-w-[220px] font-medium"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Commission Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card p-5 bg-gradient-to-br from-brand-50 to-cyan-50 dark:from-brand-900/20 dark:to-cyan-900/20 border-brand-200 dark:border-brand-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-200/20 dark:bg-brand-700/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <CheckCircle className="text-brand-600 dark:text-brand-400" size={20} />
              </div>
              <span className="text-sm font-medium text-brand-700 dark:text-brand-300">Qualified Count</span>
            </div>
            <p className="text-3xl font-bold text-brand-800 dark:text-brand-200">{commissionData.totalCount.toFixed(1)}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
              {commissionData.stats.qualified} regular + {commissionData.stats.partial} partial + {commissionData.stats.reassigned * 2} (reassigned)
            </p>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-200/20 dark:bg-violet-700/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <TrendingUp className="text-violet-600 dark:text-violet-400" size={20} />
              </div>
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Rate per WO</span>
            </div>
            <p className="text-3xl font-bold text-violet-800 dark:text-violet-200">${commissionData.commissionRate.toFixed(2)}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
              {Math.floor(commissionData.totalCount) < 25 ? 'Below 25 WO minimum' : `${Math.floor(commissionData.totalCount)} WOs qualified`}
            </p>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 dark:bg-emerald-700/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Commission</span>
            </div>
            <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">${commissionData.totalCommission.toFixed(2)}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {commissionData.totalCount.toFixed(1)} × ${commissionData.commissionRate.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 dark:bg-amber-700/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Excluded</span>
            </div>
            <p className="text-3xl font-bold text-amber-800 dark:text-amber-200">{commissionData.stats.excluded}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Below 75% profit ratio
            </p>
          </div>
        </div>
      </div>

      {/* Commission Rules */}
      <div className="card p-6 mb-8">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Info size={20} className="text-brand-500" />
          Commission Rules
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[24px]">1.</span>
              <span>Only <strong className="text-emerald-600 dark:text-emerald-400">PAID</strong> jobs within the same month are counted.</span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[24px]">2.</span>
              <span>Formula: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-xs">(NTE - Cost) ÷ Cost</code></span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[24px]">3.</span>
              <span>Jobs below <strong className="text-rose-600 dark:text-rose-400">75% profit</strong> are excluded (unless Team Lead exception).</span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[24px]">4.</span>
              <span><strong className="text-amber-600 dark:text-amber-400">Incurred</strong> or <strong className="text-amber-600 dark:text-amber-400">NTE ≤ $225</strong> = <strong>0.5</strong></span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[24px]">5.</span>
              <span><strong className="text-violet-600 dark:text-violet-400">Reassigned</strong> jobs = <strong>×2</strong></span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-brand-500" />
              Commission Tiers
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-sm">
              {COMMISSION_TIERS.filter(t => t.rate > 0).map((tier, i) => (
                <div 
                  key={i} 
                  className={`px-3 py-2 rounded-lg transition-all ${
                    commissionData.commissionRate === tier.rate 
                      ? 'bg-gradient-to-r from-brand-100 to-cyan-100 dark:from-brand-900/40 dark:to-cyan-900/40 text-brand-700 dark:text-brand-300 font-semibold ring-2 ring-brand-300 dark:ring-brand-700' 
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`} WOs: <strong>${tier.rate}</strong>/WO
                </div>
              ))}
            </div>
            {commissionData.totalCount < 25 && (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                ⚠️ Minimum 25 qualified WOs required to earn commission
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
          <h3 className="font-semibold">Work Orders Detail</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {commissionData.allWOs.length} PAID work orders for {monthOptions.find(m => m.value === selectedMonth)?.label}
          </p>
        </div>
        
        {commissionData.allWOs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Calculator size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No PAID work orders found for this month.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Complete and mark jobs as PAID to see commission.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">WO #</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-right font-semibold">NTE</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Profit %</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {commissionData.allWOs.map((wo) => (
                  <tr 
                    key={wo.id} 
                    className={`transition-colors ${
                      wo.qualificationStatus === 'excluded' 
                        ? 'bg-rose-50/50 dark:bg-rose-900/10 opacity-60' 
                        : wo.qualificationStatus === 'partial'
                        ? 'bg-amber-50/50 dark:bg-amber-900/10'
                        : wo.isReassigned
                        ? 'bg-violet-50/50 dark:bg-violet-900/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">{wo.woNumber}</td>
                    <td className="px-4 py-3 font-medium">{wo.client}</td>
                    <td className="px-4 py-3 text-right font-mono">${wo.nte?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-right font-mono">${wo.totalCost?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${
                        wo.profitRatio >= 0.75 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {wo.profitRatio === Infinity ? '∞' : `${(wo.profitRatio * 100).toFixed(0)}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {wo.qualificationStatus === 'qualified' && !wo.isReassigned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
                          <CheckCircle size={12} /> Qualified
                        </span>
                      )}
                      {wo.qualificationStatus === 'qualified' && wo.isReassigned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs font-semibold">
                          <Award size={12} /> Reassigned ×2
                        </span>
                      )}
                      {wo.qualificationStatus === 'partial' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold" title={wo.exclusionReason}>
                          <Award size={12} /> {wo.isIncurred ? 'Incurred' : 'Low NTE'}
                        </span>
                      )}
                      {wo.qualificationStatus === 'excluded' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-xs font-semibold" title={wo.exclusionReason}>
                          <AlertTriangle size={12} /> Excluded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-lg ${
                        wo.countValue === 0 
                          ? 'text-slate-300 dark:text-slate-600' 
                          : wo.countValue === 2 
                          ? 'text-violet-600 dark:text-violet-400'
                          : wo.countValue === 0.5
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {wo.countValue > 0 ? wo.countValue : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800 font-semibold">
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-right text-base">Total Qualified Count:</td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                      {commissionData.totalCount.toFixed(1)}
                    </span>
                  </td>
                </tr>
                <tr className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
                  <td colSpan={6} className="px-4 py-4 text-right text-base">
                    Commission ({commissionData.totalCount.toFixed(1)} × ${commissionData.commissionRate.toFixed(2)}):
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      ${commissionData.totalCommission.toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
