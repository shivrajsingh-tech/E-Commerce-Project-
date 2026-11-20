"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Loader2,
  PackageOpen,
  Heart,
  Zap,
  ChevronRight,
  ArrowRight,
  LogIn,
  X,
  Check,
  MapPin,
  Navigation,
  LocateFixed,
  MapPinned,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";
import { useWishlist } from "@/context/wishlistContext";

import AuthModal from "@/components/AuthModel";
import CartDrawer from "@/components/CartDrawer";
import BannerSlider from "@/components/BannerSlider";

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

const getVariantDetails = (variant, product) => {
  const originalPrice = Number(variant?.mrp ?? variant?.price ?? product?.mrp ?? 0);
  const finalPrice = Number(
    variant?.sellingPrice ?? variant?.discountPrice ?? product?.sellingPrice ?? originalPrice
  );
  const discountPercentage =
    originalPrice > finalPrice && originalPrice > 0
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : Number(variant?.discountPercentage || 0);

  const unitText =
    variant?.name || `${variant?.unitValue || 1} ${variant?.unit || "piece"}`;

  return {
    variantId: String(variant?._id || product?._id),
    price: finalPrice,
    originalPrice,
    discountPercentage,
    unit: unitText,
    image: getVariantImage(variant, product),
    availableQuantity: Number(variant?.availableQuantity ?? product?.availableQuantity ?? 0),
  };
};

