import { useEffect, useState, useMemo } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  Truck,
  CreditCard,
} from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const Orders = () => {
  const { user, hasPermission } = useAuth();
  const rawRole = (
    typeof user?.role === "string" ? user.role : user?.role?.name || ""
  ).toLowerCase();
  const isAdmin = ["admin", "super_admin", "superadmin"].includes(rawRole);

  const can = (perm) => isAdmin || (typeof hasPermission === "function" && hasPermission(perm));

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch real orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders");
      if (res.data?.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("orders.view")) {
      fetchOrders();
    }
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const orderId = (ord.orderId || ord._id || "").toLowerCase();
      const customerName = (
        ord.customer?.firstName
          ? `${ord.customer.firstName} ${ord.customer.lastName || ""}`
          : ord.customer?.name || ord.deliveryAddress?.receiverName || ""
      ).toLowerCase();

      const matchesSearch =
        orderId.includes(search.toLowerCase()) || customerName.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending"
          ? ["placed", "confirmed", "assigned", "out_for_delivery"].includes(ord.orderStatus)
          : ord.orderStatus === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Order Counts
  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) =>
        ["placed", "confirmed", "assigned", "out_for_delivery"].includes(o.orderStatus)
      ).length,
      delivered: orders.filter((o) => o.orderStatus === "delivered").length,
      cancelled: orders.filter((o) => o.orderStatus === "cancelled").length,
    };
  }, [orders]);

  // Handle direct status change via backend PATCH /api/orders/:id/status
  const handleStatusChange = async (orderId, newStatus) => {
    if (!can("orders.status_change")) {
      alert("Permission denied to change order status");
      return;
    }
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update order status");
    }
  };

  // Handle Delete Order
  const handleDeleteOrder = async (orderId) => {
    if (!can("orders.delete")) {
      alert("Permission denied");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete order");
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* HEADER & METRIC SUMMARY CARDS */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="text-indigo-600" size={26} /> Order Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track sales, update fulfillment stages, and monitor transactions
        </p>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Orders</div>
            <div className="text-xl font-bold text-slate-900">{counts.all}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Pending / Processing</div>
            <div className="text-xl font-bold text-amber-600">{counts.pending}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Delivered</div>
            <div className="text-xl font-bold text-emerald-600">{counts.delivered}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Cancelled</div>
            <div className="text-xl font-bold text-rose-600">{counts.cancelled}</div>
          </div>
        </div>
      </div>

      {/* SEARCH & STATUS FILTER ROW */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by Order ID or Customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={16} className="text-slate-400 shrink-0 ml-1" />
          <span className="text-xs font-medium text-slate-500">Filter:</span>
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "delivered", label: "Delivered" },
            { id: "cancelled", label: "Cancelled" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <AlertCircle size={36} className="mx-auto mb-2 text-slate-300" />
            No orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Order ID</th>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Amount & Items</th>
                  <th className="py-3.5 px-5">Order Stage</th>
                  <th className="py-3.5 px-5">Payment</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.map((ord) => {
                  const customerName =
                    ord.customer?.firstName
                      ? `${ord.customer.firstName} ${ord.customer.lastName || ""}`
                      : ord.customer?.name || ord.deliveryAddress?.receiverName || "Guest Customer";

                  const statusColors = {
                    placed: "bg-blue-50 text-blue-700 border-blue-200",
                    confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    assigned: "bg-purple-50 text-purple-700 border-purple-200",
                    out_for_delivery: "bg-amber-50 text-amber-700 border-amber-200",
                    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
                  };

                  const colorClass =
                    statusColors[ord.orderStatus] ||
                    "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={15} className="text-indigo-600" />
                          <span>{ord.orderId || ord._id.slice(-8)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{customerName}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {ord.customer?.phone || ord.deliveryAddress?.receiverPhone}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        ₹{ord.totalAmount?.toLocaleString() || 0}
                        <span className="text-xs text-slate-400 font-normal ml-1">
                          ({ord.items?.length || 1} items)
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        {can("orders.status_change") ? (
                          <select
                            value={ord.orderStatus}
                            onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer capitalize outline-none transition ${colorClass}`}
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="assigned">Assigned</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${colorClass}`}
                          >
                            {ord.orderStatus?.replace(/_/g, " ")}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="text-xs space-y-0.5">
                          <div className="font-semibold text-slate-700 flex items-center gap-1">
                            <CreditCard size={12} className="text-slate-400" />
                            {ord.paymentMethod}
                          </div>
                          <div
                            className={`text-[10px] uppercase font-bold ${
                              ord.paymentStatus === "completed"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {ord.paymentStatus}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{ord.createdAt ? ord.createdAt.slice(0, 10) : "N/A"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {can("orders.delete") && (
                          <button
                            onClick={() => handleDeleteOrder(ord._id)}
                            title="Delete Order"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;