"use client";

import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Palette,
  X,
  User,
  MapPin,
  Package,
  ShieldCheck,
  Save,
  Loader2,
  Lock,
  Plus,
  LocateFixed,
  Sparkles,
  Trash2,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useTheme } from "@/context/themeContext";

export default function AccountSidebar({
  isOpen,
  onClose,
  initialTab = "profile",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // PROFILE
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // PASSWORD
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // ORDERS
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);

  // ADDRESSES
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [defaultUpdatingId, setDefaultUpdatingId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  // ADDRESS FORM
  const [newLabel, setNewLabel] = useState("Home");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // THEME
  const { theme, setTheme: setThemeCtx } = useTheme();

  // SYNC TAB
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // LOCK BACKGROUND SCROLL
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  // FETCH ACCOUNT DATA
  useEffect(() => {
    if (!isOpen) return;

    fetchCustomerProfile();
    fetchOrders();
    fetchAddresses();
  }, [isOpen]);

  // ================= PROFILE =================

  const fetchCustomerProfile = async () => {
    try {
      const res = await api.get("/users/getCustomerProfile");

      const u = res.data?.user || res.data || {};

      const fullName =
        u.name ||
        `${u.firstName || ""} ${u.lastName || ""}`.trim();

      setName(fullName);
      setPhone(u.phone || "");
      setEmail(u.email || "");

      setReceiverName(fullName);
      setReceiverPhone(u.phone || "");
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error(
        err.response?.data?.message || "Failed to load profile"
      );
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setSavingProfile(true);

      await api.put("/users/updateCustomerProfile", {
        name: name.trim(),
        phone: phone.trim(),
      });

      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // ================= PASSWORD =================

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setSavingPassword(true);

      await api.put("/users/changeCustomerPassword", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully!");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update password"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // ================= ORDERS =================

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);

      const res = await api.get("/orders/my-orders");

      const list =
        res.data?.orders ||
        res.data?.data ||
        res.data ||
        [];

      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    

    try {
      setCancellingId(orderId);

      await api.patch(`/orders/${orderId}/cancel`, {
        cancellationReason: "Cancelled by customer",
      });

      toast.success("Order cancelled successfully");

      await fetchOrders();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Order cancel failed"
      );
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const status = String(ord.orderStatus || "").toLowerCase();

    if (orderFilter === "pending") {
      return [
        "placed",
        "packing",
        "confirmed",
        "out_for_delivery",
      ].includes(status);
    }

    if (orderFilter === "completed") {
      return status === "delivered";
    }

    if (orderFilter === "cancelled") {
      return status === "cancelled";
    }

    return true;
  });

  // ================= ADDRESSES =================

  const fetchAddresses = async () => {
    try {
      setAddressLoading(true);

      const res = await api.get("/addresses/getAddress");

      const list = Array.isArray(res.data?.addresses)
        ? res.data.addresses
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      const sorted = [...list].sort((a, b) => {
        if (Boolean(a.isDefault) !== Boolean(b.isDefault)) {
          return Number(Boolean(b.isDefault)) -
            Number(Boolean(a.isDefault));
        }

        return (
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
        );
      });

      const selectedDefault = sorted.find(
        (addr) => addr.isDefault === true
      );

      const normalizedAddresses = sorted.map((addr) => ({
        ...addr,
        isDefault: selectedDefault
          ? String(addr._id) === String(selectedDefault._id)
          : false,
      }));

      setAddresses(normalizedAddresses);
    } catch (err) {
      console.error("Failed to load addresses:", err);
      setAddresses([]);

      toast.error(
        err.response?.data?.message || "Failed to load addresses"
      );
    } finally {
      setAddressLoading(false);
    }
  };

  // OPEN ADD ADDRESS FORM
  const openAddAddress = () => {
    setNewLabel("Home");

    setReceiverName(name || "");
    setReceiverPhone(phone || "");

    setStreetAddress("");
    setLandmark("");
    setCity("");
    setState("");
    setPincode("");

    setIsDefault(addresses.length === 0);

    setShowAddAddress(true);
  };

  // ADD ADDRESS
  const handleAddAddress = async (e) => {
    e.preventDefault();

    if (
      !receiverName.trim() ||
      !receiverPhone.trim() ||
      !streetAddress.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      toast.error("Please fill all required address fields");
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(receiverPhone.trim())) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      setAddressSubmitting(true);

      const shouldBeDefault =
        addresses.length === 0 || isDefault;

      const res = await api.post("/addresses/addAddress", {
        label: newLabel,
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        streetAddress: streetAddress.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        isDefault: shouldBeDefault,
      });

      if (!res.data?.success) {
        throw new Error(
          res.data?.message || "Failed to add address"
        );
      }

      toast.success("Address added successfully!");

      setShowAddAddress(false);

      setStreetAddress("");
      setLandmark("");
      setCity("");
      setState("");
      setPincode("");
      setIsDefault(false);

      await fetchAddresses();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Failed to add address"
      );
    } finally {
      setAddressSubmitting(false);
    }
  };

  // SELECT DEFAULT ADDRESS
  const handleSelectDefault = async (id) => {
    if (defaultUpdatingId || deletingAddressId) return;

    const previousAddresses = [...addresses];

    try {
      setDefaultUpdatingId(id);

      // Immediate UI update
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: String(addr._id) === String(id),
        }))
      );

      const res = await api.patch(`/addresses/${id}/select`);

      if (!res.data?.success) {
        throw new Error(
          res.data?.message || "Failed to update default address"
        );
      }

      // Verify backend saved the selection
      const verifyRes = await api.get("/addresses/getAddress");

      const serverAddresses = Array.isArray(
        verifyRes.data?.addresses
      )
        ? verifyRes.data.addresses
        : Array.isArray(verifyRes.data?.data)
        ? verifyRes.data.data
        : Array.isArray(verifyRes.data)
        ? verifyRes.data
        : [];

      const selectedAddress = serverAddresses.find(
        (addr) =>
          String(addr._id) === String(id) &&
          addr.isDefault === true
      );

      if (!selectedAddress) {
        throw new Error(
          "Default address was not saved correctly"
        );
      }

      const normalized = serverAddresses
        .map((addr) => ({
          ...addr,
          isDefault: String(addr._id) === String(id),
        }))
        .sort(
          (a, b) =>
            Number(b.isDefault) - Number(a.isDefault)
        );

      setAddresses(normalized);

      toast.success("Default address updated successfully!");
    } catch (err) {
      setAddresses(previousAddresses);

      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Failed to update default address"
      );
    } finally {
      setDefaultUpdatingId(null);
    }
  };

  // DELETE ADDRESS
  const handleDeleteAddress = async (id) => {
    if (defaultUpdatingId || deletingAddressId) return;

    try {
      setDeletingAddressId(id);

      const res = await api.delete(`/addresses/delete/${id}`);

      if (!res.data?.success) {
        throw new Error(
          res.data?.message || "Failed to delete address"
        );
      }

      toast.success("Address deleted successfully");

      await fetchAddresses();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Failed to delete address"
      );
    } finally {
      setDeletingAddressId(null);
    }
  };

  // ================= LOCATION =================

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          if (!res.ok) {
            throw new Error("Location lookup failed");
          }

          const data = await res.json();
          const addr = data.address || {};

          setStreetAddress(
            addr.road ||
            addr.suburb ||
            addr.neighbourhood ||
            ""
          );

          setCity(
            addr.city ||
            addr.town ||
            addr.village ||
            addr.county ||
            ""
          );

          setState(addr.state || "");
          setPincode(addr.postcode || "");

          toast.success("Location detected successfully!");
        } catch (err) {
          toast.error(
            "Unable to fetch address details from GPS"
          );
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        toast.error("Location permission denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  // PINCODE LOOKUP
  const handlePincodeLookup = async (pin) => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) return;

    try {
      const res = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`
      );

      const data = await res.json();

      if (data[0]?.Status === "Success") {
        const postOffice = data[0].PostOffice[0];

        setCity(postOffice.District || postOffice.Block || "");
        setState(postOffice.State || "");
      }
    } catch (err) {
      console.error("Pincode lookup failed:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex justify-start overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-left duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 p-5 bg-gradient-to-r from-violet-700 to-indigo-600 text-white">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-violet-200">
              <Sparkles size={12} />
              Customer Dashboard
            </div>

            <h2 className="text-lg font-black tracking-tight truncate">
              {name || "My Account"}
            </h2>

            <p className="text-xs text-violet-100 truncate max-w-[260px]">
              {email}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="shrink-0 grid grid-cols-5 border-b border-slate-100 bg-slate-100 p-1.5 text-[11px] font-bold text-slate-600">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "security", label: "Security", icon: ShieldCheck },
            { id: "orders", label: "Orders", icon: Package },
            { id: "addresses", label: "Address", icon: MapPin },
            { id: "theme", label: "Theme", icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);

                  if (tab.id !== "addresses") {
                    setShowAddAddress(false);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-violet-700 shadow-xs font-black"
                    : "hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-6 bg-slate-50/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* PROFILE */}
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>

                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email (Locked)
                  </label>

                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50 cursor-pointer shadow-md shadow-violet-200 transition"
              >
                {savingProfile ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Update Profile
              </button>
            </form>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-4">
                {[
                  {
                    label: "Current Password",
                    value: currentPassword,
                    setter: setCurrentPassword,
                  },
                  {
                    label: "New Password",
                    value: newPassword,
                    setter: setNewPassword,
                  },
                  {
                    label: "Confirm New Password",
                    value: confirmPassword,
                    setter: setConfirmPassword,
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {field.label}
                    </label>

                    <input
                      type="password"
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:bg-white font-semibold"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50 cursor-pointer shadow-md shadow-violet-200 transition"
              >
                {savingPassword ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Change Password
              </button>
            </form>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {["all", "pending", "completed", "cancelled"].map(
                  (filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setOrderFilter(filter)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition cursor-pointer ${
                        orderFilter === filter
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {filter}
                    </button>
                  )
                )}
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2
                    size={24}
                    className="animate-spin text-violet-600"
                  />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-6">
                  <Package
                    size={40}
                    className="mx-auto mb-2 opacity-40 text-slate-500"
                  />

                  <p className="text-xs font-bold text-slate-700">
                    No {orderFilter !== "all" ? orderFilter : ""} orders found
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((ord) => {
                    const status = String(
                      ord.orderStatus || ""
                    ).toLowerCase();

                    const isDelivered = status === "delivered";
                    const isCancelled = status === "cancelled";

                    const canCancel = [
                      "placed",
                      "packing",
                      "confirmed",
                    ].includes(status);

                    return (
                      <div
                        key={ord._id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800">
                            #{ord.orderNumber || String(ord._id).slice(-8)}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                              isDelivered
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isCancelled
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {ord.orderStatus?.replace(/_/g, " ")}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 font-medium">
                          {ord.items?.length || 1} items &bull; &#x20B9;
                          {Number(ord.totalAmount || 0).toLocaleString("en-IN")}
                        </p>

                        {canCancel && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              disabled={cancellingId === ord._id}
                              onClick={() => handleCancelOrder(ord._id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 cursor-pointer"
                            >
                              {cancellingId === ord._id
                                ? "Cancelling..."
                                : "Cancel Order"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ADDRESSES */}
          {activeTab === "addresses" && (
            <div className="space-y-4">
              {!showAddAddress ? (
                <>
                  {/* ADD ADDRESS BUTTON */}
                  <button
                    type="button"
                    onClick={openAddAddress}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 py-3 text-xs font-extrabold text-violet-700 hover:bg-violet-50 cursor-pointer transition"
                  >
                    <Plus size={16} />
                    Add New Delivery Address
                  </button>

                  {/* ADDRESS LOADING */}
                  {addressLoading ? (
                    <div className="flex justify-center py-16">
                      <Loader2
                        size={24}
                        className="animate-spin text-violet-600"
                      />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-6">
                      <MapPin
                        size={40}
                        className="mx-auto mb-2 opacity-40 text-slate-500"
                      />

                      <p className="text-xs font-bold text-slate-700">
                        No saved delivery addresses
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ADDRESS HEADER */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">
                            Saved Addresses
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Select an address for your deliveries
                          </p>
                        </div>

                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">
                          {addresses.length} Saved
                        </span>
                      </div>

                      {/* UPDATED ADDRESS CARDS */}
                      <div className="space-y-3">
                        {addresses.map((addr) => {
                          const isCurrentDefault =
                            addr.isDefault === true;

                          const isUpdating =
                            defaultUpdatingId === addr._id;

                          const isDeleting =
                            deletingAddressId === addr._id;

                          const isBusy =
                            Boolean(defaultUpdatingId || deletingAddressId);

                          return (
                            <div
                              key={addr._id}
                              onClick={() => {
                                if (!isCurrentDefault && !isBusy) {
                                  handleSelectDefault(addr._id);
                                }
                              }}
                              role="button"
                              tabIndex={isBusy ? -1 : 0}
                              onKeyDown={(e) => {
                                if (
                                  (e.key === "Enter" || e.key === " ") &&
                                  !isCurrentDefault &&
                                  !isBusy
                                ) {
                                  e.preventDefault();
                                  handleSelectDefault(addr._id);
                                }
                              }}
                              className={`group relative rounded-2xl border-2 bg-white p-4 transition-all duration-200 ${
                                isCurrentDefault
                                  ? "border-violet-500 bg-violet-50/40 shadow-md shadow-violet-100"
                                  : "border-slate-200 hover:border-violet-300 hover:shadow-md"
                              } ${
                                isBusy
                                  ? "cursor-wait opacity-80"
                                  : isCurrentDefault
                                  ? "cursor-default"
                                  : "cursor-pointer"
                              }`}
                            >
                              {/* NAME + LABEL + DELETE */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-extrabold text-slate-900">
                                      {addr.receiverName || "Customer"}
                                    </h4>

                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                                      {addr.label || "Home"}
                                    </span>
                                  </div>

                                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                                    {addr.receiverPhone}
                                  </p>
                                </div>

                                {/* DELETE */}
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAddress(addr._id);
                                  }}
                                  className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                                  title="Delete address"
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </button>
                              </div>

                              {/* ADDRESS */}
                              <div className="mt-3 flex gap-2.5">
                                <MapPin
                                  size={15}
                                  className={`mt-0.5 shrink-0 ${
                                    isCurrentDefault
                                      ? "text-violet-600"
                                      : "text-slate-400"
                                  }`}
                                />

                                <p className="text-xs leading-relaxed text-slate-600">
                                  {addr.streetAddress}
                                  {addr.landmark
                                    ? `, ${addr.landmark}`
                                    : ""}
                                  {addr.city ? `, ${addr.city}` : ""}
                                  {addr.state ? `, ${addr.state}` : ""}
                                  {addr.pincode ? ` - ${addr.pincode}` : ""}
                                </p>
                              </div>

                              {/* BOTTOM RADIO + STATUS */}
                              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                      isCurrentDefault
                                        ? "border-violet-600 bg-violet-600"
                                        : "border-slate-300 bg-white group-hover:border-violet-500"
                                    }`}
                                  >
                                    {isCurrentDefault && (
                                      <Check
                                        size={12}
                                        strokeWidth={3}
                                        className="text-white"
                                      />
                                    )}
                                  </div>

                                  <span
                                    className={`text-[10px] font-bold ${
                                      isCurrentDefault
                                        ? "text-violet-700"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {isUpdating
                                      ? "Updating default address..."
                                      : isCurrentDefault
                                      ? "Selected for delivery"
                                      : "Set as default address"}
                                  </span>
                                </div>

                                {isCurrentDefault && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[9px] font-extrabold text-white">
                                    <ShieldCheck size={11} />
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* ADD ADDRESS FORM */
                <form
                  onSubmit={handleAddAddress}
                  className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-slate-900 uppercase">
                      Add New Address
                    </h3>

                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* GPS */}
                  <button
                    type="button"
                    disabled={locationLoading}
                    onClick={handleDetectLocation}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-50 border border-violet-200 py-2.5 text-xs font-bold text-violet-700 hover:bg-violet-100 cursor-pointer disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LocateFixed size={15} />
                    )}

                    Detect Current Location (GPS)
                  </button>

                  {/* LABEL */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Label
                    </label>

                    <div className="flex gap-2">
                      {["Home", "Work", "Office", "Other"].map(
                        (label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setNewLabel(label)}
                            className={`flex-1 rounded-lg py-1.5 text-xs font-bold cursor-pointer transition ${
                              newLabel === label
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* NAME AND PHONE */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Receiver Name
                      </label>

                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) =>
                          setReceiverName(e.target.value)
                        }
                        placeholder="Full Name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Receiver Phone
                      </label>

                      <input
                        type="text"
                        maxLength={10}
                        value={receiverPhone}
                        onChange={(e) =>
                          setReceiverPhone(
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        placeholder="10-digit number"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* PINCODE */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pincode
                    </label>

                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPincode(val);

                        if (val.length === 6) {
                          handlePincodeLookup(val);
                        }
                      }}
                      placeholder="6-digit pincode"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                    />
                  </div>

                  {/* STREET */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Street Address
                    </label>

                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) =>
                        setStreetAddress(e.target.value)
                      }
                      placeholder="House no., Building, Area"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                    />
                  </div>

                  {/* LANDMARK */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Landmark (Optional)
                    </label>

                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) =>
                        setLandmark(e.target.value)
                      }
                      placeholder="Near famous place"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                    />
                  </div>

                  {/* CITY AND STATE */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        City
                      </label>

                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        State
                      </label>

                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-violet-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* DEFAULT CHECKBOX */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={
                        addresses.length === 0 || isDefault
                      }
                      disabled={addresses.length === 0}
                      onChange={(e) =>
                        setIsDefault(e.target.checked)
                      }
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />

                    <label
                      htmlFor="isDefault"
                      className="text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {addresses.length === 0
                        ? "This will be your default delivery address"
                        : "Make this my default delivery address"}
                    </label>
                  </div>

                  {/* SAVE */}
                  <button
                    type="submit"
                    disabled={addressSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50 cursor-pointer transition shadow-sm mt-2"
                  >
                    {addressSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}

                    Save Address
                  </button>
                </form>
              )}
            </div>
          )}

          {/* THEME */}
          {activeTab === "theme" && (
            <div className="space-y-4">
              {/* Header card */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Palette size={18} />
                  <h3 className="text-sm font-black">Appearance</h3>
                </div>
                <p className="text-xs text-violet-200">
                  Your theme is saved to your account and applied everywhere.
                </p>
              </div>

              {/* Light / Dark options */}
              {[
                {
                  id: "light",
                  label: "Light Mode",
                  desc: "Clean white interface — great for daytime.",
                  icon: Sun,
                  preview: "from-slate-100 to-white",
                  barColor: "bg-slate-300",
                },
                {
                  id: "dark",
                  label: "Dark Mode",
                  desc: "Easy on the eyes — perfect for night-time.",
                  icon: Moon,
                  preview: "from-slate-800 to-slate-950",
                  barColor: "bg-white/20",
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemeCtx(opt.id)}
                    className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
                      isActive ? "border-violet-500 shadow-md" : "border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    {/* Preview strip */}
                    <div className={`h-10 w-full bg-gradient-to-r ${opt.preview} flex items-center justify-end px-4 gap-2`}>
                      {[32, 24, 16].map((w, i) => (
                        <div key={i} className={`h-1.5 rounded-full ${opt.barColor}`} style={{ width: w }} />
                      ))}
                    </div>
                    {/* Info row */}
                    <div className="flex items-center gap-3 p-3.5 bg-white">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${opt.id === "light" ? "bg-amber-100 text-amber-600" : "bg-indigo-900 text-indigo-300"}`}>
                        <Icon size={17} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isActive ? "text-violet-700" : "text-slate-800"}`}>{opt.label}</p>
                        <p className="text-[10px] text-slate-500">{opt.desc}</p>
                      </div>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isActive ? "border-violet-600 bg-violet-600" : "border-slate-300"}`}>
                        {isActive && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Quick toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Quick toggle</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Currently: <span className="font-bold text-violet-700 capitalize">{theme} mode</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setThemeCtx(theme === "light" ? "dark" : "light")}
                  className="theme-toggle"
                  aria-label="Toggle theme"
                >
                  <span className="theme-toggle-knob" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
