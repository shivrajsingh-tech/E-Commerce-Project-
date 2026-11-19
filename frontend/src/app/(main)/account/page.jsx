"use client";

import AccountSidebar from "@/components/AccountSidebar";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  LogOut,
  Loader2,
  PackageOpen,
  Heart,
  Zap,
  ChevronRight,
  ArrowRight,
  Package,
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  X,
  LocateFixed,
  MapPinned,
  Check,
  AlertCircle,
  Sparkles,
  Menu,
} from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";
import { useWishlist } from "@/context/wishlistContext";
import CartDrawer from "@/components/CartDrawer";
import BannerSlider from "@/components/BannerSlider";
import toast from "react-hot-toast";

const LOCATION_KEY = "elibcart_location";

const getDisplayName = (value) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object") {
    return value.name || value.title || value.label || value.unit || "";
  }
  return "";
};

const getId = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    return String(item._id || item.id || "");
  }
  return String(item);
};

const getImageUrl = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.secure_url || "";
};

const getProductImage = (product) => {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
  return getImageUrl(firstImage) || getImageUrl(product?.image) || "";
};

const getVariantImage = (variant, product) => {
  const firstVariantImage = Array.isArray(variant?.images) ? variant.images[0] : null;
  return getImageUrl(firstVariantImage) || getProductImage(product);
};

const getVariantDetails = (product, variant) => {
  const originalPrice = Number(
    variant?.mrp ?? variant?.originalPrice ?? product?.mrp ?? product?.price ?? 0
  );
  const finalPrice = Number(
    variant?.sellingPrice ?? variant?.discountPrice ?? product?.sellingPrice ?? product?.discountPrice ?? originalPrice
  );
  const discountPercentage =
    originalPrice > finalPrice && originalPrice > 0
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : Number(variant?.discountPercentage || 0);

  return {
    variantId: String(variant?._id || product?._id),
    price: finalPrice,
    originalPrice,
    discountPercentage,
    unit: variant?.name || (variant?.unit ? `${variant.unitValue || 1} ${variant.unit}` : "1 item"),
    image: getVariantImage(variant, product),
    availableQuantity: Number(variant?.availableQuantity ?? product?.availableQuantity ?? 0),
  };
};

