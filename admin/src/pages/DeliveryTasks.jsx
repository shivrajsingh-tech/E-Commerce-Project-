import { useState, useEffect, useCallback } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { Bike, Power, PackageCheck, Loader2, ShieldAlert } from "lucide-react";

export default function DeliveryTasks() {
  const { user, setUser } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState("");

  const rawRole = (
    typeof user?.role === "string" ? user.role : user?.role?.name || ""
  ).toLowerCase();

  const isActualDeliveryBoy = rawRole === "delivery_partner";
  const isSuperAdminOrAdmin = ["super_admin", "superadmin", "admin"].includes(rawRole);

  // 1. LIVE PROFILE & TASK LOADER
  const loadRiderData = useCallback(async () => {
    try {
      const res = await api.get("/orders/my-delivery-task");
      if (res.data?.success) {
        const orderList = res.data.orders || [];
        setActiveTask(orderList.length > 0 ? orderList[0] : null);

        if (typeof res.data.isOnline === "boolean") {
          setIsOnline(res.data.isOnline);
        }
      } else {
        setActiveTask(null);
      }

      const profileRes = await api.get("/users/me");
      if (profileRes.data?.success && profileRes.data.user) {
        const liveUser = profileRes.data.user;
        const currentDuty = Boolean(liveUser.isOnline);
        setIsOnline(currentDuty);

        if (typeof setUser === "function") {
          setUser((prev) => ({
            ...prev,
            ...liveUser,
            isOnline: currentDuty,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load live rider status:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    loadRiderData();
  }, [loadRiderData]);

  // 2. TOGGLE DUTY STATUS
  const toggleDuty = async () => {
    if (!isActualDeliveryBoy) return;
    setDutyLoading(true);
    try {
      const res = await api.patch("/deliveries/duty-status");
      if (res.data?.success) {
        const nextState = Boolean(res.data.isOnline);
        setIsOnline(nextState);

        if (typeof setUser === "function" && user) {
          setUser({ ...user, isOnline: nextState });
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle duty");
    } finally {
      setDutyLoading(false);
    }
  };

  // 3. MARK PICKED UP
  const handlePickup = async () => {
    const orderIdentifier = activeTask?._id || activeTask?.id;
    if (!orderIdentifier) return;

    setLoading(true);
    setAlertMsg("");
    try {
      const res = await api.post("/deliveries/pickup", {
        orderId: orderIdentifier,
      });

      if (res.data?.success) {
        setAlertMsg("Status changed to Out for Delivery!");
        await loadRiderData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Pickup error");
    } finally {
      setLoading(false);
    }
  };

  // 4. VERIFY OTP & COMPLETE DELIVERY
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!isActualDeliveryBoy) {
      alert("Only assigned delivery partners can verify OTP.");
      return;
    }

    const orderIdentifier = activeTask?._id || activeTask?.id;
    if (!orderIdentifier) return;

    setLoading(true);
    setAlertMsg("");
    try {
      const res = await api.post("/deliveries/verify-deliver", {
        orderId: orderIdentifier,
        otp: otp.trim(),
      });

      if (res.data?.success) {
        alert("Order delivered successfully!");
        setOtp("");
        setActiveTask(null);
        await loadRiderData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Incorrect OTP");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-600 mb-2" />
        <p className="text-xs">Loading duty console...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* HEADER CARD */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Bike size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isActualDeliveryBoy
                ? "My Delivery Console"
                : "Delivery Console (Super Admin Monitor Mode)"}
            </h2>
            <p className="text-xs text-slate-500">
              {isActualDeliveryBoy
                ? isOnline
                  ? "🟢 You are Online & ready for deliveries"
                  : "🔴 You are currently Offline"
                : "Super Admin View — Only actual rider can perform pickup & verify OTP."}
            </p>
          </div>
        </div>

        {/* DUTY TOGGLE BUTTON */}
        {isActualDeliveryBoy && (
          <button
            type="button"
            onClick={toggleDuty}
            disabled={dutyLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60 shadow-sm ${
              isOnline
                ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                : "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700"
            }`}
          >
            <Power size={14} />
            <span>{isOnline ? "Go Offline" : "Go Online"}</span>
          </button>
        )}
      </div>

      {alertMsg && (
        <div className="p-4 mb-4 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100">
          {alertMsg}
        </div>
      )}

      {/* ACTIVE TASK CARD */}
      {activeTask ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">
              Order #{activeTask.orderId || activeTask._id?.slice(-6)}
            </h3>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold uppercase tracking-wider">
              {String(activeTask.orderStatus || "").replace(/_/g, " ")}
            </span>
          </div>

          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <strong className="text-slate-800">Customer:</strong>{" "}
              {activeTask.deliveryAddress?.receiverName || "Customer"}
            </p>
            <p>
              <strong className="text-slate-800">Phone:</strong>{" "}
              {activeTask.deliveryAddress?.receiverPhone || "N/A"}
            </p>
            <p>
              <strong className="text-slate-800">Address:</strong>{" "}
              {[
                activeTask.deliveryAddress?.streetAddress,
                activeTask.deliveryAddress?.city,
                activeTask.deliveryAddress?.pincode,
              ]
                .filter(Boolean)
                .join(", ") || "Local address"}
            </p>
          </div>

          {/* Action 1: Mark Picked Up */}
          {activeTask.orderStatus === "assigned" && isActualDeliveryBoy && (
            <button
              type="button"
              onClick={handlePickup}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Pickup Status...</span>
                </>
              ) : (
                "Mark as Picked Up (Out for Delivery)"
              )}
            </button>
          )}

          {/* Super Admin view note */}
          {activeTask.orderStatus === "assigned" && isSuperAdminOrAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-center font-medium">
              Order is currently waiting for rider pickup.
            </div>
          )}

          {/* Action 2: OTP Verification Form */}
          {activeTask.orderStatus === "out_for_delivery" && (
            <>
              {isActualDeliveryBoy ? (
                <form
                  onSubmit={handleVerifyOtp}
                  className="pt-3 border-t border-slate-100 space-y-3"
                >
                  <label className="block text-xs font-semibold text-slate-700">
                    Ask Customer for 4-digit Delivery OTP:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="0000"
                      className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-center text-xl tracking-widest font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 4}
                      className="px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        "Verify & Complete"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-3 border-t border-slate-100">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2.5 text-indigo-900 text-xs">
                    <ShieldAlert size={16} className="text-indigo-600 shrink-0" />
                    <span>
                      <strong>Out For Delivery:</strong> Assigned delivery partner will verify OTP directly with the customer.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-2xl text-center text-slate-400">
          <PackageCheck className="mx-auto mb-2 opacity-50" size={32} />
          <p className="text-sm font-medium">No active deliveries assigned right now.</p>
        </div>
      )}
    </div>
  );
}