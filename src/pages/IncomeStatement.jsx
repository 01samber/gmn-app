import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, 
  Calendar, ArrowUpRight, ArrowDownRight, Sparkles, Target,
  Wallet, CreditCard, Receipt, ChevronDown, Download, Filter,
  Users, Clock, CheckCircle, AlertTriangle, Zap, Award,
  Activity, Percent, Hash, Timer
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { workOrdersApi, costsApi, authApi } from "../api";

// Animated counter hook
function useAnimatedNumber(target, duration = 1000) {
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const start = 0;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Math.floor(start + (target - start) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [target, duration]);
  
  return current;
}

// Progress ring component
function ProgressRing({ progress, size = 80, strokeWidth = 8, color = "#0ea5e9" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-200 dark:text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// Sparkline mini chart
function Sparkline({ data, color = "#0ea5e9", height = 40 }) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// KPI Card component
function KPICard({ icon: Icon, title, value, subtitle, trend, trendLabel, target, actual, color = "brand", sparkData }) {
  const colors = {
    brand: { bg: "from-brand-500/10 to-cyan-500/10", icon: "text-brand-500", border: "border-brand-200 dark:border-brand-800" },
    emerald: { bg: "from-emerald-500/10 to-green-500/10", icon: "text-emerald-500", border: "border-emerald-200 dark:border-emerald-800" },
    violet: { bg: "from-violet-500/10 to-purple-500/10", icon: "text-violet-500", border: "border-violet-200 dark:border-violet-800" },
    amber: { bg: "from-amber-500/10 to-orange-500/10", icon: "text-amber-500", border: "border-amber-200 dark:border-amber-800" },
    rose: { bg: "from-rose-500/10 to-red-500/10", icon: "text-rose-500", border: "border-rose-200 dark:border-rose-800" },
  };

  const colorHex = {
    brand: "#0ea5e9",
    emerald: "#10b981",
    violet: "#8b5cf6",
    amber: "#f59e0b",
    rose: "#ef4444",
  };

  return (
    <div className={`card p-5 bg-gradient-to-br ${colors[color].bg} ${colors[color].border} relative overflow-hidden group hover:shadow-xl transition-all duration-300`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center ${colors[color].icon}`}>
            <Icon size={24} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              trend >= 0 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            }`}>
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>

        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-bold mb-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-500">{subtitle}</p>}

        {sparkData && sparkData.length > 0 && (
          <div className="mt-3 -mx-1">
            <Sparkline data={sparkData} color={colorHex[color]} height={30} />
          </div>
        )}

        {target !== undefined && actual !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Progress to target</span>
              <span className="font-semibold">{Math.min((actual / target) * 100, 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 rounded-full transition-all duration-1000`}
                style={{ width: `${Math.min((actual / target) * 100, 100)}%`, background: colorHex[color] }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Large stat with animated number
function AnimatedStat({ value, prefix = "", suffix = "", label, sublabel, color = "brand" }) {
  const animatedValue = useAnimatedNumber(value, 1500);
  
  const colors = {
    brand: "text-brand-600 dark:text-brand-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="text-center">
      <p className={`text-4xl font-black ${colors[color]}`}>
        {prefix}{animatedValue.toLocaleString()}{suffix}
      </p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">{label}</p>
      {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
    </div>
  );
}

// Donut chart with legend
function EnhancedDonutChart({ segments, size = 160, title }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let currentAngle = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-lg">
          {segments.map((segment, i) => {
            if (segment.value === 0) return null;
            const percentage = (segment.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            
            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
            const largeArc = angle > 180 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={segment.color}
                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            );
          })}
          <circle cx="50" cy="50" r="28" className="fill-white dark:fill-slate-900" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold">${(total / 1000).toFixed(1)}k</p>
            <p className="text-[10px] text-slate-500">{title}</p>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 space-y-2 w-full max-w-xs">
        {segments.filter(s => s.value > 0).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm group hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 py-1 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">${item.value.toLocaleString()}</span>
              <span className="text-xs text-slate-400 ml-1">({((item.value / total) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Monthly comparison bar chart
function MonthlyComparisonChart({ data }) {
  const maxValue = Math.max(...data.flatMap(d => [d.revenue, d.cost]), 1);
  
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">{item.month}</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-brand-600 dark:text-brand-400">Revenue: ${item.revenue.toLocaleString()}</span>
              <span className="text-rose-600 dark:text-rose-400">Cost: ${item.cost.toLocaleString()}</span>
            </div>
          </div>
          <div className="relative h-6 flex gap-0.5">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-l-lg transition-all duration-700 group-hover:from-brand-600 group-hover:to-cyan-500"
              style={{ width: `${(item.revenue / maxValue) * 100}%` }}
            />
            <div 
              className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-r-lg transition-all duration-700 group-hover:from-rose-500 group-hover:to-rose-600"
              style={{ width: `${(item.cost / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return options;
}

export default function IncomeStatement() {
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

  // Calculate comprehensive income data
  const incomeData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Filter work orders for selected month (PAID status)
    const monthWOs = workOrders.filter(wo => {
      const woDate = new Date(wo.updatedAt || wo.completedAt || wo.createdAt);
      return woDate >= startDate && woDate <= endDate && wo.status === 'paid';
    });

    // Calculate revenue
    const totalRevenue = monthWOs.reduce((sum, wo) => sum + (wo.nte || 0), 0);

    // Calculate costs
    const monthCosts = costs.filter(c => {
      const costDate = new Date(c.updatedAt || c.createdAt);
      return costDate >= startDate && costDate <= endDate && c.status === 'paid';
    });
    const totalCosts = monthCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

    // Gross profit & margin
    const grossProfit = totalRevenue - totalCosts;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Break down by trade
    const tradeBreakdown = {};
    monthWOs.forEach(wo => {
      const trade = wo.trade || 'Other';
      if (!tradeBreakdown[trade]) {
        tradeBreakdown[trade] = { revenue: 0, cost: 0, count: 0, avgTicket: 0 };
      }
      tradeBreakdown[trade].revenue += wo.nte || 0;
      tradeBreakdown[trade].count += 1;
    });

    // Add costs to trade breakdown
    monthCosts.forEach(c => {
      const wo = workOrders.find(w => w.id === c.workOrderId);
      if (wo) {
        const trade = wo.trade || 'Other';
        if (tradeBreakdown[trade]) {
          tradeBreakdown[trade].cost += c.amount || 0;
        }
      }
    });

    // Calculate avg ticket per trade
    Object.keys(tradeBreakdown).forEach(trade => {
      const data = tradeBreakdown[trade];
      data.avgTicket = data.count > 0 ? data.revenue / data.count : 0;
      data.profit = data.revenue - data.cost;
      data.margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    const revenueSparkData = [];
    const profitSparkData = [];
    
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(year, month - 1 - i, 1);
      const trendEnd = new Date(trendDate.getFullYear(), trendDate.getMonth() + 1, 0, 23, 59, 59);
      
      const trendWOs = workOrders.filter(wo => {
        const woDate = new Date(wo.updatedAt || wo.completedAt || wo.createdAt);
        return woDate >= trendDate && woDate <= trendEnd && wo.status === 'paid';
      });
      
      const trendCosts = costs.filter(c => {
        const costDate = new Date(c.updatedAt || c.createdAt);
        return costDate >= trendDate && costDate <= trendEnd && c.status === 'paid';
      });
      
      const trendRevenue = trendWOs.reduce((sum, wo) => sum + (wo.nte || 0), 0);
      const trendCost = trendCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
      
      monthlyTrend.push({
        month: trendDate.toLocaleDateString('en-US', { month: 'short' }),
        fullMonth: trendDate.toLocaleDateString('en-US', { month: 'long' }),
        revenue: trendRevenue,
        cost: trendCost,
        profit: trendRevenue - trendCost,
        count: trendWOs.length,
      });
      
      revenueSparkData.push(trendRevenue);
      profitSparkData.push(trendRevenue - trendCost);
    }

    // Previous month comparison
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59);
    const prevMonthWOs = workOrders.filter(wo => {
      const woDate = new Date(wo.updatedAt || wo.completedAt || wo.createdAt);
      return woDate >= prevStartDate && woDate <= prevEndDate && wo.status === 'paid';
    });
    const prevRevenue = prevMonthWOs.reduce((sum, wo) => sum + (wo.nte || 0), 0);
    const prevCosts = costs.filter(c => {
      const costDate = new Date(c.updatedAt || c.createdAt);
      return costDate >= prevStartDate && costDate <= prevEndDate && c.status === 'paid';
    });
    const prevTotalCost = prevCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
    const prevProfit = prevRevenue - prevTotalCost;

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitChange = prevProfit > 0 ? ((grossProfit - prevProfit) / prevProfit) * 100 : 0;
    const woCountChange = prevMonthWOs.length > 0 ? ((monthWOs.length - prevMonthWOs.length) / prevMonthWOs.length) * 100 : 0;

    // Donut chart colors
    const tradeColors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
    const donutData = Object.entries(tradeBreakdown).map(([trade, data], i) => ({
      label: trade,
      value: data.revenue,
      color: tradeColors[i % tradeColors.length],
    }));

    // KPI calculations
    const avgTicketSize = monthWOs.length > 0 ? totalRevenue / monthWOs.length : 0;
    const avgProfitPerJob = monthWOs.length > 0 ? grossProfit / monthWOs.length : 0;
    const costPerJob = monthWOs.length > 0 ? totalCosts / monthWOs.length : 0;
    const revenuePerDay = totalRevenue / endDate.getDate();
    
    // Targets (example targets - could be made configurable)
    const monthlyRevenueTarget = 30000;
    const monthlyProfitTarget = 15000;
    const monthlyWOTarget = 40;
    const targetMargin = 50;

    return {
      totalRevenue,
      totalCosts,
      grossProfit,
      grossMargin,
      workOrderCount: monthWOs.length,
      avgTicketSize,
      avgProfitPerJob,
      costPerJob,
      revenuePerDay,
      tradeBreakdown,
      monthlyTrend,
      revenueChange,
      profitChange,
      woCountChange,
      donutData,
      revenueSparkData,
      profitSparkData,
      targets: {
        revenue: monthlyRevenueTarget,
        profit: monthlyProfitTarget,
        workOrders: monthlyWOTarget,
        margin: targetMargin,
      },
      prevMonth: {
        revenue: prevRevenue,
        profit: prevProfit,
        count: prevMonthWOs.length,
      },
    };
  }, [workOrders, costs, selectedMonth]);

  if (loading) return <PageLoader message="Generating income statement..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Income Statement"
        icon={BarChart3}
        subtitle={`Financial performance overview • ${user?.name || 'User'} • ${user?.role || 'dispatcher'}`}
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
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
        
        <div className="flex gap-2">
          <button className="btn-ghost flex items-center gap-2 text-sm">
            <Filter size={16} />
            Filter
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-brand-500 via-brand-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative grid gap-6 md:grid-cols-4">
          <AnimatedStat
            value={incomeData.totalRevenue}
            prefix="$"
            label="Total Revenue"
            sublabel={`${incomeData.revenueChange >= 0 ? '+' : ''}${incomeData.revenueChange.toFixed(1)}% vs last month`}
            color="brand"
          />
          <AnimatedStat
            value={incomeData.grossProfit}
            prefix="$"
            label="Gross Profit"
            sublabel={`${incomeData.grossMargin.toFixed(1)}% margin`}
            color="emerald"
          />
          <AnimatedStat
            value={incomeData.workOrderCount}
            label="Work Orders"
            sublabel={`$${incomeData.avgTicketSize.toFixed(0)} avg ticket`}
            color="violet"
          />
          <AnimatedStat
            value={Math.round(incomeData.grossMargin)}
            suffix="%"
            label="Profit Margin"
            sublabel={`Target: ${incomeData.targets.margin}%`}
            color="amber"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          icon={DollarSign}
          title="Revenue"
          value={`$${incomeData.totalRevenue.toLocaleString()}`}
          subtitle={`Target: $${incomeData.targets.revenue.toLocaleString()}`}
          trend={incomeData.revenueChange}
          target={incomeData.targets.revenue}
          actual={incomeData.totalRevenue}
          sparkData={incomeData.revenueSparkData}
          color="brand"
        />
        <KPICard
          icon={Wallet}
          title="Gross Profit"
          value={`$${incomeData.grossProfit.toLocaleString()}`}
          subtitle={`Target: $${incomeData.targets.profit.toLocaleString()}`}
          trend={incomeData.profitChange}
          target={incomeData.targets.profit}
          actual={incomeData.grossProfit}
          sparkData={incomeData.profitSparkData}
          color="emerald"
        />
        <KPICard
          icon={Receipt}
          title="Work Orders"
          value={incomeData.workOrderCount.toString()}
          subtitle={`Target: ${incomeData.targets.workOrders}`}
          trend={incomeData.woCountChange}
          target={incomeData.targets.workOrders}
          actual={incomeData.workOrderCount}
          color="violet"
        />
        <KPICard
          icon={CreditCard}
          title="Total Costs"
          value={`$${incomeData.totalCosts.toLocaleString()}`}
          subtitle={`${((incomeData.totalCosts / incomeData.totalRevenue) * 100 || 0).toFixed(1)}% of revenue`}
          color="rose"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Activity size={18} className="text-brand-500" />
                Revenue vs Cost Trend
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">6-month comparison</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" />
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-400 to-rose-500" />
                <span>Cost</span>
              </div>
            </div>
          </div>
          <MonthlyComparisonChart data={incomeData.monthlyTrend} />
        </div>

        {/* Revenue by Trade */}
        <div className="card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-violet-500" />
            Revenue by Trade
          </h3>
          <EnhancedDonutChart segments={incomeData.donutData} title="Total" />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* KPI Gauges */}
        <div className="card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-6">
            <Target size={18} className="text-amber-500" />
            Goal Progress
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <ProgressRing 
                progress={Math.min((incomeData.totalRevenue / incomeData.targets.revenue) * 100, 100)} 
                color="#0ea5e9"
              />
              <p className="text-sm font-medium mt-2">Revenue</p>
              <p className="text-xs text-slate-500">${(incomeData.totalRevenue / 1000).toFixed(1)}k / ${(incomeData.targets.revenue / 1000).toFixed(0)}k</p>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing 
                progress={Math.min((incomeData.workOrderCount / incomeData.targets.workOrders) * 100, 100)} 
                color="#8b5cf6"
              />
              <p className="text-sm font-medium mt-2">Work Orders</p>
              <p className="text-xs text-slate-500">{incomeData.workOrderCount} / {incomeData.targets.workOrders}</p>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing 
                progress={Math.min(incomeData.grossMargin, 100)} 
                color="#10b981"
              />
              <p className="text-sm font-medium mt-2">Margin</p>
              <p className="text-xs text-slate-500">{incomeData.grossMargin.toFixed(1)}% / {incomeData.targets.margin}%</p>
            </div>
          </div>
        </div>

        {/* Trade Performance Table */}
        <div className="card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Award size={18} className="text-emerald-500" />
            Performance by Trade
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 font-semibold">Trade</th>
                  <th className="text-right py-2 font-semibold">Jobs</th>
                  <th className="text-right py-2 font-semibold">Revenue</th>
                  <th className="text-right py-2 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(incomeData.tradeBreakdown).map(([trade, data]) => (
                  <tr key={trade} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 font-medium">{trade}</td>
                    <td className="py-2 text-right">{data.count}</td>
                    <td className="py-2 text-right">${data.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${data.margin >= 50 ? 'text-emerald-600 dark:text-emerald-400' : data.margin >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {data.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="card p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-6">
          <Sparkles size={18} className="text-brand-500" />
          Financial Summary
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Income Statement */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Income Statement</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Gross Revenue</span>
                <span className="font-semibold">${incomeData.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Cost of Services</span>
                <span className="font-semibold text-rose-600">-${incomeData.totalCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 -mx-3 mt-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">Gross Profit</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">${incomeData.grossProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Key Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Gross Margin</span>
                <span className="font-semibold">{incomeData.grossMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Avg Ticket Size</span>
                <span className="font-semibold">${incomeData.avgTicketSize.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Profit per Job</span>
                <span className="font-semibold">${incomeData.avgProfitPerJob.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Revenue per Day</span>
                <span className="font-semibold">${incomeData.revenuePerDay.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Month Comparison */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">vs Last Month</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Revenue Change</span>
                <span className={`font-semibold ${incomeData.revenueChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {incomeData.revenueChange >= 0 ? '+' : ''}{incomeData.revenueChange.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>Profit Change</span>
                <span className={`font-semibold ${incomeData.profitChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {incomeData.profitChange >= 0 ? '+' : ''}{incomeData.profitChange.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span>WO Count Change</span>
                <span className={`font-semibold ${incomeData.woCountChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {incomeData.woCountChange >= 0 ? '+' : ''}{incomeData.woCountChange.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span>Prev Month Revenue</span>
                <span className="font-semibold">${incomeData.prevMonth.revenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
