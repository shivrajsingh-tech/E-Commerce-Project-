import { useEffect, useState, useMemo } from "react";
import {
  Users,
  ShoppingBag,
  Store,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  Truck,
  IndianRupee,
  Layers,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  MapPin,
  Phone,
  UserCheck,
  ArrowUpRight,
  Boxes,
  Activity,
  AlertCircle,
  XCircle,
  FolderTree,
  Tags,
  BadgePercent,
  Check,
  Zap,
  Navigation,
  Compass,
  Calendar,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#06B6D4", "#EC4899", "#8B5CF6"];

const ModernTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 shadow-2xl text-white text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
          {label || payload[0].name}
        </span>
        <span className="text-sm font-black text-indigo-400 mt-0.5 block">
          {prefix}{payload[0].value?.toLocaleString("en-IN")}{suffix}
        </span>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const getDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dashboard");
      if (response.data?.success) {
        setDashboard(response.data.data);
      }
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboard();
  }, []);

  const rawRole = (
    typeof user?.role === "string" ? user.role : user?.role?.name || "staff"
  )
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const displayRole = rawRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={18} className="text-indigo-600 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-slate-500 font-bold text-xs tracking-widest uppercase">
          Loading Realtime Workspace...
        </p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-[32px] p-8 text-center max-w-sm shadow-xl shadow-slate-200/50">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Dashboard Unavailable</h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">Could not fetch your role workspace metrics.</p>
          <button
            onClick={getDashboard}
            className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-indigo-600/20"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.firstName || "Member"} 👋
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 flex flex-wrap items-center gap-2 font-medium">
            <span>Operating Dashboard:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider border border-indigo-100/80">
              <ShieldCheck size={13} /> {displayRole}
            </span>
            {dashboard.store && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                <Store size={12} /> {dashboard.store.name} ({dashboard.store.code})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={getDashboard}
          className="relative z-10 self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100/80 hover:bg-slate-200 rounded-2xl transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} /> Live Sync
        </button>
      </div>

      {/* DYNAMIC VIEWS */}
      {(rawRole === "super_admin" || rawRole === "admin") && <SuperAdminDashboardView d={dashboard} />}
      {rawRole === "delivery_partner" && <DeliveryPartnerDashboardView d={dashboard.deliveryPartnerStats || dashboard} />}
      {rawRole === "store_manager" && <StoreManagerDashboardView d={dashboard} />}
      {rawRole === "inventory_manager" && <InventoryManagerDashboardView d={dashboard} />}
      {rawRole === "delivery_manager" && <DeliveryManagerDashboardView d={dashboard} />}
    </div>
  );
};

