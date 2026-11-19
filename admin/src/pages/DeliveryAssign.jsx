import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Truck,
  Bike,
  Pencil,
  Trash2,
  Calendar,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  MapPin,
} from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function DeliveryAssign() {
  const { hasPermission } = useAuth();
  const canAssign = hasPermission("deliveries.assign");
  const canUpdate = hasPermission("orders.update");
  const canDelete = hasPermission("orders.delete");
  const [orders, setOrders] = useState([]);
  const [activeRiders, setActiveRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  // 1. Assign Modal States
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // 2. Edit Modal States
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    orderStatus: "placed",
    paymentStatus: "pending",
    receiverName: "",
    receiverPhone: "",
    streetAddress: "",
    city: "",
  });
  const [updating, setUpdating] = useState(false);

  // 3. Delete Modal State
  const [deleteOrderId, setDeleteOrderId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-dismiss notification
  const showNotification = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  // Fetch Orders and Only Active/Available Riders
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Orders
      const orderRes = await api.get("/orders", {
        params: { search, status: statusFilter, limit: 50 },
      });
      const orderData = orderRes.data?.orders || orderRes.data?.data || [];
      setOrders(Array.isArray(orderData) ? orderData : []);

      // 2. Available Riders
      const partnerRes = await api.get("/deliveries/available-partners");

      if (partnerRes.data?.success) {
        const allPartners = partnerRes.data.partners || [];
        const readyRidersOnly = allPartners.filter(
          (p) => p.isOnline === true && p.isAvailable === true
        );
        setActiveRiders(readyRidersOnly);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ================= ASSIGN RIDER HANDLER =================
  const handleAssignRider = async (e) => {
    e.preventDefault();
    if (!assignModalOrder || !selectedRiderId) return;

    setAssigning(true);
    try {
      const res = await api.post("/deliveries/assign", {
        orderId: assignModalOrder._id,
        deliveryPartnerId: selectedRiderId,
      });

      if (res.data?.success) {
        showNotification("Delivery partner assigned successfully! OTP emailed to customer.");
        setAssignModalOrder(null);
        setSelectedRiderId("");
        await fetchData();
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to assign delivery partner",
        "error"
      );
    } finally {
      setAssigning(false);
    }
  };

  // ================= EDIT / UPDATE ORDER HANDLER =================
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditForm({
      orderStatus: order.orderStatus || "placed",
      paymentStatus: order.paymentStatus || "pending",
      receiverName: order.deliveryAddress?.receiverName || "",
      receiverPhone: order.deliveryAddress?.receiverPhone || "",
      streetAddress: order.deliveryAddress?.streetAddress || "",
      city: order.deliveryAddress?.city || "",
    });
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    setUpdating(true);
    try {
      const payload = {
        orderStatus: editForm.orderStatus,
        paymentStatus: editForm.paymentStatus,
        deliveryAddress: {
          receiverName: editForm.receiverName,
          receiverPhone: editForm.receiverPhone,
          streetAddress: editForm.streetAddress,
          city: editForm.city,
        },
      };

      const res = await api.put(`/orders/${editingOrder._id}`, payload);
      if (res.data?.success || res.status === 200) {
        showNotification("Order details updated successfully!");
        setEditingOrder(null);
        await fetchData();
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to update order",
        "error"
      );
    } finally {
      setUpdating(false);
    }
  };

  // ================= DELETE ORDER HANDLER =================
  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/orders/${deleteOrderId}`);
      if (res.data?.success || res.status === 200) {
        showNotification("Order deleted successfully!");
        setDeleteOrderId(null);
        await fetchData();
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to delete order",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "out_for_delivery") return "bg-blue-50 text-blue-700 border-blue-200";
    if (s === "assigned") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 p-2 sm:p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-indigo-600/10 text-indigo-600 rounded-2xl">
            <Truck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Order Dispatch &amp; Operations
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              Manage live orders, update fulfillment details, and assign ready delivery riders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-700 shadow-2xs w-max">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeRiders.length} Free Riders Online</span>
        </div>
      </div>

      {/* NOTIFICATION MESSAGE */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 shadow-xs ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search order ID, receiver, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition font-medium bg-slate-50/50"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 text-xs sm:text-sm rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 bg-slate-50/50 font-semibold text-slate-700"
        >
          <option value="">All Order Statuses</option>
          <option value="placed">Placed (Waiting for Rider)</option>
          <option value="confirmed">Confirmed</option>
          <option value="assigned">Assigned to Rider</option>
          <option value="out_for_delivery">Out For Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ORDERS & CRUD TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Order ID &amp; Date</th>
                <th className="px-6 py-4">Customer Info</th>
                <th className="px-6 py-4">Amount &amp; Pay</th>
                <th className="px-6 py-4">Order Status</th>
                <th className="px-6 py-4">Rider Info</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <Loader2 size={26} className="animate-spin mx-auto text-indigo-600 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Loading orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500 text-xs font-semibold">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const riderName =
                    ord.deliveryPartner?.firstName ||
                    ord.deliveryPartner?.user?.firstName ||
                    ord.deliveryPartner?.name ||
                    (typeof ord.deliveryPartner === "string" ? "Assigned Rider" : null);

                  const isAssigned = Boolean(ord.deliveryPartner);

                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 text-xs block">
                          #{ord.orderId || ord._id.slice(-6)}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                          <Calendar size={12} />
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs space-y-1">
                        <p className="font-bold text-slate-800">
                          {ord.deliveryAddress?.receiverName || ord.user?.firstName || "Customer"}
                        </p>
                        <p className="text-slate-500 font-medium">
                          {ord.deliveryAddress?.receiverPhone || "N/A"}
                        </p>
                        <p className="text-slate-400 truncate max-w-xs font-medium">
                          {ord.deliveryAddress?.streetAddress}, {ord.deliveryAddress?.city}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <p className="font-black text-slate-900 text-sm">
                          ₹{ord.totalAmount || ord.payableAmount || 0}
                        </p>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5 block">
                          {ord.paymentStatus || "pending"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border capitalize ${statusBadge(
                            ord.orderStatus
                          )}`}
                        >
                          {String(ord.orderStatus || "").replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {isAssigned ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 w-max shadow-2xs">
                            <Bike size={14} />
                            <span>{riderName || "Assigned Rider"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold italic">Not Assigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canAssign && ord.orderStatus !== "delivered" && ord.orderStatus !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignModalOrder(ord);
                                setSelectedRiderId("");
                              }}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                              title="Assign Free Delivery Boy"
                            >
                              <Truck size={14} />
                              <span>{isAssigned ? "Re-assign" : "Assign"}</span>
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(ord)}
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                              title="Edit Order"
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteOrderId(ord._id)}
                              className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-100"
                              title="Delete Order"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 1. ASSIGN RIDER MODAL ================= */}
      {assignModalOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Assign Delivery Partner
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Order #{assignModalOrder.orderId || assignModalOrder._id.slice(-6)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignRider} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                  Select Free Delivery Partner ({activeRiders.length} Available)
                </label>

                {activeRiders.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold">
                    ⚠️ Koi bhi delivery boy abhi free nahi hai (sab offline hain ya orders deliver kar rahe hain).
                  </div>
                ) : (
                  <select
                    value={selectedRiderId}
                    onChange={(e) => setSelectedRiderId(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs outline-none focus:border-indigo-500 bg-slate-50 font-bold text-slate-700"
                    required
                  >
                    <option value="">-- Choose Active Rider --</option>
                    {activeRiders.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.firstName} {r.lastName} - {r.vehicleType?.toUpperCase()} ({r.vehicleNumber}) • 📞 {r.phone || "No phone"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOrder(null)}
                  className="px-5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || activeRiders.length === 0 || !selectedRiderId}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs transition cursor-pointer shadow-md shadow-indigo-200"
                >
                  {assigning ? "Assigning & Mailing OTP..." : "Assign & Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 2. EDIT / UPDATE ORDER MODAL ================= */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Update Order Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Order #{editingOrder.orderId || editingOrder._id.slice(-6)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Order Status
                  </label>
                  <select
                    value={editForm.orderStatus}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, orderStatus: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-2xl px-3.5 py-3 text-xs bg-slate-50 outline-none focus:border-indigo-500 font-bold text-slate-700"
                  >
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="assigned">Assigned</option>
                    <option value="out_for_delivery">Out For Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, paymentStatus: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-2xl px-3.5 py-3 text-xs bg-slate-50 outline-none focus:border-indigo-500 font-bold text-slate-700"
                  >
                    <option value="pending">Pending</option>
                    <option value="SUCCESS">Success / Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Receiver Name
                </label>
                <input
                  type="text"
                  value={editForm.receiverName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, receiverName: e.target.value }))
                  }
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-3 text-xs outline-none focus:border-indigo-500 font-semibold bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Receiver Phone
                </label>
                <input
                  type="text"
                  value={editForm.receiverPhone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, receiverPhone: e.target.value }))
                  }
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-3 text-xs outline-none focus:border-indigo-500 font-semibold bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={editForm.streetAddress}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, streetAddress: e.target.value }))
                  }
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-3 text-xs outline-none focus:border-indigo-500 font-semibold bg-slate-50"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-200"
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 3. DELETE CONFIRMATION POPUP ================= */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 size={26} />
            </div>
            <h3 className="font-black text-slate-900 text-base">Delete Order?</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Kya aap sach me is order ko delete karna chahte hain? Yeh action permanent hai.
            </p>

            <div className="flex justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteOrderId(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteOrder}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition cursor-pointer disabled:opacity-50 shadow-md shadow-rose-200"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}