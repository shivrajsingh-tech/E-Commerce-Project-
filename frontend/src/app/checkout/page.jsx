
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  ArrowLeft,
  MapPin,
  ShoppingBag,
  Trash2,
  Pencil,
  Plus,
  Minus,
  Loader2,
  ShieldCheck,
  Truck,
  Home,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Navigation,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  LockKeyhole,
  Package,
  Sparkles,
} from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";

const LOCATION_KEY = "elibcart_location";

const emptyAddressForm = {
  label: "Home",
  receiverName: "",
  phone: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    deleteFromCart,
    totalItems,
    totalAmount,
    clearCart,
  } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("COD");

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);

  const [addressForm, setAddressForm] = useState(emptyAddressForm);

  // LOAD SELECTED STORE
  useEffect(() => {
    try {
      const savedLocation = localStorage.getItem(LOCATION_KEY);

      if (savedLocation) {
        const parsed = JSON.parse(savedLocation);

        if (parsed.store) {
          setSelectedStore(parsed.store);
        }
      }
    } catch (err) {
      console.error("Failed to read store:", err);
    }
  }, []);

  // USER DETAILS
  useEffect(() => {
    if (user && !editingAddressId) {
      setAddressForm((prev) => ({
        ...prev,
        receiverName: prev.receiverName || user.name || user.firstName || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user, editingAddressId]);

  // FETCH ADDRESSES
  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);

      const res = await api.get("/addresses/getAddress");

      const data =
        res.data?.addresses ||
        res.data?.data?.addresses ||
        res.data?.data ||
        res.data ||
        [];

      const validList = Array.isArray(data) ? data : [];

      setAddresses(validList);

      if (validList.length > 0) {
        const defaultAddr = validList.find((a) => a.isDefault);
        const defaultId = defaultAddr?._id || validList[0]._id;

        setSelectedAddressId((prev) => prev || String(defaultId));
      } else {
        setSelectedAddressId("");
      }
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user]);

  // OPEN ADD MODAL
  const handleOpenAdd = () => {
    setEditingAddressId(null);
    setError("");

    setAddressForm({
      ...emptyAddressForm,
      receiverName: user?.name || user?.firstName || "",
      phone: user?.phone || "",
    });

    setShowAddressModal(true);
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (e, addr) => {
    e.stopPropagation();

    setError("");
    setEditingAddressId(String(addr._id || addr.id));

    setAddressForm({
      label: addr.label || "Home",
      receiverName: addr.receiverName || user?.name || "",
      phone: addr.receiverPhone || addr.phone || "",
      street: addr.streetAddress || addr.street || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || addr.postalCode || "",
      isDefault: Boolean(addr.isDefault),
    });

    setShowAddressModal(true);
  };

  // CLOSE MODAL
  const handleCloseForm = () => {
    if (savingAddress) return;

    setShowAddressModal(false);
    setEditingAddressId(null);
    setError("");

    setAddressForm({
      ...emptyAddressForm,
      receiverName: user?.name || user?.firstName || "",
      phone: user?.phone || "",
    });
  };

  // PINCODE LOOKUP
  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);

    setAddressForm((prev) => ({
      ...prev,
      pincode: val,
    }));

    if (val.length === 6) {
      try {
        setFetchingPincode(true);

        const res = await fetch(
          `https://api.postalpincode.in/pincode/${val}`
        );

        const data = await res.json();

        if (data?.[0]?.Status === "Success") {
          const postOffice = data[0].PostOffice?.[0];

          setAddressForm((prev) => ({
            ...prev,
            city: postOffice?.District || postOffice?.Circle || prev.city,
            state: postOffice?.State || prev.state,
          }));
        }
      } catch (err) {
        console.error("Pincode lookup error:", err);
      } finally {
        setFetchingPincode(false);
      }
    }
  };

  // DETECT CURRENT LOCATION
  const handleDetectCurrentLocation = () => {
    setDetectingLocation(true);

    const fallbackToIP = async () => {
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();

        if (ipData?.postal) {
          const autoPincode = String(ipData.postal)
            .replace(/\D/g, "")
            .slice(0, 6);

          setAddressForm((prev) => ({
            ...prev,
            pincode: autoPincode || prev.pincode,
            city: ipData.city || prev.city,
            state: ipData.region || prev.state,
          }));
        }
      } catch (err) {
        console.error("IP location failed:", err);
        alert("Location detect nahi ho saki. PIN code manually bharein.");
      } finally {
        setDetectingLocation(false);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );

          const data = await res.json();
          const addr = data.address || {};

          const autoPincode = addr.postcode || "";

          const autoCity =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.county ||
            addr.district ||
            "";

          const autoStreet = [
            addr.suburb,
            addr.neighbourhood,
            addr.road,
          ]
            .filter(Boolean)
            .join(", ");

          setAddressForm((prev) => ({
            ...prev,
            pincode:
              autoPincode.replace(/\D/g, "").slice(0, 6) ||
              prev.pincode,
            city: autoCity || prev.city,
            state: addr.state || prev.state,
            street: autoStreet
              ? `${prev.street ? prev.street + ", " : ""}${autoStreet}`
              : prev.street,
          }));
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          fallbackToIP();
          return;
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("GPS failed:", err.message);
        fallbackToIP();
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  // SAVE ADDRESS
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[0-9]{10}$/.test(addressForm.phone.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!/^[0-9]{6}$/.test(addressForm.pincode.trim())) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }

    try {
      setSavingAddress(true);

      const payload = {
        label: addressForm.label,
        receiverName:
          addressForm.receiverName.trim() ||
          user?.name ||
          "Customer",
        receiverPhone: addressForm.phone.trim(),
        streetAddress: addressForm.street.trim(),
        landmark: addressForm.landmark.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        isDefault: addressForm.isDefault,
      };

      let savedAddrId = null;

      if (editingAddressId) {
        const res = await api.put(
          `/addresses/updateAddress/${editingAddressId}`,
          payload
        );

        savedAddrId = res.data?.address?._id || editingAddressId;
      } else {
        const res = await api.post(
          "/addresses/addAddress",
          payload
        );

        savedAddrId =
          res.data?.address?._id ||
          res.data?.data?._id;
      }

      setShowAddressModal(false);
      setEditingAddressId(null);

      await fetchAddresses();

      if (savedAddrId) {
        setSelectedAddressId(String(savedAddrId));
      }

      setAddressForm({
        ...emptyAddressForm,
        receiverName: user?.name || user?.firstName || "",
        phone: user?.phone || "",
      });
    } catch (err) {
      console.error("Save address failed:", err);

      setError(
        err.response?.data?.message || "Failed to save address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  // DELETE ADDRESS
  const handleDeleteAddress = async (e, addressId) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      setDeletingId(addressId);

      await api.delete(`/addresses/delete/${addressId}`);

      await fetchAddresses();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to delete address."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ORDER PAYLOAD
  const prepareOrderPayload = () => {
    const formattedItems = cartItems.map((item) => {
      const price = Number(
        item.price ??
          item.discountPrice ??
          item.sellingPrice ??
          0
      );

      const qty = Number(item.quantity || 1);

      return {
        product: item._id,
        variant: item.variantId || null,
        variantId: item.variantId || item._id,
        name: item.name || item.title || "Grocery Item",
        unit: item.unit || "",
        price,
        quantity: qty,
        subtotal: price * qty,
      };
    });

    const calculatedSubtotal = formattedItems.reduce(
      (acc, curr) => acc + curr.subtotal,
      0
    );

    const resolvedStoreId =
      selectedStore?._id ||
      selectedStore?.id ||
      cartItems[0]?.storeId ||
      cartItems[0]?.store;

    return {
      storeId: resolvedStoreId,
      store: resolvedStoreId,
      addressId: selectedAddressId,
      items: formattedItems,
      itemTotal: calculatedSubtotal,
      subtotal: calculatedSubtotal,
      deliveryFee: 0,
      handlingFee: 0,
      tax: 0,
      discount: 0,
      totalAmount: Number(totalAmount || calculatedSubtotal),
    };
  };

  // RAZORPAY PAYMENT
  const handleOnlineRazorpayPayment = async (orderPayload) => {
    if (typeof window.Razorpay === "undefined") {
      setError("Razorpay SDK load nahi hua. Please page refresh karein.");
      setPlacingOrder(false);
      return;
    }

    try {
      const res = await api.post(
        "/payment/razorpay/create-order",
        {
          amount: orderPayload.totalAmount,
        }
      );

      const { order: razorpayOrder, keyId } = res.data;

      const options = {
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,

        name: "ElibCart",
        description: "Secure Payment for Your Grocery Order",
        order_id: razorpayOrder.id,

        prefill: {
          name: user?.name || user?.firstName || "Customer",
          email: user?.email || "",
          contact: user?.phone || "",
        },

        theme: {
          color: "#7c3aed",
          backdrop_color: "#17132b",
        },

        modal: {
          backdropclose: false,
          escape: true,
          animation: true,

          ondismiss: () => {
            setPlacingOrder(false);
          },
        },

        handler: async (response) => {
          try {
            setPlacingOrder(true);

            const verifyRes = await api.post(
              "/payment/razorpay/verify",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderDetails: orderPayload,
              }
            );

            const createdOrder = verifyRes.data?.order;

            if (clearCart) clearCart();

            setOrderSuccess(
              createdOrder?.orderNumber ||
                createdOrder?.orderId ||
                createdOrder?._id ||
                "CONFIRMED"
            );
          } catch (err) {
            console.error("Verification error:", err);

            setError(
              err.response?.data?.message ||
                "Payment verification failed."
            );
          } finally {
            setPlacingOrder(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on("payment.failed", (response) => {
        setError(
          response.error?.description ||
            "Payment failed in test mode."
        );

        setPlacingOrder(false);
      });

      rzpInstance.open();
    } catch (err) {
      console.error("Razorpay Init Error:", err);

      setError(
        err.response?.data?.message ||
          "Online payment initiate nahi ho saka."
      );

      setPlacingOrder(false);
    }
  };

  // PLACE ORDER
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const orderPayload = prepareOrderPayload();

    if (!orderPayload.storeId) {
      setError("Delivery store is missing. Please select your delivery location again.");
      return;
    }

    setPlacingOrder(true);

    if (selectedPaymentMethod === "ONLINE") {
      await handleOnlineRazorpayPayment(orderPayload);
      return;
    }

    try {
      const res = await api.post("/orders", {
        ...orderPayload,
        paymentMethod: "COD",
      });

      const order =
        res.data?.order ||
        res.data?.data ||
        res.data;

      if (clearCart) clearCart();

      setOrderSuccess(
        order?.orderNumber ||
          order?.orderId ||
          order?._id ||
          "CONFIRMED"
      );
    } catch (err) {
      console.error("Order error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to place COD order."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // ADDRESS ICON
  const getLabelIcon = (label) => {
    switch (label?.toLowerCase()) {
      case "home":
        return <Home size={16} />;
      case "work":
        return <Briefcase size={16} />;
      case "office":
        return <Building2 size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  // AUTH LOADING
  if (authLoading) {
    return (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-[#f7f8ff]">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </main>
    );
  }

  // LOGIN REQUIRED
  if (!user) {
    return (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-[#f7f8ff] px-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <ShieldCheck size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
            Login required
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Please log in before proceeding to checkout. Your cart items will remain saved.
          </p>

          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3.5 font-bold text-white shadow-lg transition hover:opacity-90"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  // ORDER SUCCESS
  if (orderSuccess) {
    return (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-[#f7f8ff] px-5">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 size={48} />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Order Placed Successfully!
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Your order has been confirmed and is being packed.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Order ID
            </p>

            <p className="mt-2 break-all font-mono text-sm font-bold text-slate-900">
              {orderSuccess}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-sm text-slate-500">Payment Mode</span>
              <span className="text-sm font-bold text-violet-600">
                {selectedPaymentMethod === "ONLINE" ? "Online (Prepaid)" : "Cash on Delivery"}
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push("/account?tab=orders")}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            >
              Track Order / View Orders
            </button>

            <button
              type="button"
              onClick={() => router.push("/account")}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      {/* MAIN PAGE - NO SCROLL */}
      <main className="h-screen w-full overflow-hidden bg-[#f7f8ff] text-slate-800">

        {/* HEADER */}
        <header className="h-[62px] border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-4 sm:px-8 lg:px-12">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg">
                <ShoppingBag size={21} />
              </span>

              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Elib<span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">Cart</span>
              </span>
            </button>

            <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 sm:text-sm">
              <ShieldCheck size={16} />
              Secure Checkout
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="mx-auto h-[calc(100vh-62px)] w-full max-w-[1600px] overflow-hidden px-4 py-3 sm:px-8 lg:px-12">

          <button
            type="button"
            onClick={() => router.back()}
            className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-violet-600"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* TITLE */}
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[9px] font-bold tracking-[0.15em] text-violet-600">
                <Sparkles size={12} />
                ALMOST THERE
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Checkout
              </h1>

              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                Choose your delivery address and payment method.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 md:flex">
              <LockKeyhole size={14} />
              Safe & Secure Payment
            </div>
          </div>

          {/* EMPTY CART */}
          {cartItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                <ShoppingBag size={32} />
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-slate-900">
                Your cart is empty
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Add some products before proceeding to checkout.
              </p>

              <button
                type="button"
                onClick={() => router.push("/account")}
                className="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-7 py-3 font-bold text-white shadow-lg transition hover:opacity-90"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="grid h-[calc(100%-105px)] min-h-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_400px]">

              {/* LEFT COLUMN */}
              <div className="min-w-0 space-y-4">

                {/* DELIVERY ADDRESS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <MapPin size={19} />
                      </div>

                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900">
                          Delivery Address
                        </h2>
                        <p className="text-[10px] text-slate-500">
                          Select location ({addresses.length} saved)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-3.5 py-2 text-[11px] font-bold text-white shadow-md transition hover:opacity-90"
                    >
                      <Plus size={14} />
                      Add Address
                    </button>
                  </div>

                  {loadingAddresses ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 className="animate-spin text-violet-500" size={25} />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                      <MapPin size={25} className="mx-auto text-slate-400" />
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        No saved addresses found
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Add a delivery address to continue.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-2 text-xs font-bold text-violet-600"
                      >
                        + Add your first address
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {addresses.map((addr) => {
                        const addrId = String(addr._id || addr.id);
                        const isSelected = selectedAddressId === addrId;
                        const isDeleting = deletingId === addrId;

                        return (
                          <div
                            key={addrId}
                            onClick={() => setSelectedAddressId(addrId)}
                            className={`relative cursor-pointer rounded-xl border p-3 transition ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-50"
                                : "border-slate-200 bg-white hover:border-violet-200"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                  isSelected ? "bg-cyan-100 text-cyan-700" : "bg-violet-50 text-violet-600"
                                }`}>
                                  {getLabelIcon(addr.label)}
                                </span>

                                <span className="text-xs font-extrabold capitalize text-slate-800">
                                  {addr.label || "Home"}
                                </span>

                                {addr.isDefault && (
                                  <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-700">
                                    Default
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {isSelected && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEdit(e, addr)}
                                  title="Edit address"
                                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-100 hover:text-violet-600"
                                >
                                  <Pencil size={13} />
                                </button>

                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={(e) => handleDeleteAddress(e, addrId)}
                                  title="Delete address"
                                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="text-xs font-bold text-slate-800">
                              {addr.receiverName || user?.name}
                            </p>

                            <p className="mt-1 text-[10px] leading-4 text-slate-600">
                              {addr.streetAddress || addr.street}
                              {addr.landmark ? `, Near ${addr.landmark}` : ""}
                              {`, ${addr.city}, ${addr.state} - ${addr.pincode || addr.postalCode}`}
                            </p>

                            <div className="mt-2 border-t border-slate-100 pt-2">
                              <p className="text-[10px] font-semibold text-slate-500">
                                Phone: {addr.receiverPhone || addr.phone}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* PAYMENT METHOD */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                      <CreditCard size={19} />
                    </div>

                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Payment Method
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        Select your preferred payment mode
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        selectedPaymentMethod === "COD"
                          ? "border-cyan-400 bg-cyan-50"
                          : "border-slate-200 bg-white hover:border-cyan-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={selectedPaymentMethod === "COD"}
                        onChange={() => setSelectedPaymentMethod("COD")}
                        className="mt-1 h-4 w-4 accent-cyan-600"
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <Banknote size={17} className="text-emerald-600" />
                          <span className="text-xs font-extrabold text-slate-800">
                            Cash on Delivery
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] leading-4 text-slate-500">
                          Pay cash or UPI directly to the delivery partner.
                        </p>

                        <span className="mt-1.5 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                          Pay on delivery
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        selectedPaymentMethod === "ONLINE"
                          ? "border-violet-400 bg-violet-50"
                          : "border-slate-200 bg-white hover:border-violet-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="ONLINE"
                        checked={selectedPaymentMethod === "ONLINE"}
                        onChange={() => setSelectedPaymentMethod("ONLINE")}
                        className="mt-1 h-4 w-4 accent-violet-600"
                      />

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Smartphone size={17} className="text-violet-600" />
                          <span className="text-xs font-extrabold text-slate-800">
                            Online Pay
                          </span>
                          <span className="rounded bg-violet-100 px-1.5 py-1 text-[8px] font-extrabold text-violet-700">
                            TEST MODE
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] leading-4 text-slate-500">
                          PhonePe, Google Pay, UPI, NetBanking or Cards.
                        </p>

                        <span className="mt-1.5 inline-flex rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-700">
                          Online payment
                        </span>
                      </div>
                    </label>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN - ORDER SUMMARY */}
              <aside className="min-w-0 lg:sticky lg:top-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Order Summary
                      </h2>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Package size={19} />
                    </div>
                  </div>

                  {/* CART ITEMS */}
                  <div className="mt-3 space-y-2.5">
                    {cartItems.map((item) => {
                      const itemId = String(item.variantId || item._id);

                      const price = Number(
                        item.price ??
                          item.discountPrice ??
                          item.sellingPrice ??
                          0
                      );

                      return (
                        <div
                          key={`${item._id}-${itemId}`}
                          className="flex gap-2.5"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            {item.image || item.images?.[0]?.url ? (
                              <img
                                src={item.image || item.images?.[0]?.url}
                                alt={item.name || "Product"}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <ShoppingBag size={19} className="text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-bold text-slate-800">
                              {item.name || "Product"}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-500">
                              ₹{price.toFixed(2)} each
                            </p>

                            <div className="mt-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(itemId)}
                                  className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-violet-50"
                                >
                                  <Minus size={11} />
                                </button>

                                <span className="min-w-3 text-center text-[10px] font-bold text-slate-800">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => addToCart(item)}
                                  className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-violet-50"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => deleteFromCart(itemId)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* PRICE DETAILS */}
                  <div className="my-3 border-t border-dashed border-slate-200" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-800">
                        ₹{Number(totalAmount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Delivery Fee</span>
                      <span className="font-bold text-emerald-600">FREE</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Handling Fee</span>
                      <span className="font-semibold text-slate-800">₹0.00</span>
                    </div>
                  </div>

                  <div className="my-3 border-t border-slate-200" />

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Total Amount
                      </p>
                      <p className="mt-1 text-[9px] text-slate-400">
                        Inclusive of all charges
                      </p>
                    </div>

                    <span className="text-xl font-extrabold text-slate-900">
                      ₹{Number(totalAmount).toFixed(2)}
                    </span>
                  </div>

                  {/* ERROR */}
                  {error && !showAddressModal && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[10px] leading-4 text-rose-600">
                      {error}
                    </div>
                  )}

                  {/* PLACE ORDER */}
                  <button
                    type="button"
                    disabled={
                      placingOrder ||
                      !selectedAddressId ||
                      cartItems.length === 0
                    }
                    onClick={handlePlaceOrder}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 py-3 text-xs font-extrabold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {placingOrder ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : selectedPaymentMethod === "ONLINE" ? (
                      <>
                        <CreditCard size={16} />
                        Pay Online
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={16} />
                        Place Order
                      </>
                    )}
                  </button>

                  <div className="mt-2.5 flex gap-2 rounded-xl border border-cyan-100 bg-cyan-50/70 p-2.5">
                    {selectedPaymentMethod === "ONLINE" ? (
                      <CreditCard size={15} className="shrink-0 text-cyan-700" />
                    ) : (
                      <Truck size={15} className="shrink-0 text-cyan-700" />
                    )}

                    <p className="text-[9px] leading-4 text-slate-600">
                      {selectedPaymentMethod === "ONLINE"
                        ? "Razorpay test gateway is enabled. Use the test payment flow to simulate order completion."
                        : "Pay cash or UPI directly to the delivery partner when your groceries arrive."}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[9px] font-semibold text-slate-400">
                    <LockKeyhole size={12} className="text-emerald-500" />
                    Secure and encrypted checkout
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* ADDRESS MODAL - NO SCROLL */}
        {showAddressModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/55 p-2 backdrop-blur-sm sm:p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseForm();
              }
            }}
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl sm:rounded-3xl">

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-cyan-50 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-md">
                    <MapPin size={19} />
                  </div>

                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
                      {editingAddressId ? "Edit Address" : "Add New Address"}
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      Enter your delivery details
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingAddress}
                  onClick={handleCloseForm}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                >
                  <X size={17} />
                </button>
              </div>

              {/* MODAL FORM - NO OVERFLOW / NO SCROLL */}
              <form
                onSubmit={handleSaveAddress}
                className="overflow-hidden p-3.5 sm:p-5"
              >
                {/* ADDRESS TYPE */}
                <div className="mb-3">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-extrabold text-slate-700">
                      Address Type
                    </label>

                    <button
                      type="button"
                      disabled={detectingLocation}
                      onClick={handleDetectCurrentLocation}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[9px] font-bold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
                    >
                      {detectingLocation ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Navigation size={12} />
                      )}

                      {detectingLocation ? "Detecting..." : "Use Current Location"}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {["Home", "Work", "Office", "Other"].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() =>
                          setAddressForm((prev) => ({
                            ...prev,
                            label: lbl,
                          }))
                        }
                        className={`rounded-lg border px-2 py-2 text-[10px] font-bold transition sm:text-xs ${
                          addressForm.label === lbl
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-violet-200"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FORM INPUTS */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">

                  {/* RECEIVER NAME */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      Receiver Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={addressForm.receiverName}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          receiverName: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  {/* PHONE */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  {/* STREET */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      House / Flat / Building / Street
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="House number, building, street"
                      value={addressForm.street}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          street: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  {/* LANDMARK */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Near Metro Station / City Mall"
                      value={addressForm.landmark}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          landmark: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  {/* PINCODE */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      PIN Code
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6-digit PIN code"
                        value={addressForm.pincode}
                        onChange={handlePincodeChange}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                      />

                      {fetchingPincode && (
                        <Loader2
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-violet-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* CITY */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  {/* STATE */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={addressForm.state}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                </div>

                {/* DEFAULT ADDRESS */}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[10px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        isDefault: e.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded accent-violet-600"
                  />
                  Make this my default address
                </label>

                {/* MODAL ERROR */}
                {error && (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-600">
                    {error}
                  </div>
                )}

                {/* BUTTONS */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-[11px] font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                  >
                    {savingAddress && (
                      <Loader2 size={14} className="animate-spin" />
                    )}

                    {savingAddress
                      ? "Saving..."
                      : editingAddressId
                      ? "Update Address"
                      : "Save Address"}
                  </button>

                  <button
                    type="button"
                    disabled={savingAddress}
                    onClick={handleCloseForm}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