const getStoreList = (data) => {
  if (Array.isArray(data?.stores)) return data.stores;
  if (Array.isArray(data?.data?.stores)) return data.data.stores;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const getEligibleStores = (stores) => {
  if (!Array.isArray(stores)) return [];
  return stores
    .filter((store) => {
      const radius = Number(store?.serviceRadius);
      const distance = Number(store?.distanceInMeters);

      return (
        Boolean(store?._id) &&
        String(store?.status || "").toLowerCase() === "active" &&
        !store?.isDeleted &&
        Number.isFinite(radius) &&
        radius >= 0.1 &&
        Number.isFinite(distance) &&
        distance >= 0 &&
        distance <= radius * 1000
      );
    })
    .sort((a, b) => Number(a.distanceInMeters) - Number(b.distanceInMeters));
};

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, logout, loading: authLoading } = useAuth();
  const { cartItems, addToCart, removeFromCart, totalItems } = useCart();
  const { toggleWishlist, isWishlisted, totalWishlist } = useWishlist();

  const [activeTab, setActiveTab] = useState("shop");

  // Sidebar States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarInitialTab, setSidebarInitialTab] = useState("profile");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");

  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cartLoading, setCartLoading] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState("");

  // LOCATION STATES
  const [location, setLocation] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [pincode, setPincode] = useState("");
  const [manualArea, setManualArea] = useState("");
  const [manualLandmark, setManualLandmark] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");

  // VARIANT POPUP STATES
  const [isVariantOpen, setIsVariantOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [variantAction, setVariantAction] = useState("cart");

  useEffect(() => {
    if (searchParams.get("tab") === "orders") {
      setActiveTab("orders");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  const clearPreviousLocation = () => {
    setLocation(null);
    setSelectedStore(null);
    setProducts([]);
    localStorage.removeItem(LOCATION_KEY);
  };

  const saveLocation = (locationData, store) => {
    setProducts([]);
    setLoading(true);

    const savedData = {
      ...locationData,
      store,
      savedAt: Date.now(),
    };

    localStorage.setItem(LOCATION_KEY, JSON.stringify(savedData));

    setLocation(savedData);
    setSelectedStore(store);

    setLocationModalOpen(false);
    setLocationError("");
  };

  useEffect(() => {
    let isMounted = true;

    const restoreSavedLocation = async () => {
      try {
        const savedLocation = localStorage.getItem(LOCATION_KEY);

        if (!savedLocation) {
          if (isMounted) setLocationModalOpen(true);
          return;
        }

        const parsed = JSON.parse(savedLocation);

        // Expire saved location after 12 hours — prevents a stale GPS fix
        // from a previous trip/city being silently reused
        const LOCATION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
        const savedAt = parsed?.savedAt ? Number(parsed.savedAt) : 0;
        const isExpired = Date.now() - savedAt > LOCATION_TTL_MS;

        if (isExpired) {
          clearPreviousLocation();
          if (isMounted) setLocationModalOpen(true);
          return;
        }

        const latitude = Number(parsed.latitude);
        const longitude = Number(parsed.longitude);

        const validCoordinates =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180;

        if (!validCoordinates) {
          clearPreviousLocation();
          if (isMounted) setLocationModalOpen(true);
          return;
        }

        const response = await api.get("/stores/nearby", {
          params: { lat: latitude, lng: longitude },
          timeout: 15000,
        });

        if (!isMounted) return;

        const stores = getStoreList(response.data);
        const availableStores = getEligibleStores(stores);

        if (availableStores.length === 0) {
          clearPreviousLocation();
          if (isMounted) {
            setLocationModalOpen(true);
            setLocationError(
              "Sorry! No store delivers to your saved location. Please select another location."
            );
          }
          return;
        }

        const nearestStore = availableStores[0];
        const updatedLocation = {
          ...parsed,
          latitude,
          longitude,
          store: nearestStore,
          savedAt: Date.now(),
        };

        localStorage.setItem(LOCATION_KEY, JSON.stringify(updatedLocation));

        setLocation(updatedLocation);
        setSelectedStore(nearestStore);

        setPincode(parsed.pincode || "");
        setManualArea(parsed.area || "");
        setManualLandmark(parsed.landmark || "");
        setManualCity(parsed.city || "");
        setManualState(parsed.state || "");

        setLocationModalOpen(false);
        setLocationError("");
      } catch (err) {
        console.error("Saved location verification failed:", err);
        if (isMounted) {
          clearPreviousLocation();
          setLocationModalOpen(true);
          setLocationError("Unable to verify saved location. Please select again.");
        }
      }
    };

    restoreSavedLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadMetadata = async () => {
      try {
        const [cRes, sRes, bRes, oRes] = await Promise.allSettled([
          api.get("/categories/active", { timeout: 15000 }),
          api.get("/subcategories/active", { timeout: 15000 }),
          api.get("/banners/get-active-banners", { timeout: 15000 }),
          api.get("/orders/my-orders", { timeout: 15000 }),
        ]);

        if (!isMounted) return;

        if (cRes.status === "fulfilled") {
          const d = cRes.value?.data;
          setCategories(d?.categories || d?.data || d || []);
        }

        if (sRes.status === "fulfilled") {
          const d = sRes.value?.data;
          setSubCategories(d?.subcategories || d?.subCategories || d?.data || d || []);
        }

        if (bRes.status === "fulfilled") {
          const d = bRes.value?.data;
          const rawList = d?.banners || d?.data || d || [];
          setBanners(
            rawList.filter(
              (b) =>
                String(b?.status || "active").toLowerCase() === "active" &&
                !b?.isDeleted
            )
          );
        }

        if (oRes.status === "fulfilled") {
          const d = oRes.value?.data;
          setOrders(d?.orders || d?.data || d || []);
        }
      } catch (err) {
        console.error("Account metadata failed:", err);
      }
    };

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const fetchStoreProducts = async () => {
      if (!selectedStore?._id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setProducts([]);

      try {
        const res = await api.get("/products", {
          params: {
            storeId: selectedStore._id,
          },
          timeout: 15000,
        });

        if (!isMounted) return;

        const d = res.data;
        const fetchedList = d?.products || d?.data || d || [];
        setProducts(Array.isArray(fetchedList) ? fetchedList : []);
      } catch (err) {
        console.error("Store products fetch error in account:", err);
        if (isMounted) {
          setProducts([]);
          setError("Unable to load inventory for this store.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStoreProducts();

    return () => {
      isMounted = false;
    };
  }, [selectedStore?._id]);

  const findNearbyStore = async (latitude, longitude, addressData) => {
    try {
      setLocationLoading(true);
      setLocationError("");

      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        setLocationError("Invalid location coordinates.");
        return false;
      }

      clearPreviousLocation();

      const res = await api.get("/stores/nearby", {
        params: { lat, lng },
        timeout: 15000,
      });

      const stores = getStoreList(res.data);
      const availableStores = getEligibleStores(stores);

      if (availableStores.length === 0) {
        clearPreviousLocation();
        setLocationError("Sorry! No store delivers to this location.");
        return false;
      }

      const nearestStore = availableStores[0];
      saveLocation(
        {
          ...addressData,
          latitude: lat,
          longitude: lng,
        },
        nearestStore
      );

      return true;
    } catch (err) {
      console.error("Nearby store error:", err);
      clearPreviousLocation();
      setLocationError(
        err.response?.data?.message || "Unable to find a nearby store. Please try again."
      );
      return false;
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) throw new Error("Unable to fetch address");

          const data = await response.json();
          const address = data.address || {};

          const addressData = {
            label:
              address.suburb ||
              address.neighbourhood ||
              address.city_district ||
              address.city ||
              "Current Location",
            area: address.suburb || address.neighbourhood || address.city_district || "",
            landmark: "",
            city: address.city || address.town || address.village || "",
            district: address.county || "",
            state: address.state || "",
            pincode: address.postcode || "",
            address: data.display_name || "",
            source: "gps",
          };

          await findNearbyStore(latitude, longitude, addressData);
        } catch (err) {
          console.error("GPS address error:", err);
          setLocationError("Unable to detect your address.");
          setLocationLoading(false);
        }
      },
      (err) => {
        console.error("GPS error:", err);
        setLocationLoading(false);
        setLocationError("Please allow location permission to continue.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handlePincodeLookup = async () => {
    const cleanPin = pincode.trim();
    if (!/^[0-9]{6}$/.test(cleanPin)) {
      setLocationError("Please enter a valid 6-digit PIN code.");
      return;
    }

    try {
      setLocationLoading(true);
      setLocationError("");

      const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
      const data = await response.json();

      if (
        !Array.isArray(data) ||
        data[0]?.Status !== "Success" ||
        !data[0]?.PostOffice?.length
      ) {
        setLocationError("Invalid PIN code. Please check again.");
        setLocationLoading(false);
        return;
      }

      const postOffice = data[0].PostOffice[0];
      setManualCity(postOffice.Block || postOffice.District || "");
      setManualState(postOffice.State || "");

      if (!manualArea) {
        setManualArea(postOffice.Name || "");
      }

      setLocationLoading(false);
    } catch (err) {
      console.error("Pincode lookup error:", err);
      setLocationError("Unable to verify PIN code.");
      setLocationLoading(false);
    }
  };

  const handleManualLocation = async () => {
    if (!manualCity.trim() || !manualState.trim()) {
      setLocationError("Please enter city and state.");
      return;
    }

    const cleanPin = pincode.trim();
    if (cleanPin && !/^[0-9]{6}$/.test(cleanPin)) {
      setLocationError("Please enter a valid 6-digit PIN code.");
      return;
    }

    try {
      setLocationLoading(true);
      setLocationError("");

      const query = [manualArea, manualLandmark, manualCity, manualState, cleanPin, "India"]
        .filter(Boolean)
        .join(", ");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!data.length) {
        setLocationError("Location not found. Please check details.");
        setLocationLoading(false);
        return;
      }

      const latitude = Number(data[0].lat);
      const longitude = Number(data[0].lon);

      await findNearbyStore(latitude, longitude, {
        label: manualArea || manualCity,
        area: manualArea,
        landmark: manualLandmark,
        city: manualCity,
        state: manualState,
        pincode: cleanPin,
        address: data[0].display_name || "",
        source: "manual",
      });
    } catch (err) {
      console.error("Manual location error:", err);
      setLocationError("Unable to search this location.");
      setLocationLoading(false);
    }
  };

  const fetchOrdersOnly = async () => {
    try {
      setOrdersLoading(true);
      const res = await api.get("/orders/my-orders", { timeout: 15000 });
      const data = res.data;
      setOrders(Array.isArray(data?.orders) ? data.orders : data?.data || []);
    } catch (err) {
      console.error("Order refresh failed:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      setCancellingId(orderId);
      await api.patch(`/orders/${orderId}/cancel`, {
        cancellationReason: "Cancelled by customer from account",
        reason: "Cancelled by customer from account",
      });
      await fetchOrdersOnly();
    } catch (err) {
      toast.error(err.response?.data?.message || "Order cancel failed.");
    } finally {
      setCancellingId(null);
    }
  };

  const displayedBanners = useMemo(() => {
    if (!Array.isArray(banners) || banners.length === 0) return [];

    if (selectedCategory === "all") {
      const globalBanners = banners.filter((b) => !b.category || b.category === "null");
      return globalBanners.length > 0 ? globalBanners : banners;
    }

    const specific = banners.filter((b) => getId(b.category) === String(selectedCategory));
    if (specific.length > 0) return specific;

    const fallbackGlobal = banners.filter((b) => !b.category || b.category === "null");
    return fallbackGlobal.length > 0 ? fallbackGlobal : banners;
  }, [banners, selectedCategory]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === "all") return [];
    return subCategories.filter((sub) => getId(sub.category) === String(selectedCategory));
  }, [subCategories, selectedCategory]);

  const handleCategoryClick = (categoryId) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory("all");
      setSelectedSubCategory("all");
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubCategory("all");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText = search.trim().toLowerCase();
      const productName = getDisplayName(product.name).toLowerCase();
      const brandName = getDisplayName(product.brand).toLowerCase();

      const matchesSearch =
        !searchText || productName.includes(searchText) || brandName.includes(searchText);

      const matchesCategory =
        selectedCategory === "all" || getId(product.category) === String(selectedCategory);

      const matchesSubCategory =
        selectedSubCategory === "all" || getId(product.subCategory) === String(selectedSubCategory);

      const isAvailable =
        product.status !== "inactive" && product.isActive !== false && !product.isDeleted;

      return matchesSearch && matchesCategory && matchesSubCategory && isAvailable;
    });
  }, [products, search, selectedCategory, selectedSubCategory]);

  const getProductVariants = (product) => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return product.variants.filter(
        (variant) => variant && variant.status !== "inactive" && !variant.isDeleted
      );
    }
    return [null];
  };

  const getCartItem = (product, details) => {
    return cartItems.find(
      (item) =>
        String(item._id) === String(product._id) &&
        String(item.variantId || item._id) === String(details.variantId)
    );
  };

  const navigateToProductDetails = (product) => {
    const slug = product.slug || product._id;
    router.push(`/products/${slug}`);
  };

  const openVariantPopup = (e, product, action) => {
    e.stopPropagation();
    if (!location || !selectedStore) {
      setLocationError("Please select your delivery location first.");
      setLocationModalOpen(true);
      return;
    }

    const variants = getProductVariants(product);
    const initialVariant = variants[0] || null;
    const details = getVariantDetails(product, initialVariant);

    if (details.availableQuantity <= 0) {
      toast.error("This item is currently out of stock!");
      return;
    }

    setSelectedProduct(product);
    setSelectedVariant(initialVariant);
    setSelectedQuantity(1);
    setVariantAction(action);
    setIsVariantOpen(true);
  };

  const handleConfirmVariant = () => {
    if (!selectedProduct || !selectedStore) {
      setIsVariantOpen(false);
      setLocationModalOpen(true);
      return;
    }

    const details = getVariantDetails(selectedProduct, selectedVariant);
    const maxStock = Number(details.availableQuantity || 0);

    if (maxStock <= 0) {
      toast.error("Product is currently out of stock in this store.");
      return;
    }

    const existingCartItem = cartItems.find(
      (item) => String(item.variantId || item._id) === String(details.variantId)
    );
    const alreadyInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (alreadyInCart + selectedQuantity > maxStock) {
      toast.error(`Only ${maxStock} units available. You already have ${alreadyInCart} in your cart.`);
      return;
    }

    if (!details.price || details.price <= 0) {
      toast.error("Product pricing is unavailable for this store.");
      return;
    }

    setCartLoading(String(selectedProduct._id));

    try {
      addToCart({
        ...selectedProduct,
        _id: String(selectedProduct._id),
        variantId: details.variantId,
        price: details.price,
        unit: details.unit,
        image: details.image,
        storeId: getId(selectedStore),
        availableQuantity: maxStock,
        quantity: selectedQuantity,
      });

      setIsVariantOpen(false);

      if (variantAction === "buy") {
        router.push("/checkout");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
    } finally {
      setCartLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace("/");
    }
  };

  const handleCheckout = () => {
    if (!location || !selectedStore) {
      setIsCartOpen(false);
      setLocationError("Please select your delivery location first.");
      setLocationModalOpen(true);
      return;
    }

    router.push("/checkout");
  };

  const getOrderStatusBadge = (status) => {
    const st = String(status || "placed").toLowerCase();

    switch (st) {
      case "placed":
        return (
          <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200 px-3 py-1 text-xs font-bold">
            Order Placed
          </span>
        );
      case "packing":
      case "confirmed":
        return (
          <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-bold">
            Processing
          </span>
        );
      case "out_for_delivery":
        return (
          <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-xs font-bold flex items-center gap-1">
            <Truck size={13} /> Out for Delivery
          </span>
        );
      case "delivered":
        return (
          <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 size={13} /> Delivered
          </span>
        );
      case "cancelled":
        return (
          <span className="rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 text-xs font-bold flex items-center gap-1">
            <XCircle size={13} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 text-slate-800 px-3 py-1 text-xs font-bold uppercase">
            {status}
          </span>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 pb-32 text-slate-900 w-full overflow-x-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-xl w-full">
        <div className="w-full flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSidebarInitialTab("profile");
                setIsSidebarOpen(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Open Menu"
            >
              <Menu size={22} />
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex shrink-0 items-center gap-2.5 cursor-pointer"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-200">
                <ShoppingBag size={22} />
              </span>
              <span className="text-xl font-extrabold tracking-tight">
                Elib<span className="text-violet-600">Cart</span>
              </span>
            </button>
          </div>

          <div className="hidden max-w-xl flex-1 md:block px-4">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groceries, brands, and daily essentials..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 shadow-inner"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLocationError("");
                setLocationModalOpen(true);
              }}
              className="flex max-w-xs items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-left transition hover:bg-violet-100 cursor-pointer shadow-2xs"
            >
              <MapPin size={18} className="shrink-0 text-violet-600" />
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold text-slate-500">
                  Delivering to
                </span>
                <span className="block truncate text-xs font-bold text-slate-800">
                  {location?.label || location?.area || "Select Location"}
                </span>
              </span>
            </button>

            <div className="flex items-center rounded-xl bg-slate-100 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("shop")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "shop"
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Store
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("orders");
                  fetchOrdersOnly();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} />
                My Orders
                {orders.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] text-white">
                    {orders.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/wishlist")}
              title="My Wishlist"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer shadow-2xs"
            >
              <Heart
                size={19}
                className={totalWishlist > 0 ? "fill-rose-500 text-rose-500" : ""}
              />
              {totalWishlist > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-extrabold text-white shadow-xs">
                  {totalWishlist}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer shadow-2xs"
            >
              <LogOut size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white transition hover:bg-violet-700 cursor-pointer shadow-md shadow-slate-900/10"
            >
              <ShoppingCart size={19} />
              <span className="hidden text-sm font-semibold sm:inline">
                Cart
              </span>
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-extrabold text-slate-900 shadow-xs">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groceries..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 shadow-inner"
            />
          </div>
        </div>

        {activeTab === "shop" && (
          <div className="border-t border-slate-100 bg-white py-4 shadow-xs">
            <div className="w-full px-4 sm:px-8">
              <div className="flex items-center gap-5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedSubCategory("all");
                  }}
                  className="group flex flex-col items-center gap-2 shrink-0 cursor-pointer"
                >
                  <div
                    className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 transition duration-200 shadow-xs ${
                      selectedCategory === "all"
                        ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200 scale-105"
                        : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-violet-300 group-hover:bg-violet-50"
                    }`}
                  >
                    <Sparkles size={24} />
                  </div>
                  <span
                    className={`text-[11px] font-extrabold tracking-tight text-center truncate max-w-16 sm:max-w-20 ${
                      selectedCategory === "all" ? "text-violet-700" : "text-slate-600"
                    }`}
                  >
                    All Items
                  </span>
                </button>

                {categories.map((cat) => {
                  const catId = getId(cat);
                  const isSelected = selectedCategory === catId;
                  const catImage = getImageUrl(cat?.image) || getImageUrl(cat?.icon);

                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => handleCategoryClick(catId)}
                      className="group flex flex-col items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <div
                        className={`relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-full border-2 p-1.5 transition duration-200 shadow-xs ${
                          isSelected
                            ? "border-violet-600 bg-violet-50 shadow-md shadow-violet-200 scale-105"
                            : "border-slate-200/90 bg-slate-50 group-hover:border-violet-300 group-hover:bg-slate-100"
                        }`}
                      >
                        {catImage ? (
                          <img
                            src={catImage}
                            alt={getDisplayName(cat.name)}
                            className="h-full w-full rounded-full object-cover transition duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <PackageOpen size={24} className="text-slate-400" />
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-extrabold tracking-tight text-center truncate max-w-16 sm:max-w-20 ${
                          isSelected ? "text-violet-700" : "text-slate-600"
                        }`}
                      >
                        {getDisplayName(cat.name)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeSubCategories.length > 0 && (
                <div className="mt-4 flex items-center gap-2.5 overflow-x-auto border-t border-slate-100 pt-3.5 scrollbar-none">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                    <ChevronRight size={14} /> Subcategories:
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedSubCategory("all")}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                      selectedSubCategory === "all"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All
                  </button>

                  {activeSubCategories.map((sub) => {
                    const subId = getId(sub);
                    const isSelected = selectedSubCategory === subId;
                    const subImage = getImageUrl(sub?.image) || getImageUrl(sub?.icon);

                    return (
                      <button
                        key={subId}
                        type="button"
                        onClick={() => setSelectedSubCategory(subId)}
                        className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold transition cursor-pointer shadow-2xs ${
                          isSelected
                            ? "border-violet-600 bg-violet-50 text-violet-700 ring-2 ring-violet-200"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {subImage && (
                          <img
                            src={subImage}
                            alt={getDisplayName(sub.name)}
                            className="h-4 w-4 rounded-full object-cover"
                          />
                        )}
                        <span>{getDisplayName(sub.name)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MY ORDERS VIEW */}
      {activeTab === "orders" && (
        <section className="w-full px-4 sm:px-8 py-10 max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                My Orders
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Track your past purchases and live fulfillment status
              </p>
            </div>

            <button
              type="button"
              disabled={ordersLoading}
              onClick={fetchOrdersOnly}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {ordersLoading ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>

          {ordersLoading && orders.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center rounded-3xl bg-white shadow-xs">
              <Loader2 size={26} className="animate-spin text-violet-600" />
              <span className="ml-2 text-sm text-slate-500 font-medium">
                Fetching your orders...
              </span>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Package size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">
                No orders placed yet
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Discover fresh groceries in our catalog and place your first order.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("shop")}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-violet-700 cursor-pointer"
              >
                Browse Store Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((ord) => {
                const orderCode =
                  ord.orderNumber || ord.orderId || String(ord._id).slice(-8);

                const isCancelling = cancellingId === ord._id;

                const canCancel = [
                  "placed",
                  "packing",
                ].includes(String(ord.orderStatus || "").toLowerCase());

                return (
                  <div
                    key={ord._id}
                    className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-5 sm:px-8">
                      <div className="flex items-center gap-3.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <Package size={20} />
                        </span>

                        <div>
                          <p className="text-xs font-mono font-bold text-slate-800">
                            #{orderCode}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(ord.placedAt || ord.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {getOrderStatusBadge(ord.orderStatus)}
                        <span className="text-base font-extrabold text-slate-900">
                          ₹{Number(ord.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 sm:p-8 space-y-3.5">
                      {ord.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-2 w-2 rounded-full bg-violet-500" />
                            <span className="font-semibold text-slate-800">
                              {item.name || item.product?.name || "Product"}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({item.unit || "pack"})
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              x{item.quantity}
                            </span>
                          </div>

                          <span className="font-bold text-slate-900">
                            ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 p-5 sm:px-8 text-xs text-slate-600">
                      <div className="flex items-center gap-2 truncate max-w-md">
                        <MapPin size={16} className="text-violet-600 shrink-0" />
                        <span className="truncate font-medium">
                          {ord.deliveryAddress?.streetAddress || ord.address?.streetAddress}
                          {", "}
                          {ord.deliveryAddress?.city || ord.address?.city}
                          {" ("}
                          {ord.deliveryAddress?.pincode || ord.address?.pincode}
                          {")"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-medium">
                          Payment: <strong className="text-slate-800">{ord.paymentMethod || "COD"}</strong>
                        </span>

                        {canCancel && (
                          <button
                            type="button"
                            disabled={isCancelling}
                            onClick={() => handleCancelOrder(ord._id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {isCancelling ? "Cancelling..." : "Cancel Order"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* STORE CATALOG VIEW */}
      {activeTab === "shop" && (
        <>
          <div className="w-full px-4 sm:px-8 mt-6">
            {displayedBanners.length > 0 && (
              <BannerSlider banners={displayedBanners} />
            )}
          </div>

          <section className="w-full px-4 sm:px-8 py-10">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-violet-600">
                  Fresh picks for you
                </p>
                <h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl text-slate-900">
                  {selectedCategory === "all"
                    ? "Shop essentials"
                    : getDisplayName(
                        categories.find((c) => getId(c) === selectedCategory)?.name
                      ) || "Shop products"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  {filteredProducts.length} products available in this store
                </p>
              </div>

              {(search || selectedCategory !== "all" || selectedSubCategory !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setSelectedSubCategory("all");
                  }}
                  className="shrink-0 text-xs font-bold text-violet-700 hover:text-violet-900 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>

            {location && selectedStore && (
              <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm shadow-xs">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span className="font-bold text-emerald-800">
                  Delivery available
                </span>
                <span className="text-emerald-700 font-medium">
                  from {getDisplayName(selectedStore.name)}
                </span>
              </div>
            )}

            {!location || !selectedStore ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center shadow-xs">
                <MapPin size={40} className="mx-auto text-amber-600" />
                <p className="mt-4 font-extrabold text-slate-800 text-lg">
                  Select your delivery location
                </p>
                <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                  We check inventory specifically for your delivery store.
                </p>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="mt-5 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 cursor-pointer shadow-md shadow-violet-200"
                >
                  Select location
                </button>
              </div>
            ) : loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl bg-white shadow-xs">
                <Loader2 size={26} className="animate-spin text-violet-600" />
                <span className="text-sm font-medium text-slate-500">
                  Loading inventory for {getDisplayName(selectedStore.name)}...
                </span>
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-xs">
                <PackageOpen size={42} className="mx-auto text-rose-400" />
                <p className="mt-4 font-bold text-slate-800">Couldn't load products</p>
                <p className="mt-1 text-sm text-slate-500">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center border border-slate-200 shadow-xs">
                <PackageOpen size={42} className="mx-auto text-slate-300" />
                <p className="mt-3 font-bold text-slate-700 text-lg">
                  No products in stock for this store
                </p>
                <p className="mt-1.5 text-sm text-slate-400 max-w-sm mx-auto">
                  This store is currently out of inventory for the selected items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => {
                  const variants = getProductVariants(product);
                  const firstVariant = variants[0] || null;
                  const details = getVariantDetails(product, firstVariant);
                  const cartItem = getCartItem(product, details);
                  const productId = String(product._id);
                  const itemIsWishlisted = isWishlisted(productId);
                  const imageUrl = details.image || getProductImage(product);
                  const isOutOfStock = details.availableQuantity <= 0;

                  return (
                    <article
                      key={productId}
                      onClick={() => navigateToProductDetails(product)}
                      className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product);
                        }}
                        className={`absolute right-3 top-3 z-10 rounded-full border border-slate-200/70 bg-white/95 p-2 shadow-xs transition hover:scale-110 active:scale-90 cursor-pointer ${
                          itemIsWishlisted
                            ? "text-rose-500"
                            : "text-slate-400 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          size={16}
                          className={itemIsWishlisted ? "fill-rose-500 text-rose-500" : ""}
                        />
                      </button>

                      {details.discountPercentage > 0 && (
                        <span className="absolute left-3 top-3 z-10 rounded-xl bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-xs">
                          {details.discountPercentage}% OFF
                        </span>
                      )}

                      <div className="flex h-40 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white p-4 sm:h-48 sm:p-6">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={getDisplayName(product.name)}
                            loading="lazy"
                            className="h-full w-full object-contain transition duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <PackageOpen size={42} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <h3 className="line-clamp-2 min-h-10 text-xs font-bold leading-5 text-slate-800 transition group-hover:text-violet-600 sm:text-sm">
                          {getDisplayName(product.name) || "Unnamed product"}
                        </h3>

                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {variants.length > 1 ? `${variants.length} options` : details.unit}
                        </p>

                        <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-base font-extrabold text-slate-900 sm:text-lg">
                            ₹{details.price.toLocaleString("en-IN")}
                          </span>

                          {details.originalPrice > details.price && (
                            <span className="text-xs text-slate-400 line-through font-medium">
                              ₹{details.originalPrice.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        <div className="mt-auto flex flex-col gap-2.5 pt-4">
                          {isOutOfStock ? (
                            <button
                              type="button"
                              disabled
                              className="flex w-full items-center justify-center rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                            >
                              Out of stock
                            </button>
                          ) : !cartItem ? (
                            <button
                              type="button"
                              onClick={(e) => openVariantPopup(e, product, "cart")}
                              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-violet-200 bg-violet-50 py-3 text-xs font-extrabold text-violet-700 transition hover:bg-violet-100 cursor-pointer shadow-2xs"
                            >
                              <Plus size={15} /> Add to cart
                            </button>
                          ) : (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 shadow-2xs"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(cartItem.variantId || cartItem._id);
                                }}
                                className="rounded-xl p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                              >
                                <Minus size={15} />
                              </button>

                              <span className="text-sm font-black text-emerald-800">
                                {cartItem.quantity}
                              </span>

                              <button
                                type="button"
                                disabled={cartItem.quantity >= details.availableQuantity}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (cartItem.quantity < details.availableQuantity) {
                                    addToCart({
                                      ...cartItem,
                                      availableQuantity: details.availableQuantity,
                                      quantity: 1,
                                    });
                                  } else {
                                    toast.error(`Only ${details.availableQuantity} units left in stock.`);
                                  }
                                }}
                                className="rounded-xl p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          )}

                          {!isOutOfStock && (
                            <button
                              type="button"
                              onClick={(e) => openVariantPopup(e, product, "buy")}
                              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3 text-xs font-extrabold text-white transition hover:bg-violet-700 cursor-pointer shadow-sm"
                            >
                              <Zap size={14} className="fill-amber-400 text-amber-400" />
                              Buy now
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-1/2 z-30 w-[calc(100%-2.5rem)] max-w-lg -translate-x-1/2">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 p-4 text-white shadow-2xl shadow-violet-300/50 transition hover:scale-[1.01] cursor-pointer"
          >
            <span className="flex items-center gap-2.5 text-sm font-bold">
              <ShoppingBag size={20} />
              {totalItems} {totalItems === 1 ? "item" : "items"} in cart
            </span>

            <span className="flex items-center gap-2 text-sm font-extrabold">
              View cart <ArrowRight size={17} />
            </span>
          </button>
        </div>
      )}

      <AccountSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        initialTab={sidebarInitialTab}
      />

      {isVariantOpen && selectedProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Select Variant
                </h3>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {getDisplayName(selectedProduct.name)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsVariantOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-6">
              {getProductVariants(selectedProduct).map((variant, index) => {
                const details = getVariantDetails(selectedProduct, variant);
                const variantKey = variant?._id || selectedProduct._id;
                const isSelected =
                  String(selectedVariant?._id || selectedProduct._id) ===
                  String(variantKey);

                return (
                  <button
                    type="button"
                    key={variantKey || index}
                    onClick={() => setSelectedVariant(variant)}
                    className={`flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition cursor-pointer shadow-2xs ${
                      isSelected
                        ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                        : "border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                      {details.image ? (
                        <img
                          src={details.image}
                          alt={details.unit}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <PackageOpen size={24} className="text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {details.unit}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          ₹{details.price.toLocaleString("en-IN")}
                        </span>

                        {details.originalPrice > details.price && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{details.originalPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {details.discountPercentage > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600">
                          {details.discountPercentage}% OFF
                        </span>
                      )}

                      <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
                        Available: {details.availableQuantity}
                      </p>
                    </div>

                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={15} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 p-6">
              <div>
                <p className="text-sm font-bold text-slate-800">Quantity</p>
                <p className="text-xs text-slate-500">
                  Stock available:{" "}
                  <span className="font-bold text-violet-600">
                    {selectedVariant
                      ? getVariantDetails(selectedVariant, selectedProduct).availableQuantity
                      : 0}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-1.5 shadow-2xs">
                <button
                  type="button"
                  disabled={selectedQuantity <= 1}
                  onClick={() =>
                    setSelectedQuantity((prev) => Math.max(1, prev - 1))
                  }
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <Minus size={16} />
                </button>

                <span className="min-w-5 text-center text-sm font-black">
                  {selectedQuantity}
                </span>

                <button
                  type="button"
                  disabled={
                    selectedQuantity >=
                    (selectedVariant
                      ? getVariantDetails(selectedVariant, selectedProduct).availableQuantity
                      : 1)
                  }
                  onClick={() => {
                    const maxStock = selectedVariant
                      ? getVariantDetails(selectedVariant, selectedProduct).availableQuantity
                      : 1;

                    if (selectedQuantity < maxStock) {
                      setSelectedQuantity((prev) => prev + 1);
                    } else {
                      toast.error(`Only ${maxStock} items left in stock.`);
                    }
                  }}
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                type="button"
                disabled={cartLoading}
                onClick={handleConfirmVariant}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-50 cursor-pointer shadow-md shadow-violet-200"
              >
                {cartLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ShoppingCart size={18} />
                )}
                {variantAction === "buy" ? "Continue to Checkout" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl relative">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Select Location
                </h2>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Choose your delivery location
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocationModalOpen(false);
                  setLocationError("");
                }}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              disabled={locationLoading}
              onClick={handleCurrentLocation}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 p-3.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 cursor-pointer shadow-md shadow-violet-200"
            >
              {locationLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LocateFixed size={18} />
              )}
              Use Current Location
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400">
                OR ENTER MANUALLY
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-3.5">
              <div className="flex gap-2">
                <input
                  value={pincode}
                  onChange={(e) =>
                    setPincode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="6-digit Pincode"
                  maxLength={6}
                  inputMode="numeric"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 font-semibold"
                />

                <button
                  type="button"
                  disabled={locationLoading || pincode.length !== 6}
                  onClick={handlePincodeLookup}
                  className="rounded-xl bg-slate-900 px-4 text-xs font-bold text-white disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  Verify PIN
                </button>
              </div>

              <input
                value={manualArea}
                onChange={(e) => setManualArea(e.target.value)}
                placeholder="Area / Locality"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 font-medium"
              />

              <input
                value={manualLandmark}
                onChange={(e) => setManualLandmark(e.target.value)}
                placeholder="Landmark (optional)"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 font-medium"
              />

              <input
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 font-medium"
              />

              <input
                value={manualState}
                onChange={(e) => setManualState(e.target.value)}
                placeholder="State"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 font-medium"
              />

              {locationError && (
                <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-medium text-rose-600">
                  {locationError}
                </p>
              )}

              <button
                type="button"
                disabled={locationLoading}
                onClick={handleManualLocation}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 p-3.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {locationLoading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <MapPinned size={17} />
                )}
                {locationLoading ? "Finding Nearby Store..." : "Find Nearby Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 size={32} className="animate-spin text-violet-600" />
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}