// ==========================================
// 1. SUPER ADMIN / ADMIN VIEW
// ==========================================
const SuperAdminDashboardView = ({ d }) => {
  const usersStatusPie = useMemo(() => [
    { name: "Active", value: d.activeUsers || 0, fill: "#10B981" },
    { name: "Inactive", value: d.inactiveUsers || 0, fill: "#EF4444" },
    { name: "Pending", value: d.pendingUsers || 0, fill: "#F59E0B" },
  ], [d]);

  const orderPipeline = useMemo(() => [
    { stage: "Placed", count: d.placedOrders || 0, fill: "#F59E0B" },
    { stage: "Confirmed", count: d.confirmedOrders || 0, fill: "#8B5CF6" },
    { stage: "Packing", count: d.packingOrders || 0, fill: "#EC4899" },
    { stage: "Assigned", count: d.assignedOrders || 0, fill: "#6366F1" },
    { stage: "Out For Delivery", count: d.outForDelivery || 0, fill: "#06B6D4" },
    { stage: "Delivered", count: d.todayDelivered || 0, fill: "#10B981" },
    { stage: "Cancelled", count: d.totalCancelled || 0, fill: "#EF4444" },
  ], [d]);

  const catalogDonut = useMemo(() => [
    { name: "Categories", value: d.totalCategories || 0 },
    { name: "SubCategories", value: d.totalSubCategories || 0 },
    { name: "Brands", value: d.totalBrands || 0 },
    { name: "Products", value: d.totalProducts || 0 },
    { name: "Variants", value: d.totalVariants || 0 },
  ], [d]);

  const totalCatalogUnits = catalogDonut.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8">
      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassKpiCard
          label="Today's Total Revenue"
          value={`₹${(d.todayRevenue || 0).toLocaleString("en-IN")}`}
          sublabel={`₹${(d.weekRevenue || 0).toLocaleString("en-IN")} (7 Days total)`}
          icon={<IndianRupee size={22} />}
          theme="indigo"
        />
        <GlassKpiCard
          label="Registered Users"
          value={d.totalUsers ?? 0}
          sublabel={`${d.activeUsers ?? 0} Active | ${d.inactiveUsers ?? 0} Inactive`}
          icon={<Users size={22} />}
          theme="emerald"
        />
        <GlassKpiCard
          label="Master Catalog"
          value={d.totalProducts ?? 0}
          sublabel={`${d.totalVariants ?? 0} Variants | ${d.totalBrands ?? 0} Brands`}
          icon={<ShoppingBag size={22} />}
          theme="amber"
        />
        <GlassKpiCard
          label="Active Stores"
          value={d.totalStores ?? 0}
          sublabel={`${d.activeStores ?? 0} Active | ${d.inactiveStores ?? 0} Inactive`}
          icon={<Store size={22} />}
          theme="cyan"
        />
      </div>

      {/* REVENUE SPLINE + USER STATUS DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Weekly Revenue Growth</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time revenue monitoring across operating days</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black uppercase">
              Financial Trend
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.weeklyTrendChart || []}>
                <defs>
                  <linearGradient id="revenueSuperGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<ModernTooltip prefix="₹" />} />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#revenueSuperGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">User Account Health</h2>
            <p className="text-xs text-slate-400 mt-0.5">Active vs Inactive vs Pending accounts</p>
          </div>
          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usersStatusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={84}
                  paddingAngle={5}
                  cornerRadius={8}
                >
                  {usersStatusPie.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ModernTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{d.totalUsers ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Users</span>
            </div>
          </div>
          <div className="flex items-center justify-around pt-3 border-t border-slate-100 text-xs font-semibold">
            {usersStatusPie.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-500">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ALL-STAGE PIPELINE + CATALOG COMPOSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">All-Stage Orders Pipeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">Live order progression from placement to final drop</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black uppercase">
              {d.todayOrdersCount ?? 0} Placed Today
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderPipeline} barCategoryGap="20%">
                <XAxis dataKey="stage" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ModernTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Master Catalog Composition</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribution across inventory masters</p>
          </div>
          <div className="space-y-3.5 my-auto">
            {catalogDonut.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <span className="text-xs font-bold text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value?.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EXTRA MONITORING STRIP */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Online Fleet</p>
            <p className="text-base font-black text-slate-900">{d.onlineRiders ?? 0} Riders</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Low Stock Alert</p>
            <p className="text-base font-black text-slate-900">{d.lowStockProducts ?? 0} SKUs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Out of Stock</p>
            <p className="text-base font-black text-slate-900">{d.outOfStockProducts ?? 0} SKUs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Store size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Stores Live</p>
            <p className="text-base font-black text-slate-900">{d.activeStores ?? 0} / {d.totalStores ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. DELIVERY PARTNER VIEW
// ==========================================
const DeliveryPartnerDashboardView = ({ d }) => {
  const activeTasks = d.activeTasks || [];

  const completionDonut = useMemo(() => [
    { name: "Delivered (All Time)", value: d.deliveredTotalAllTime || 0, fill: "#10B981" },
    { name: "Active Now", value: activeTasks.length, fill: "#6366F1" },
    { name: "Cancelled", value: d.cancelledTotal || 0, fill: "#EF4444" },
  ], [d, activeTasks]);

  return (
    <div className="space-y-8">
      {/* 4 PRIMARY KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassKpiCard
          label="Today's Earnings"
          value={`₹${(d.earningsToday || 0).toLocaleString("en-IN")}`}
          sublabel={`Total Earned: ₹${(d.totalEarningsAllTime || 0).toLocaleString("en-IN")}`}
          icon={<IndianRupee size={22} />}
          theme="emerald"
        />
        <GlassKpiCard
          label="Delivered Today"
          value={d.deliveredToday ?? 0}
          sublabel={`${d.deliveredWeek ?? 0} Delivered this week`}
          icon={<CheckCircle2 size={22} />}
          theme="indigo"
        />
        <GlassKpiCard
          label="Monthly Deliveries"
          value={d.deliveredMonth ?? 0}
          sublabel={`${d.deliveredTotalAllTime ?? 0} Total drop-offs`}
          icon={<TrendingUp size={22} />}
          theme="amber"
        />
        <GlassKpiCard
          label="Duty Status"
          value={d.isOnline ? "ONLINE" : "OFFLINE"}
          sublabel={d.isAvailable ? "Ready For Next Order" : "Currently on delivery"}
          icon={<Zap size={22} />}
          theme={d.isOnline ? "cyan" : "rose"}
        />
      </div>

      {/* WEEKLY DELIVERIES STAT + TASK DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Weekly Delivery Summary</h2>
              <p className="text-xs text-slate-400 mt-0.5">Total confirmed drop-offs across the last 7 days</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black uppercase">
              Rider Performance
            </span>
          </div>
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-widest mb-2">This Week</p>
              <p className="text-6xl font-black text-emerald-600">{d.deliveredWeek ?? 0}</p>
              <p className="text-sm text-slate-500 font-semibold mt-2">Deliveries Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Task Completion Donut</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of all tasks assigned to you</p>
          </div>
          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionDonut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  cornerRadius={8}
                >
                  {completionDonut.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ModernTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">
                {d.totalAssignedAllTime ?? 0}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">All-Time</span>
            </div>
          </div>
          <div className="flex items-center justify-around pt-3 border-t border-slate-100 text-xs font-semibold">
            {completionDonut.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-500">{item.name.split(" ")[0]}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIDER PERFORMANCE STATS */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-indigo-500">Delivered (All Time)</p>
            <p className="text-xl font-black text-slate-900">{d.deliveredTotalAllTime ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Total confirmed drop-offs</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-600">Total Earnings</p>
            <p className="text-xl font-black text-slate-900">₹{(d.totalEarningsAllTime || 0).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Lifetime payout</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-600">Deliveries This Month</p>
            <p className="text-xl font-black text-slate-900">{d.deliveredMonth ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Completed drops this month</p>
          </div>
        </div>
      </div>

      {/* ACTIVE TASKS CONTAINER */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 p-7 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Live Assigned Delivery Runs</h2>
            <p className="text-xs text-slate-400 mt-0.5">Orders assigned to you for pickup or delivery</p>
          </div>
          <span className="px-3.5 py-1 bg-amber-50 text-amber-700 text-xs font-black rounded-full border border-amber-100 uppercase">
            {activeTasks.length} In Progress
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="py-14 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2.5 opacity-80" />
            <p className="text-sm font-bold text-slate-800">All caught up!</p>
            <p className="text-xs text-slate-400 mt-0.5">Turn duty to Online to receive upcoming assignments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTasks.map((ord) => (
              <div key={ord._id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3.5 hover:border-indigo-200 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                    #{String(ord.orderId || ord._id).slice(-6).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wider">
                    {(ord.orderStatus || "assigned").replace(/_/g, " ")}
                  </span>
                </div>
                {ord.deliveryAddress && (
                  <p className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                    <MapPin size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>Drop: <strong className="text-slate-800">{ord.deliveryAddress.receiverName}</strong> - {ord.deliveryAddress.streetAddress}, {ord.deliveryAddress.city}</span>
                  </p>
                )}
                {ord.store && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Store size={14} className="text-indigo-600" /> Pickup Store: {ord.store.name}
                    </p>
                    {ord.store.phone && (
                      <p className="text-slate-500 flex items-center gap-1.5 pl-5 mt-1 font-medium">
                        <Phone size={12} /> {ord.store.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. STORE MANAGER VIEW
// ==========================================
const StoreManagerDashboardView = ({ d }) => {
  const storePipeline = useMemo(() => [
    { name: "Placed", value: d.placedOrders || 0, fill: "#F59E0B" },
    { name: "Confirmed", value: d.confirmedOrders || 0, fill: "#8B5CF6" },
    { name: "Packing", value: d.packingOrders || 0, fill: "#EC4899" },
    { name: "Assigned", value: d.assignedOrders || 0, fill: "#6366F1" },
    { name: "Out For Delivery", value: d.outForDelivery || 0, fill: "#06B6D4" },
    { name: "Delivered (Today)", value: d.todayDelivered || 0, fill: "#10B981" },
  ], [d]);

  const stockRatio = useMemo(() => [
    { name: "In Stock", value: Math.max(0, (d.totalInventoryItems || 0) - (d.lowStockProducts || 0) - (d.outOfStockProducts || 0)), fill: "#10B981" },
    { name: "Low Stock Alert", value: d.lowStockProducts || 0, fill: "#F59E0B" },
    { name: "Out of Stock", value: d.outOfStockProducts || 0, fill: "#EF4444" },
  ], [d]);

  return (
    <div className="space-y-8">
      {/* 4 PRIMARY KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassKpiCard
          label="Today's Branch Sales"
          value={`₹${(d.todayRevenue || 0).toLocaleString("en-IN")}`}
          sublabel={`₹${(d.weekRevenue || 0).toLocaleString("en-IN")} (7 Days total)`}
          icon={<IndianRupee size={22} />}
          theme="indigo"
        />
        <GlassKpiCard
          label="Store Orders"
          value={d.todayOrdersCount ?? 0}
          sublabel={`${d.todayDelivered ?? 0} Completed drops today`}
          icon={<Package size={22} />}
          theme="emerald"
        />
        <GlassKpiCard
          label="Reorder Alerts"
          value={d.lowStockProducts ?? 0}
          sublabel="Items needing replenishment"
          icon={<AlertTriangle size={22} />}
          theme="amber"
        />
        <GlassKpiCard
          label="Out Of Stock"
          value={d.outOfStockProducts ?? 0}
          sublabel="Immediate PO required"
          icon={<XCircle size={22} />}
          theme="rose"
        />
      </div>

      {/* PIPELINE BAR + INVENTORY HEALTH DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Branch Orders By Status</h2>
                <p className="text-xs text-slate-400 mt-0.5">Live store order dispatch queue</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full uppercase">
                Branch Orders
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storePipeline} barCategoryGap="20%">
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ModernTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Store Inventory Health</h2>
            <p className="text-xs text-slate-400 mt-0.5">Active stock vs low alerts vs out of stock</p>
          </div>
          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockRatio}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  cornerRadius={8}
                >
                  {stockRatio.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ModernTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{d.totalInventoryItems ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total SKUs</span>
            </div>
          </div>
          <div className="flex items-center justify-around pt-3 border-t border-slate-100 text-xs font-semibold">
            {stockRatio.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-500">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DISPATCH READINESS & FULFILLMENT EFFICIENCY */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Store Dispatch & Readiness Hub</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-600">Packing Queue</p>
              <p className="text-xl font-black text-slate-900 mt-1">{(d.placedOrders || 0) + (d.confirmedOrders || 0)} Orders</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Need packing & store seal</p>
            </div>
            <Clock size={24} className="text-amber-500" />
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-600">Awaiting Rider Handover</p>
              <p className="text-xl font-black text-slate-900 mt-1">{d.assignedOrders || 0} Orders</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Rider assigned, pickup pending</p>
            </div>
            <Package size={24} className="text-indigo-500" />
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-600">Out For Delivery</p>
              <p className="text-xl font-black text-slate-900 mt-1">{d.outForDelivery || 0} Orders</p>
              <p className="text-[11px] text-slate-500 mt-0.5">En route to customers</p>
            </div>
            <Truck size={24} className="text-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. INVENTORY MANAGER VIEW
// ==========================================
const InventoryManagerDashboardView = ({ d }) => {
  const catalogEntities = useMemo(() => [
    { category: "Categories", count: d.totalCategories || 0, fill: "#6366F1" },
    { category: "SubCategories", count: d.totalSubCategories || 0, fill: "#8B5CF6" },
    { category: "Brands", count: d.totalBrands || 0, fill: "#EC4899" },
    { category: "Products", count: d.totalProducts || 0, fill: "#06B6D4" },
    { category: "Variants", count: d.totalVariants || 0, fill: "#10B981" },
  ], [d]);

  const stockRatio = useMemo(() => [
    { name: "In Stock", value: Math.max(0, (d.totalInventoryItems || 100) - (d.lowStockProducts || 0) - (d.outOfStockProducts || 0)), fill: "#10B981" },
    { name: "Low Stock Alert", value: d.lowStockProducts || 0, fill: "#F59E0B" },
    { name: "Out of Stock", value: d.outOfStockProducts || 0, fill: "#EF4444" },
  ], [d]);

  return (
    <div className="space-y-8">
      {/* 4 PRIMARY KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassKpiCard
          label="Tracked Inventory Items"
          value={d.totalInventoryItems ?? 0}
          sublabel="Total SKU listings across stores"
          icon={<Layers size={22} />}
          theme="indigo"
        />
        <GlassKpiCard
          label="Low Stock Alerts"
          value={d.lowStockProducts ?? 0}
          sublabel="Items below reorder limit"
          icon={<AlertTriangle size={22} />}
          theme="amber"
        />
        <GlassKpiCard
          label="Out Of Stock Items"
          value={d.outOfStockProducts ?? 0}
          sublabel="Zero quantity SKUs"
          icon={<XCircle size={22} />}
          theme="rose"
        />
        <GlassKpiCard
          label="Operating Stores"
          value={d.totalStores ?? 0}
          sublabel={`${d.activeStores ?? 0} Active warehouses`}
          icon={<Store size={22} />}
          theme="emerald"
        />
      </div>

      {/* CATALOG HIERARCHY + REPLENISHMENT DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Catalog Architecture Hierarchy</h2>
              <p className="text-xs text-slate-400 mt-0.5">Database items categorized across product catalog</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full uppercase">
              Master Data
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catalogEntities} barCategoryGap="22%">
                <XAxis dataKey="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ModernTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Stock Alert Ratios</h2>
            <p className="text-xs text-slate-400 mt-0.5">Safe vs low stock vs out of stock</p>
          </div>
          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockRatio}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  cornerRadius={8}
                >
                  {stockRatio.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ModernTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{d.lowStockProducts ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Alerts</span>
            </div>
          </div>
          <div className="flex items-center justify-around pt-3 border-t border-slate-100 text-xs font-semibold">
            {stockRatio.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-500">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK REORDER ACTION MATRIX */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Procurement & Warehouse Quick Matrix</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            <p className="text-[11px] font-bold text-emerald-700 uppercase">Healthy Stock SKUs</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {Math.max(0, (d.totalInventoryItems || 0) - (d.lowStockProducts || 0) - (d.outOfStockProducts || 0))}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Quantities above safety reorder limit</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <p className="text-[11px] font-bold text-amber-700 uppercase">Reorder Recommended</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{d.lowStockProducts ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Below threshold but still in stock</p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
            <p className="text-[11px] font-bold text-rose-700 uppercase">Critical Depletion (0 Stock)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{d.outOfStockProducts ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Needs immediate vendor purchase order</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. DELIVERY MANAGER VIEW
// ==========================================
const DeliveryManagerDashboardView = ({ d }) => {
  const fleetPipeline = useMemo(() => [
    { stage: "Assigned To Rider", count: d.assignedOrders || 0, fill: "#6366F1" },
    { stage: "Out For Delivery", count: d.outForDelivery || 0, fill: "#06B6D4" },
    { stage: "Delivered Today", count: d.todayDelivered || 0, fill: "#10B981" },
    { stage: "Cancelled Trips", count: d.totalCancelled || 0, fill: "#EF4444" },
  ], [d]);

  const fleetAvailabilityRatio = useMemo(() => [
    { name: "Available (Ready)", value: d.availableRiders || 0, fill: "#10B981" },
    { name: "Busy (On Trip)", value: d.busyRiders || 0, fill: "#F59E0B" },
  ], [d]);

  return (
    <div className="space-y-8">
      {/* 4 PRIMARY KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassKpiCard
          label="Total Online Riders"
          value={d.onlineRiders ?? 0}
          sublabel={`${d.availableRiders ?? 0} Ready | ${d.busyRiders ?? 0} Busy on trips`}
          icon={<UserCheck size={22} />}
          theme="emerald"
        />
        <GlassKpiCard
          label="Orders In Transit"
          value={d.outForDelivery ?? 0}
          sublabel="Out for delivery right now"
          icon={<Truck size={22} />}
          theme="cyan"
        />
        <GlassKpiCard
          label="Awaiting Pickup"
          value={d.assignedOrders ?? 0}
          sublabel="Assigned to rider, at store"
          icon={<Package size={22} />}
          theme="indigo"
        />
        <GlassKpiCard
          label="Delivered Today"
          value={d.todayDelivered ?? 0}
          sublabel="Successfully completed drops"
          icon={<CheckCircle2 size={22} />}
          theme="amber"
        />
      </div>

      {/* DISPATCH BAR + FLEET AVAILABILITY DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Logistics Dispatch Pipeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status of assigned, in-transit and dropped orders</p>
            </div>
            <span className="px-3 py-1 bg-cyan-50 text-cyan-700 text-xs font-black rounded-full uppercase">
              Fleet Status
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleetPipeline} barCategoryGap="25%">
                <XAxis dataKey="stage" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ModernTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fleet Duty Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">Online riders available vs busy</p>
          </div>
          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetAvailabilityRatio}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  cornerRadius={8}
                >
                  {fleetAvailabilityRatio.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ModernTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{d.onlineRiders ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Online Riders</span>
            </div>
          </div>
          <div className="flex items-center justify-around pt-3 border-t border-slate-100 text-xs font-semibold">
            {fleetAvailabilityRatio.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-500">{item.name.split(" ")[0]}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DISPATCH LOAD & FLEET EFFICIENCY HUB */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-sm">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Fleet Allocation & SLA Tracking</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-700">Fleet Availability Ratio</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {d.onlineRiders > 0 ? Math.round(((d.availableRiders || 0) / d.onlineRiders) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{d.availableRiders ?? 0} Riders waiting for dispatch</p>
            </div>
            <Zap size={24} className="text-emerald-500" />
          </div>

          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-cyan-700">Active Hand-Offs</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{d.outForDelivery ?? 0} Runs</p>
              <p className="text-xs text-slate-500 mt-0.5">En route with customer OTP lock</p>
            </div>
            <Navigation size={24} className="text-cyan-500" />
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-700">Total Pickups Today</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{(d.todayDelivered || 0) + (d.outForDelivery || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Assigned to fleet from stores</p>
            </div>
            <CheckCircle2 size={24} className="text-indigo-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// REUSABLE MODERN GLASS KPI CARD
// ==========================================
const THEMES = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
};

const GlassKpiCard = ({ label, value, sublabel, icon, theme = "indigo" }) => {
  const current = THEMES[theme] || THEMES.indigo;

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition duration-200">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${current.bg} ${current.text} ${current.border} shadow-sm`}>
          {icon}
        </div>
      </div>
      <div className="mt-3.5">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        {sublabel && <p className="text-xs text-slate-400 mt-1 font-semibold">{sublabel}</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;