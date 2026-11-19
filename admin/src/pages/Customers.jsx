import { useEffect, useState, useMemo } from "react";
import toast from 'react-hot-toast';
import { confirmToast } from '../components/ConfirmToast';
import {
  Users,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
  Clock,
  CheckCheck,
  Ban,
  X,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const Customers = () => {
  const { user, hasPermission } = useAuth();
  const rawRole = (
    typeof user?.role === "string" ? user.role : user?.role?.name || ""
  ).toLowerCase();
  const isAdmin = ["admin", "super_admin", "superadmin"].includes(rawRole);

  const can = (perm) => isAdmin || (typeof hasPermission === "function" && hasPermission(perm));

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected customer for viewing orders
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [orderModalLoading, setOrderModalLoading] = useState(false);
  const [orderStatusTab, setOrderStatusTab] = useState("all");

  // Edit Customer Modal State
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Fetch real customers from backend
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customers");
      if (res.data?.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("customers.view")) {
      fetchCustomers();
    }
  }, []);

  // Filter customers based on search & status
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const name = `${cust.firstName || ""} ${cust.lastName || ""}`.toLowerCase();
      const email = (cust.email || "").toLowerCase();
      const phone = cust.phone || "";
      const matchesSearch =
        name.includes(search.toLowerCase()) ||
        email.includes(search.toLowerCase()) ||
        phone.includes(search);
      const matchesStatus = statusFilter === "all" || cust.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  // Toggle active / inactive status
  const handleToggleStatus = async (cust) => {
    if (!can("customers.status_change")) {
      toast.error("You do not have permission to change customer status."); return;
      return;
    }
    const newStatus = cust.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/customers/${cust._id}/status`, { status: newStatus });
      setCustomers((prev) =>
        prev.map((c) => (c._id === cust._id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  // Open Orders Modal & Fetch specific customer orders from backend
  const handleOpenOrdersModal = async (cust) => {
    setSelectedCustomer(cust);
    setOrderStatusTab("all");
    setOrderModalLoading(true);
    try {
      const res = await api.get(`/customers/${cust._id}/orders`);
      if (res.data?.success) {
        setCustomerOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
      setCustomerOrders([]);
    } finally {
      setOrderModalLoading(false);
    }
  };

  // Edit customer
  const handleStartEdit = (cust) => {
    setEditCustomer(cust);
    setEditForm({
      firstName: cust.firstName || "",
      lastName: cust.lastName || "",
      phone: cust.phone || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!can("customers.update")) return;
    setEditSaving(true);
    try {
      await api.put(`/customers/${editCustomer._id}`, editForm);
      setCustomers((prev) =>
        prev.map((c) => (c._id === editCustomer._id ? { ...c, ...editForm } : c))
      );
      setEditCustomer(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update customer");
    } finally {
      setEditSaving(false);
    }
  };

  // Delete customer
  const handleDeleteCustomer = async (id) => {
    if (!can("customers.delete")) {
      toast.error("You do not have permission."); return;
      return;
    }
    const _ok = await confirmToast("Delete this customer?"); if (!_ok) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete customer");
    }
  };

  // Filter modal orders by tab
  const filteredCustomerOrders = useMemo(() => {
    if (orderStatusTab === "all") return customerOrders;
    if (orderStatusTab === "pending") {
      return customerOrders.filter((o) =>
        ["placed", "confirmed", "assigned", "out_for_delivery"].includes(o.orderStatus)
      );
    }
    return customerOrders.filter((o) => o.orderStatus === orderStatusTab);
  }, [customerOrders, orderStatusTab]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* HEADER & METRIC COUNTERS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-indigo-600" size={26} /> Customers Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your registered customer accounts, profiles, and order histories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs text-xs font-semibold text-slate-700">
            Total: <span className="text-indigo-600 font-bold ml-1">{customers.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700">
            Active:{" "}
            <span className="font-bold ml-1">
              {customers.filter((c) => c.status === "active").length}
            </span>
          </div>
          <div className="bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700">
            Inactive:{" "}
            <span className="font-bold ml-1">
              {customers.filter((c) => c.status === "inactive").length}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by customer name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0 ml-1" />
          <span className="text-xs font-medium text-slate-500">Status:</span>
          {["all", "active", "inactive"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <AlertCircle size={36} className="mx-auto mb-2 text-slate-300" />
            No customer accounts found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Contact Details</th>
                  <th className="py-3.5 px-5">Orders Summary</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Joined</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((cust) => {
                  const fullName = `${cust.firstName || ""} ${cust.lastName || ""}`.trim() || "Customer";
                  const initials = fullName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const isActive = cust.status === "active";
                  const stats = cust.stats || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0 };

                  return (
                    <tr key={cust._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{fullName}</div>
                            <div className="text-xs text-slate-400">ID: {cust._id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail size={13} className="text-slate-400" />
                            <span>{cust.email}</span>
                          </div>
                          {cust.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Phone size={13} className="text-slate-400" />
                              <span>{cust.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                            <ShoppingBag size={13} /> {stats.totalOrders} Orders
                          </span>
                          {stats.pendingOrders > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                              {stats.pendingOrders} Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => handleToggleStatus(cust)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                          <span className="capitalize">{cust.status || "active"}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{cust.createdAt ? cust.createdAt.slice(0, 10) : "N/A"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Orders button */}
                          <button
                            onClick={() => handleOpenOrdersModal(cust)}
                            title="View Customer Orders"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Eye size={17} />
                          </button>

                          {/* Edit Customer button */}
                          {can("customers.update") && (
                            <button
                              onClick={() => handleStartEdit(cust)}
                              title="Edit Customer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            >
                              <Edit2 size={17} />
                            </button>
                          )}

                          {/* Delete Customer button */}
                          {can("customers.delete") && (
                            <button
                              onClick={() => handleDeleteCustomer(cust._id)}
                              title="Delete Customer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW CUSTOMER ORDERS MODAL WITH STATUS TABS */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Package className="text-indigo-600" size={20} />
                  Orders: {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h3>
                <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={19} />
              </button>
            </div>

            {/* Status Filter Tabs in Modal */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              {[
                { id: "all", label: "All Orders", icon: Package },
                { id: "pending", label: "Pending", icon: Clock },
                { id: "delivered", label: "Delivered", icon: CheckCheck },
                { id: "cancelled", label: "Cancelled", icon: Ban },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = orderStatusTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOrderStatusTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Content / Order List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {orderModalLoading ? (
                <div className="py-12 text-center text-slate-400">Loading orders...</div>
              ) : filteredCustomerOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No {orderStatusTab !== "all" ? orderStatusTab : ""} orders found for this customer.
                </div>
              ) : (
                filteredCustomerOrders.map((ord) => {
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
                    <div
                      key={ord._id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {ord.orderId || ord._id.slice(-8)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${colorClass}`}
                          >
                            {ord.orderStatus?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Placed on: {ord.createdAt ? ord.createdAt.slice(0, 10) : "N/A"} Ã¢â‚¬Â¢{" "}
                          {ord.items?.length || 1} items Ã¢â‚¬Â¢ {ord.paymentMethod} (
                          {ord.paymentStatus})
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-bold text-slate-900">
                          Ã¢â€šÂ¹{ord.totalAmount?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Edit Customer Information</h3>
              <button
                onClick={() => setEditCustomer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;