const getStoreList = (response) => {
  const data = response?.data;
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
        String(store?.status).toLowerCase() === "active" &&
        Number.isFinite(radius) &&
        radius >= 0.1 &&
        Number.isFinite(distance) &&
        distance >= 0 &&
        distance <= radius * 1000
      );
    })
    .sort((a, b) => Number(a.distanceInMeters) - Number(b.distanceInMeters));
};

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, addToCart, removeFromCart, totalItems } = useCart();
  const { toggleWishlist, isWishlisted, totalWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [banners, setBanners] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");

  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(null);
  const [error, setError] = useState("");

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [isVariantOpen, setIsVariantOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantAction, setVariantAction] = useState("cart");
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // LOCATION & STORE STATE
  const [location, setLocation] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");

  const [pincode, setPincode] = useState("");
  const [manualArea, setManualArea] = useState("");
  const [manualLandmark, setManualLandmark] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");

  const locationRequestRef = useRef(false);

  const clearPreviousLocation = () => {
    setLocation(null);
    setSelectedStore(null);
    setProducts([]);
    localStorage.removeItem(LOCATION_KEY);
  };

  const saveLocation = (locationData, store) => {
    const finalLocation = {
      ...locationData,
      store,
      savedAt: Date.now(),
    };

    setLocation(finalLocation);
    setSelectedStore(store);

    localStorage.setItem(LOCATION_KEY, JSON.stringify(finalLocation));

    setLocationModalOpen(false);
    setLocationError("");
    setLocationStatus("Location selected successfully.");
  };

  const findNearbyStore = async (latitude, longitude, locationData = {}) => {
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
      setLocationError("Unable to detect valid location coordinates.");
      return;
    }

    if (locationRequestRef.current) return;

    locationRequestRef.current = true;
    setLocationLoading(true);
    setLocationError("");
    setLocationStatus("Checking nearby store availability...");

    clearPreviousLocation();

    try {
      const response = await api.get("/stores/nearby", {
        params: { lat, lng },
      });

      const stores = getStoreList(response);
      const eligibleStores = getEligibleStores(stores);

      if (eligibleStores.length === 0) {
        clearPreviousLocation();
        setLocationStatus("unavailable");
        setLocationError("Sorry, no store delivers to your location.");
        return;
      }

      const nearestStore = eligibleStores[0];
      saveLocation(
        {
          ...locationData,
          latitude: lat,
          longitude: lng,
        },
        nearestStore
      );

      setLocationStatus("available");
      setLocationError("");
    } catch (error) {
      console.error("Nearby store error:", error);
      clearPreviousLocation();
      setLocationStatus("unavailable");
      setLocationError("Unable to check store availability. Please try again.");
    } finally {
      setLocationLoading(false);
      locationRequestRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const verifySavedLocation = async () => {
      try {
        const savedLocation = localStorage.getItem(LOCATION_KEY);

        if (!savedLocation) {
          if (isMounted) setLocationModalOpen(true);
          return;
        }

        const parsed = JSON.parse(savedLocation);

        // Expire saved location after 12 hours — prevents stale GPS coordinates
        // from a previous city/trip being silently reused
        const LOCATION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
        const savedAt = parsed?.savedAt ? Number(parsed.savedAt) : 0;
        const isExpired = Date.now() - savedAt > LOCATION_TTL_MS;

        if (isExpired) {
          localStorage.removeItem(LOCATION_KEY);
          if (isMounted) setLocationModalOpen(true);
          return;
        }

        const latitude = Number(parsed?.latitude);
        const longitude = Number(parsed?.longitude);

        const validCoordinates =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180;

        if (!validCoordinates) {
          localStorage.removeItem(LOCATION_KEY);
          if (isMounted) setLocationModalOpen(true);
          return;
        }

        const response = await api.get("/stores/nearby", {
          params: { lat: latitude, lng: longitude },
        });

        if (!isMounted) return;

        const stores = getStoreList(response);
        const eligibleStores = getEligibleStores(stores);

        if (eligibleStores.length === 0) {
          clearPreviousLocation();
          setLocationModalOpen(true);
          setLocationError(
            "No store currently delivers to your saved location. Please select another location."
          );
          return;
        }

        const nearestStore = eligibleStores[0];
        const verifiedLocation = {
          ...parsed,
          latitude,
          longitude,
          store: nearestStore,
          savedAt: Date.now(),
        };

        setLocation(verifiedLocation);
        setSelectedStore(nearestStore);

        setPincode(verifiedLocation.pincode || "");
        setManualArea(verifiedLocation.area || "");
        setManualCity(verifiedLocation.city || "");
        setManualState(verifiedLocation.state || "");
        setManualLandmark(verifiedLocation.landmark || "");

        localStorage.setItem(LOCATION_KEY, JSON.stringify(verifiedLocation));
        setLocationModalOpen(false);
      } catch (error) {
        console.error("Saved location verification error:", error);
        if (!isMounted) return;
        clearPreviousLocation();
        setLocationModalOpen(true);
        setLocationError("Unable to verify your saved location. Please try again.");
      }
    };

    verifySavedLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadGlobalMetadata = async () => {
      try {
        const results = await Promise.allSettled([
          api.get("/categories/active"),
          api.get("/subcategories/active"),
          api.get("/banners/get-active-banners"),
        ]);

        if (!isMounted) return;

        const [categoriesResult, subcategoriesResult, bannersResult] = results;

        if (categoriesResult.status === "fulfilled") {
          const d = categoriesResult.value?.data;
          setCategories(d?.categories || d?.data || d || []);
        }

        if (subcategoriesResult.status === "fulfilled") {
          const d = subcategoriesResult.value?.data;
          setSubCategories(d?.subcategories || d?.subCategories || d?.data || d || []);
        }

        if (bannersResult.status === "fulfilled") {
          const d = bannersResult.value?.data;
          const list = d?.banners || d?.data || d || [];
          setBanners(
            list.filter(
              (b) =>
                String(b?.status || "active").toLowerCase() === "active" &&
                !b?.isDeleted
            )
          );
        }
      } catch (err) {
        console.error("Metadata load error:", err);
      }
    };

    loadGlobalMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchStoreSpecificProducts = async () => {
      if (!selectedStore?._id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await api.get("/products", {
          params: {
            storeId: selectedStore._id,
          },
        });

        if (!isMounted) return;

        const d = res.data;
        const fetchedList = d?.products || d?.data || d || [];
        setProducts(Array.isArray(fetchedList) ? fetchedList : []);
      } catch (err) {
        console.error("Store products fetch error:", err);
        if (isMounted) {
          setProducts([]);
          setError("Unable to load inventory for this store.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStoreSpecificProducts();

    return () => {
      isMounted = false;
    };
  }, [selectedStore?._id]);

  const getAddressFromCoordinates = async (latitude, longitude) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );

    if (!response.ok) {
      throw new Error("Unable to detect your address.");
    }

    const data = await response.json();
    const address = data?.address || {};

    return {
      area:
        address.suburb ||
        address.neighbourhood ||
        address.residential ||
        address.village ||
        address.town ||
        "",
      city:
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        "",
      district: address.state_district || address.county || "",
      state: address.state || "",
      pincode: address.postcode || "",
      landmark: "",
      address: data?.display_name || "",
      latitude: Number(latitude),
      longitude: Number(longitude),
      source: "gps",
    };
  };

  const handleCurrentLocation = () => {
    setLocationError("");
    setLocationStatus("");

    if (locationRequestRef.current || locationLoading) return;

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location detection.");
      return;
    }

    setLocationLoading(true);
    setLocationStatus("Detecting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const address = await getAddressFromCoordinates(latitude, longitude);

          setPincode(address.pincode || "");
          setManualArea(address.area || "");
          setManualCity(address.city || "");
          setManualState(address.state || "");
          setManualLandmark("");

          await findNearbyStore(latitude, longitude, address);
        } catch (err) {
          console.error("GPS location error:", err);
          setLocationLoading(false);
          setLocationError(err.message || "Unable to detect your location.");
          setLocationStatus("");
        }
      },
      (err) => {
        console.error("Geolocation permission error:", err);
        setLocationLoading(false);
        setLocationStatus("");

        if (err.code === 1) {
          setLocationError(
            "Location permission denied. Please allow location access or enter your PIN code."
          );
        } else if (err.code === 2) {
          setLocationError(
            "Your current location could not be detected. Please enter your PIN code."
          );
        } else {
          setLocationError("Location request timed out. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handlePincodeLookup = async () => {
    const enteredPincode = pincode.trim();

    if (!/^[0-9]{6}$/.test(enteredPincode)) {
      setLocationError("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (locationRequestRef.current || locationLoading) return;

    try {
      setLocationLoading(true);
      setLocationError("");
      setLocationStatus("Finding your PIN code location...");

      const postalResponse = await fetch(
        `https://api.postalpincode.in/pincode/${enteredPincode}`
      );

      if (!postalResponse.ok) {
        throw new Error("Unable to verify this PIN code.");
      }

      const postalData = await postalResponse.json();

      if (
        !Array.isArray(postalData) ||
        postalData[0]?.Status !== "Success" ||
        !postalData[0]?.PostOffice?.length
      ) {
        throw new Error("Invalid PIN code. Please check again.");
      }

      const postOffice = postalData[0].PostOffice[0];
      const city = postOffice.District || "";
      const state = postOffice.State || "";
      const area = postOffice.Name || "";

      setManualCity(city);
      setManualState(state);
      setManualArea(area);

      setLocationStatus("Finding coordinates for your PIN code...");

      const query = encodeURIComponent(
        `${enteredPincode}, ${city}, ${state}, India`
      );

      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`
      );

      if (!geoResponse.ok) {
        throw new Error("Unable to find coordinates for this PIN code.");
      }

      const geoData = await geoResponse.json();

      if (!Array.isArray(geoData) || !geoData.length) {
        throw new Error("Could not find coordinates for this PIN code.");
      }

      const latitude = Number(geoData[0].lat);
      const longitude = Number(geoData[0].lon);

      const locationData = {
        area,
        city,
        district: postOffice.District || "",
        state,
        pincode: enteredPincode,
        landmark: "",
        address: `${area}, ${city}, ${state}, ${enteredPincode}`,
        latitude,
        longitude,
        source: "pincode",
      };

      await findNearbyStore(latitude, longitude, locationData);
    } catch (err) {
      console.error("PIN lookup error:", err);
      setLocationLoading(false);
      setLocationError(err.message || "Unable to find your PIN code location.");
      setLocationStatus("");
    }
  };

  const handleManualLocation = async () => {
    const enteredPincode = pincode.trim();

    if (!/^[0-9]{6}$/.test(enteredPincode)) {
      setLocationError("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (!manualCity.trim() || !manualState.trim()) {
      setLocationError("Please enter your city and state.");
      return;
    }

    if (locationRequestRef.current || locationLoading) return;

    try {
      setLocationLoading(true);
      setLocationError("");
      setLocationStatus("Finding your location...");

      const query = encodeURIComponent(
        `${manualArea}, ${manualLandmark}, ${manualCity}, ${manualState}, ${enteredPincode}, India`
      );

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`
      );

      if (!response.ok) {
        throw new Error("Unable to search this location.");
      }

      const data = await response.json();

      if (!Array.isArray(data) || !data.length) {
        throw new Error("Location not found. Please check your address details.");
      }

      const latitude = Number(data[0].lat);
      const longitude = Number(data[0].lon);

      const locationData = {
        area: manualArea,
        city: manualCity,
        state: manualState,
        pincode: enteredPincode,
        landmark: manualLandmark,
        address: `${manualArea}, ${manualCity}, ${manualState}, ${enteredPincode}`,
        latitude,
        longitude,
        source: "manual",
      };

      await findNearbyStore(latitude, longitude, locationData);
    } catch (err) {
      console.error("Manual location error:", err);
      setLocationLoading(false);
      setLocationError(err.message || "Unable to find this location.");
      setLocationStatus("");
    }
  };

  const displayedBanners = useMemo(() => {
    if (!Array.isArray(banners) || banners.length === 0) return [];

    if (selectedCategory === "all") {
      const globalBanners = banners.filter(
        (b) => !b.category || b.category === "null"
      );
      return globalBanners.length > 0 ? globalBanners : banners;
    }

    const specific = banners.filter(
      (b) => getId(b.category) === String(selectedCategory)
    );
    if (specific.length > 0) return specific;

    const fallbackGlobal = banners.filter(
      (b) => !b.category || b.category === "null"
    );
    return fallbackGlobal.length > 0 ? fallbackGlobal : banners;
  }, [banners, selectedCategory]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === "all") return [];
    return subCategories.filter(
      (sub) => getId(sub.category) === String(selectedCategory)
    );
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
        !searchText ||
        productName.includes(searchText) ||
        brandName.includes(searchText);

      const matchesCategory =
        selectedCategory === "all" ||
        getId(product.category) === String(selectedCategory);

      const matchesSubCategory =
        selectedSubCategory === "all" ||
        getId(product.subCategory) === String(selectedSubCategory);

      const isAvailable =
        product.status !== "inactive" &&
        product.isActive !== false &&
        !product.isDeleted;

      return matchesSearch && matchesCategory && matchesSubCategory && isAvailable;
    });
  }, [products, search, selectedCategory, selectedSubCategory]);

  const getProductVariants = (product) => {
    if (!Array.isArray(product?.variants)) return [];
    return product.variants.filter(
      (variant) => variant && variant.status !== "inactive" && !variant.isDeleted
    );
  };

  const getProductDetails = (product) => {
    const variants = getProductVariants(product);
    const variant = variants.length > 0 ? variants[0] : null;

    if (variant) {
      return getVariantDetails(variant, product);
    }

    const originalPrice = Number(product?.mrp ?? product?.price ?? 0);
    const finalPrice = Number(
      product?.sellingPrice ?? product?.discountPrice ?? originalPrice
    );

    const discountPercentage =
      originalPrice > finalPrice && originalPrice > 0
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0;

    return {
      variantId: String(product._id),
      price: finalPrice,
      originalPrice,
      discountPercentage,
      unit: "1 piece",
      image: getProductImage(product),
      availableQuantity: Number(product?.inventory?.availableQuantity ?? product?.availableQuantity ?? 0),
    };
  };

  const getCartItem = (product, variant) => {
    if (!variant) return null;
    const variantId = String(variant._id || product._id);

    return cartItems.find(
      (item) =>
        String(item._id) === String(product._id) &&
        String(item.variantId || item._id) === variantId
    );
  };

  const navigateToProductDetails = (product) => {
    const slug = product.slug || product._id;
    router.push(`/products/${slug}`);
  };

  const openVariantPopup = (e, product, action) => {
    e.stopPropagation();
    if (!location || !selectedStore) {
      setLocationModalOpen(true);
      setLocationError("Please select a delivery location first.");
      return;
    }

    const variants = getProductVariants(product);
    const initialVariant = variants.length > 0 ? variants[0] : null;
    const details = initialVariant
      ? getVariantDetails(initialVariant, product)
      : getProductDetails(product);

    if (details.availableQuantity <= 0) {
      toast.error("This item is currently out of stock!");
      return;
    }

    setSelectedProduct(product);
    setVariantAction(action);
    setSelectedQuantity(1);
    setSelectedVariant(initialVariant);
    setIsVariantOpen(true);
  };

  const closeVariantPopup = () => {
    setIsVariantOpen(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setSelectedQuantity(1);
  };

  const handleConfirmVariant = () => {
    if (!selectedProduct) return;

    if (!location || !selectedStore) {
      closeVariantPopup();
      setLocationModalOpen(true);
      setLocationError("Please select a delivery location first.");
      return;
    }

    const details = selectedVariant
      ? getVariantDetails(selectedVariant, selectedProduct)
      : getProductDetails(selectedProduct);

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

    const cartProduct = {
      ...selectedProduct,
      _id: String(selectedProduct._id),
      variantId: details.variantId,
      price: details.price,
      unit: details.unit,
      image: details.image || getProductImage(selectedProduct),
      storeId: getId(selectedStore),
      availableQuantity: maxStock,
      quantity: selectedQuantity,
    };

    setCartLoading(String(selectedProduct._id));
    addToCart(cartProduct);
    setCartLoading(null);

    const action = variantAction;
    closeVariantPopup();

    if (action === "buy") {
      if (!authLoading && !user) {
        openAuth("login");
      } else if (user) {
        router.push("/checkout");
      }
    }
  };

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleCheckout = () => {
    if (authLoading) return;

    if (!location || !selectedStore) {
      setIsCartOpen(false);
      setLocationModalOpen(true);
      setLocationError("Please select a delivery location first.");
      return;
    }

    if (!user) {
      openAuth("login");
      return;
    }

    setIsCartOpen(false);
    router.push("/checkout");
  };

  const handleDecreaseCart = (e, cartItem) => {
    e.stopPropagation();
    removeFromCart(cartItem.variantId || cartItem._id);
  };

  const locationLabel = location
    ? [location.area, location.city, location.pincode]
        .filter(Boolean)
        .join(", ")
    : "Select location";

  return (
    <main className="min-h-screen bg-slate-50 pb-28 text-slate-900 w-full overflow-x-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-xl w-full">
        <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
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

          {/* LOCATION SELECTOR */}
          <button
            type="button"
            onClick={() => {
              setLocationError("");
              setLocationModalOpen(true);
            }}
            className="order-3 flex w-full min-w-0 items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-left sm:order-none sm:w-auto sm:max-w-xs cursor-pointer"
          >
            <MapPin size={19} className="shrink-0 text-violet-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold text-slate-500">
                Delivering to
              </span>
              <span className="block truncate text-xs font-extrabold text-slate-800">
                {locationLabel}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-violet-600" />
          </button>

          {/* SEARCH */}
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* WISHLIST */}
            <button
              type="button"
              onClick={() => router.push("/wishlist")}
              title="My Wishlist"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
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

            {/* ACCOUNT / AUTH */}
            {!authLoading && user ? (
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="hidden text-right transition hover:opacity-80 sm:block cursor-pointer"
              >
                <p className="text-xs text-slate-500">My Account</p>
                <p className="max-w-36 truncate text-sm font-bold">
                  {user?.name || user?.firstName || user?.email || "Account"}
                </p>
              </button>
            ) : !authLoading ? (
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100 cursor-pointer"
              >
                <LogIn size={15} />
                Sign In
              </button>
            ) : null}

            {/* CART */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-white transition hover:bg-violet-700 cursor-pointer"
            >
              <ShoppingCart size={19} />
              <span className="hidden text-sm font-semibold sm:inline">
                Cart
              </span>
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-extrabold text-slate-900">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MOBILE SEARCH */}
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>
        </div>

        {/* CIRCULAR CATEGORIES SECTION — only shown when a store is available */}
        {selectedStore && (
        <div className="border-t border-slate-100 bg-white py-3">
          <div className="w-full px-4 sm:px-8">
            <div className="flex items-center gap-5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedSubCategory("all");
                }}
                className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <div
                  className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 transition duration-200 ${
                    selectedCategory === "all"
                      ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200 scale-105"
                      : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-violet-300 group-hover:bg-violet-50"
                  }`}
                >
                  <Sparkles size={24} />
                </div>
                <span
                  className={`text-[11px] font-bold tracking-tight text-center truncate max-w-16 sm:max-w-20 ${
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
                    className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <div
                      className={`relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-full border-2 p-1.5 transition duration-200 ${
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
                      className={`text-[11px] font-bold tracking-tight text-center truncate max-w-16 sm:max-w-20 ${
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
              <div className="mt-3.5 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3 scrollbar-none">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                  <ChevronRight size={14} /> Subcategories:
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedSubCategory("all")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
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
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition cursor-pointer ${
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
        )} {/* end selectedStore categories section */}
      </header>

      {/* BANNERS */}
      <div className="w-full px-4 sm:px-8 mt-4">
        {displayedBanners.length > 0 && <BannerSlider banners={displayedBanners} />}
      </div>

      {location && selectedStore && (
        <div className="w-full px-4 sm:px-8 mt-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <Check size={17} className="text-emerald-600" />
            <span className="font-semibold text-emerald-800">
              Delivery active
            </span>
            <span className="text-emerald-700">
              from {getDisplayName(selectedStore.name) || "nearby store"}
            </span>
          </div>
        </div>
      )}

      {/* PRODUCTS SECTION */}
      <section className="w-full px-4 sm:px-8 py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
              Fresh Daily Picks
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {selectedCategory === "all"
                ? "Explore Essentials"
                : getDisplayName(
                    categories.find((c) => getId(c) === selectedCategory)?.name
                  ) || "Catalog"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} verified products available in this store
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

        {!location || !selectedStore ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <MapPin size={35} className="mx-auto text-amber-600" />
            <p className="mt-3 font-bold text-slate-800">
              Select your delivery location
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Inventory is verified in real-time according to your assigned store.
            </p>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 cursor-pointer"
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
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-red-500">
            {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200">
            <PackageOpen size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 font-bold text-slate-700">
              No products available in this store
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Items in this category are currently out of stock or inactive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const details = getProductDetails(product);
              const variants = getProductVariants(product);
              const cartItem = getCartItem(
                product,
                variants.length > 0 ? variants[0] : product
              );

              const productId = String(product._id);
              const isAdding = cartLoading === productId;
              const itemIsWishlisted = isWishlisted(productId);
              const imageUrl = getProductImage(product);
              const isOutOfStock = details.availableQuantity <= 0;

              return (
                <article
                  key={productId}
                  onClick={() => navigateToProductDetails(product)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl sm:rounded-3xl cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product);
                    }}
                    className={`absolute right-2.5 top-2.5 z-10 rounded-full border border-slate-200/70 bg-white/95 p-2 shadow-xs transition hover:scale-110 active:scale-90 cursor-pointer ${
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
                    <span className="absolute left-2.5 top-2.5 z-10 rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-xs">
                      {details.discountPercentage}% OFF
                    </span>
                  )}

                  <div className="flex h-36 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white p-4 sm:h-48 sm:p-6">
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

                  <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                    <h3 className="line-clamp-2 min-h-10 text-xs font-bold leading-5 text-slate-800 transition group-hover:text-violet-600 sm:text-sm">
                      {getDisplayName(product.name) || "Unnamed product"}
                    </h3>

                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {variants.length > 1
                        ? `${variants.length} options available`
                        : details.unit}
                    </p>

                    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-base font-extrabold text-slate-900 sm:text-lg">
                        ₹{details.price.toLocaleString("en-IN")}
                      </span>

                      {details.originalPrice > details.price && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{details.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4">
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
                          disabled={isAdding}
                          onClick={(e) => openVariantPopup(e, product, "cart")}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-xs font-extrabold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                        >
                          {isAdding ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Plus size={15} />
                          )}
                          Add to cart
                        </button>
                      ) : (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleDecreaseCart(e, cartItem)}
                            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                          >
                            <Minus size={15} />
                          </button>

                          <span className="text-sm font-extrabold text-emerald-800">
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
                            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      )}

                      {!isOutOfStock && (
                        <button
                          type="button"
                          onClick={(e) => openVariantPopup(e, product, "buy")}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 cursor-pointer"
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

      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
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
              View cart
              <ArrowRight size={17} />
            </span>
          </button>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />

      {/* LOCATION MODAL */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-5">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={() => {
                setLocationModalOpen(false);
                setLocationError("");
              }}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <MapPinned size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Select your location
                </h2>
                <p className="text-xs text-slate-500">
                  Check live inventory and nearby store delivery
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={locationLoading}
              onClick={handleCurrentLocation}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-4 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-60 cursor-pointer"
            >
              {locationLoading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <LocateFixed size={19} />
              )}
              Use current GPS location
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400">
                OR SEARCH BY PIN CODE
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              6-digit PIN code
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, ""));
                  setLocationError("");
                }}
                placeholder="Enter 6-digit PIN"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />

              <button
                type="button"
                disabled={locationLoading || pincode.length !== 6}
                onClick={handlePincodeLookup}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 cursor-pointer"
              >
                Verify
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="mb-4">
                <p className="text-sm font-extrabold text-slate-800">
                  Search address manually
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Find the closest delivery warehouse.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={manualArea}
                    onChange={(e) => setManualArea(e.target.value)}
                    placeholder="Area name or neighborhood"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Landmark (optional)
                  </label>
                  <input
                    type="text"
                    value={manualLandmark}
                    onChange={(e) => setManualLandmark(e.target.value)}
                    placeholder="Nearby metro or mall"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      City
                    </label>
                    <input
                      type="text"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      State
                    </label>
                    <input
                      type="text"
                      value={manualState}
                      onChange={(e) => setManualState(e.target.value)}
                      placeholder="State"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    locationLoading ||
                    pincode.length !== 6 ||
                    !manualCity.trim() ||
                    !manualState.trim()
                  }
                  onClick={handleManualLocation}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-extrabold text-violet-700 transition hover:bg-violet-100 disabled:opacity-40 cursor-pointer"
                >
                  {locationLoading ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Navigation size={17} />
                  )}
                  Find nearby store
                </button>
              </div>
            </div>

            {locationStatus && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
                {locationLoading && (
                  <Loader2 size={17} className="shrink-0 animate-spin" />
                )}
                {locationStatus === "available"
                  ? "Location verified successfully."
                  : locationStatus === "unavailable"
                  ? "Store availability checked."
                  : locationStatus}
              </div>
            )}

            {locationError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                  <p className="text-sm font-semibold text-red-700">
                    {locationError}
                  </p>
                </div>
              </div>
            )}

            {location && selectedStore && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check size={18} />
                  <p className="text-sm font-extrabold">Store connected!</p>
                </div>

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {getDisplayName(selectedStore.name)}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {locationLabel}
                </p>

                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  View available items
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VARIANT PICKER MODAL */}
      {isVariantOpen && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={closeVariantPopup}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>

            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
              Select Variant
            </p>

            <h2 className="mt-1 pr-10 text-xl font-extrabold text-slate-900">
              {getDisplayName(selectedProduct.name)}
            </h2>

            <div className="mt-5 space-y-3">
              {getProductVariants(selectedProduct).length > 0 ? (
                getProductVariants(selectedProduct).map((variant) => {
                  const details = getVariantDetails(variant, selectedProduct);
                  const isSelected =
                    String(selectedVariant?._id) === String(variant._id);

                  return (
                    <button
                      key={variant._id}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                          : "border-slate-200 hover:border-violet-300"
                      }`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        {details.image ? (
                          <img
                            src={details.image}
                            alt={details.unit}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <PackageOpen size={24} className="text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">
                          {details.unit}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            ₹{details.price.toLocaleString("en-IN")}
                          </span>

                          {details.originalPrice > details.price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{details.originalPrice.toLocaleString("en-IN")}
                            </span>
                          )}

                          {details.discountPercentage > 0 && (
                            <span className="text-xs font-bold text-emerald-600">
                              {details.discountPercentage}% OFF
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-[10px] text-slate-500 font-medium">
                          In stock: {details.availableQuantity}
                        </p>
                      </div>

                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-slate-300 text-transparent"
                        }`}
                      >
                        <Check size={14} />
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-sm font-bold text-slate-800">
                    Standard item
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    ₹{getProductDetails(selectedProduct).price.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Quantity</p>
                <p className="text-xs text-slate-500">
                  Available:{" "}
                  <span className="font-bold text-violet-700">
                    {selectedVariant
                      ? getVariantDetails(selectedVariant, selectedProduct).availableQuantity
                      : getProductDetails(selectedProduct).availableQuantity}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={selectedQuantity <= 1}
                  onClick={() =>
                    setSelectedQuantity((prev) => Math.max(1, prev - 1))
                  }
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <Minus size={16} />
                </button>

                <span className="min-w-5 text-center text-sm font-extrabold">
                  {selectedQuantity}
                </span>

                <button
                  type="button"
                  disabled={
                    selectedQuantity >=
                    (selectedVariant
                      ? getVariantDetails(selectedVariant, selectedProduct).availableQuantity
                      : getProductDetails(selectedProduct).availableQuantity)
                  }
                  onClick={() => {
                    const max = selectedVariant
                      ? getVariantDetails(selectedVariant, selectedProduct).availableQuantity
                      : getProductDetails(selectedProduct).availableQuantity;

                    if (selectedQuantity < max) {
                      setSelectedQuantity((prev) => prev + 1);
                    } else {
                      toast.error(`Only ${max} units available in stock.`);
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Total amount
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                ₹
                {(
                  (selectedVariant
                    ? getVariantDetails(selectedVariant, selectedProduct).price
                    : getProductDetails(selectedProduct).price) * selectedQuantity
                ).toLocaleString("en-IN")}
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmVariant}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-extrabold text-white transition hover:bg-violet-700 cursor-pointer"
            >
              {variantAction === "buy" ? (
                <>
                  <Zap size={17} /> Buy now
                </>
              ) : (
                <>
                  <ShoppingCart size={17} /> Add to cart
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          router.push("/account");
        }}
      />
    </main>
  );
}