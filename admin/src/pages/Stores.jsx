import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  X,
  Store as StoreIcon,
  MapPin,
} from "lucide-react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  name: "",
  code: "",
  manager: "",
  phone: "",
  address: "",
  area: "",
  postOffice: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  pincode: "",
  serviceablePincodes: [],
  latitude: "",
  longitude: "",
  serviceRadius: 8,
};

const initialPagination = {
  totalStores: 0,
  currentPage: 1,
  totalPages: 0,
  limit: 10,
};

const isValidPincode = (value) => /^[1-9]\d{5}$/.test(String(value || "").trim());

const Stores = () => {
  const { hasPermission } = useAuth();

  const canView = hasPermission("stores.view");
  const canCreate = hasPermission("stores.create");
  const canUpdate = hasPermission("stores.update");
  const canChangeStatus = hasPermission("stores.status_change");
  const canDelete = hasPermission("stores.delete");

  const [stores, setStores] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState(initialPagination);

  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [pincodeMessage, setPincodeMessage] = useState("");

  const pincodeRequestId = useRef(0);

  // ================= FETCH STORES =================
  const fetchStores = useCallback(async () => {
    if (!canView) {
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/stores/getAll", {
        params: {
          page,
          limit,
          search,
          sortBy,
          sortOrder,
        },
      });

      setStores(response.data?.stores || []);

      setPagination(
        response.data?.pagination || {
          ...initialPagination,
          currentPage: page,
          limit,
        }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch stores");
    } finally {
      setLoading(false);
    }
  }, [canView, page, limit, search, sortBy, sortOrder]);

  // ================= FETCH MANAGERS =================
  const fetchStoreManagers = useCallback(async () => {
    if (!canCreate && !canUpdate) return;

    try {
      const response = await api.get("/stores/managers");
      setManagers(response.data?.managers || []);
    } catch (err) {
      setManagers([]);
      console.error(
        "Failed to fetch store managers:",
        err.response?.data?.message || err.message
      );
    }
  }, [canCreate, canUpdate]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchStoreManagers();
  }, [fetchStoreManagers]);

  // ================= MANAGER NAME =================
  const getManagerName = (manager) => {
    if (!manager) return "Not assigned";
    if (typeof manager === "string") return manager;

    const fullName = [manager.firstName, manager.lastName]
      .filter(Boolean)
      .join(" ");

    return manager.name || fullName || manager.email || "Not assigned";
  };

  // ================= FORM CHANGE =================
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ================= PINCODE LOOKUP =================
  const handlePincodeChange = async (event) => {
    const pincode = event.target.value.replace(/\D/g, "").slice(0, 6);
    const requestId = ++pincodeRequestId.current;

    setForm((previous) => ({
      ...previous,
      pincode,
      postOffice: "",
      city: "",
      district: "",
      state: "",
      country: "India",
      address: "",
      area: "",
      latitude: "",
      longitude: "",
      serviceablePincodes: isValidPincode(pincode) ? [pincode] : [],
    }));

    setPincodeMessage("");
    setError("");

    if (pincode.length !== 6 || !isValidPincode(pincode)) {
      setPincodeLoading(false);
      return;
    }

    setPincodeLoading(true);
    setPincodeMessage("Fetching address details...");

    try {
      const postalResponse = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );

      if (!postalResponse.ok) {
        throw new Error("Unable to fetch PIN code details.");
      }

      const postalData = await postalResponse.json();
      const postalResult = postalData?.[0];

      if (
        requestId !== pincodeRequestId.current
      ) {
        return;
      }

      if (
        postalResult?.Status !== "Success" ||
        !postalResult?.PostOffice?.length
      ) {
        throw new Error("No Indian postal details found for this PIN code.");
      }

      const postOffice = postalResult.PostOffice[0];

      const postOfficeName = postOffice.Name || "";
      const city = postOffice.Block && postOffice.Block !== "NA"
        ? postOffice.Block
        : postOffice.District || "";
      const district = postOffice.District || "";
      const state = postOffice.State || "";
      const country = postOffice.Country || "India";
      const area = postOffice.Name || postOffice.Block || postOffice.District || "";

      let latitude = "";
      let longitude = "";

      // PIN code geocoding provides an approximate area location,
      // not the exact shop/building location.
      try {
        const searchParams = new URLSearchParams({
          postalcode: pincode,
          country: "India",
          format: "jsonv2",
          limit: "1",
        });

        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();

          if (geoData?.length) {
            latitude = geoData[0].lat || "";
            longitude = geoData[0].lon || "";
          }
        }
      } catch (geoError) {
        console.warn("PIN code coordinates could not be fetched:", geoError);
      }

      if (requestId !== pincodeRequestId.current) {
        return;
      }

      setForm((previous) => ({
        ...previous,
        pincode,
        postOffice: postOfficeName,
        city,
        district,
        state,
        country,
        area,
        address: [
          postOfficeName,
          city,
          district,
          state,
          pincode,
          country,
        ]
          .filter(Boolean)
          .filter((item, index, array) => array.indexOf(item) === index)
          .join(", "),
        latitude,
        longitude,
        serviceablePincodes: [pincode],
      }));

      if (latitude && longitude) {
        setPincodeMessage(
          "Address loaded. Coordinates are approximate for this PIN code; verify the store location before saving."
        );
      } else {
        setPincodeMessage(
          "Address loaded, but coordinates could not be found. Try again or use a more precise address lookup."
        );
      }
    } catch (err) {
      if (requestId !== pincodeRequestId.current) {
        return;
      }

      setPincodeMessage("");
      setError(err.message || "Failed to fetch PIN code details.");
    } finally {
      if (requestId === pincodeRequestId.current) {
        setPincodeLoading(false);
      }
    }
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    pincodeRequestId.current += 1;
    setForm({ ...initialForm });
    setEditingStore(null);
    setPincodeLoading(false);
    setPincodeMessage("");
  };

  // ================= CREATE FORM =================
  const openCreateForm = () => {
    resetForm();
    setError("");
    setShowForm(true);
  };

  // ================= EDIT FORM =================
  const openEditForm = (store) => {
    const coordinates = store.location?.coordinates || [];

    pincodeRequestId.current += 1;

    setEditingStore(store);

    setForm({
      name: store.name || "",
      code: store.code || "",
      manager: store.manager?._id || store.manager || "",
      phone: store.phone || "",
      address: store.address || "",
      area: store.area || "",
      postOffice: store.postOffice || "",
      city: store.city || "",
      district: store.district || "",
      state: store.state || "",
      country: store.country || "India",
      pincode: store.pincode || "",
      serviceablePincodes: store.serviceablePincodes || (
        store.pincode ? [store.pincode] : []
      ),
      longitude: coordinates[0] ?? "",
      latitude: coordinates[1] ?? "",
      serviceRadius: store.serviceRadius ?? 8,
    });

    setPincodeLoading(false);
    setPincodeMessage("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    setError("");
  };

  // ================= CREATE / UPDATE =================
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);
      const serviceRadius = Number(form.serviceRadius);
      const cleanPincode = form.pincode.trim();
      const cleanPhone = form.phone.trim();

      if (!form.name.trim() || form.name.trim().length > 100) {
        setError("Store name is required and must not exceed 100 characters.");
        return;
      }

      if (!form.code.trim() || form.code.trim().length > 30) {
        setError("Store code is required and must not exceed 30 characters.");
        return;
      }

      if (!form.manager) {
        setError("Please select a store manager.");
        return;
      }

      if (!form.address.trim() || form.address.trim().length > 500) {
        setError("Complete address is required and must not exceed 500 characters.");
        return;
      }

      if (!form.area.trim() || form.area.trim().length > 100) {
        setError("Area is required and must not exceed 100 characters.");
        return;
      }

      if (!isValidPincode(cleanPincode)) {
        setError("Enter a valid 6-digit Indian PIN code.");
        return;
      }

      if (cleanPhone && !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        setError("Enter a valid phone number with 10 to 15 digits.");
        return;
      }

      if (
        form.latitude === "" ||
        form.longitude === "" ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        (latitude === 0 && longitude === 0)
      ) {
        setError(
          "Coordinates could not be found. Enter a valid PIN code and try again."
        );
        return;
      }

      if (
        form.serviceRadius === "" ||
        !Number.isFinite(serviceRadius) ||
        serviceRadius < 0.1 ||
        serviceRadius > 8
      ) {
        setError("Service radius must be at least 0.1 km and at most 8 km.");
        return;
      }

      if (pincodeLoading) {
        setError("Please wait while PIN code details are loading.");
        return;
      }

      const storeData = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        manager: form.manager,
        phone: cleanPhone,
        address: form.address.trim(),
        area: form.area.trim(),
        postOffice: form.postOffice.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        country: form.country.trim() || "India",
        pincode: cleanPincode,
        serviceablePincodes: [
          ...new Set(
            [cleanPincode, ...form.serviceablePincodes]
              .map((pin) => String(pin).trim())
              .filter(isValidPincode)
          ),
        ],
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        serviceRadius,
      };

      if (editingStore) {
        await api.put(
          `/stores/update/${editingStore._id}`,
          storeData
        );
      } else {
        await api.post("/stores/create", storeData);
      }

      setShowForm(false);
      resetForm();

      await fetchStores();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save store");
    } finally {
      setSubmitting(false);
    }
  };

  // ================= STATUS CONFIRMATION =================
  const openStatusConfirmation = (store) => {
    setSelectedStore(store);
    setError("");
    setShowStatusPopup(true);
  };

  // ================= CHANGE STATUS =================
  const handleStatusChange = async () => {
    if (!selectedStore || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      const newStatus =
        selectedStore.status === "active" ? "inactive" : "active";

      await api.patch(
        `/stores/updateStatus/${selectedStore._id}/status`,
        { status: newStatus }
      );

      setShowStatusPopup(false);
      setSelectedStore(null);

      await fetchStores();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update store status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ================= DELETE CONFIRMATION =================
  const openDeleteConfirmation = (store) => {
    setSelectedStore(store);
    setError("");
    setShowDeletePopup(true);
  };

  // ================= DELETE STORE =================
  const handleDelete = async () => {
    if (!selectedStore || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      await api.delete(`/stores/delete/${selectedStore._id}`);

      setShowDeletePopup(false);
      setSelectedStore(null);

      if (stores.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchStores();
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to delete store"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ================= SEARCH =================
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const hasRowActions = canUpdate || canChangeStatus || canDelete;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dark Stores
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage store locations, delivery radius, and store managers.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold text-sm shadow-md transition"
          >
            <Plus size={18} />
            Add Store
          </button>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 text-sm">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search store, code, area, manager..."
              value={search}
              onChange={handleSearchChange}
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Store Name</option>
              <option value="code">Store Code</option>
              <option value="phone">Phone</option>
              <option value="area">Area</option>
              <option value="serviceRadius">Service Radius</option>
            </select>

            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>

            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* STORE TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            Loading dark stores...
          </div>
        ) : !canView ? (
          <div className="p-12 text-center text-slate-500">
            You do not have permission to view stores.
          </div>
        ) : stores.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No stores found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    "Store Details",
                    "Code",
                    "Manager",
                    "Phone",
                    "Area",
                    "Radius",
                    "Coordinates",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}

                  {hasRowActions && (
                    <th className="text-right px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => {
                  const coordinates = store.location?.coordinates || [];

                  return (
                    <tr
                      key={store._id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <StoreIcon size={20} />
                          </div>

                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {store.name}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 max-w-xs">
                              {store.address || "No address provided"}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              PIN: {store.pincode || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-mono font-semibold text-slate-700">
                        {store.code}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {getManagerName(store.manager)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {store.phone || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {store.area || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {store.serviceRadius ?? 8} km
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 whitespace-nowrap">
                        {coordinates.length === 2 ? (
                          <>
                            {coordinates[1]}, {coordinates[0]}
                          </>
                        ) : (
                          "Not set"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            store.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              store.status === "active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {store.status}
                        </span>
                      </td>

                      {hasRowActions && (
                        <td className="px-5 py-4">
                          <div className="flex justify-end items-center gap-1.5">
                            {canUpdate && (
                              <button
                                type="button"
                                title="Edit Store"
                                onClick={() => openEditForm(store)}
                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                              >
                                <Pencil size={16} />
                              </button>
                            )}

                            {canChangeStatus && (
                              <button
                                type="button"
                                title={
                                  store.status === "active"
                                    ? "Deactivate Store"
                                    : "Activate Store"
                                }
                                onClick={() => openStatusConfirmation(store)}
                                className={`p-2 rounded-lg ${
                                  store.status === "active"
                                    ? "text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                <Power size={16} />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                title="Delete Store"
                                onClick={() => openDeleteConfirmation(store)}
                                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-xs text-slate-500">
          Total stores: <strong>{pagination.totalStores}</strong>
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((previous) => previous - 1)}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-xs text-slate-600">
            Page {pagination.totalPages ? page : 0} of {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={
              loading ||
              !pagination.totalPages ||
              page >= pagination.totalPages
            }
            onClick={() => setPage((previous) => previous + 1)}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5 pb-3 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingStore ? "Update Dark Store" : "Create Dark Store"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the PIN code to fill postal address details automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NAME */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    maxLength={100}
                    placeholder="e.g. Malviya Nagar Hub"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* CODE */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Store Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleFormChange}
                    required
                    maxLength={30}
                    placeholder="e.g. MN-01"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm uppercase outline-none focus:border-indigo-500"
                  />
                </div>

                {/* MANAGER */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Store Manager *
                  </label>
                  <select
                    name="manager"
                    value={form.manager}
                    onChange={handleFormChange}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white outline-none focus:border-indigo-500"
                  >
                    <option value="">Select manager</option>
                    {managers.map((manager) => (
                      <option key={manager._id} value={manager._id}>
                        {getManagerName(manager)}
                      </option>
                    ))}
                  </select>

                  {managers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No active store managers found.
                    </p>
                  )}
                </div>

                {/* PHONE */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    maxLength={16}
                    pattern="^\+?[0-9]{10,15}$"
                    placeholder="Store contact number"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* PINCODE */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    inputMode="numeric"
                    value={form.pincode}
                    onChange={handlePincodeChange}
                    required
                    maxLength={6}
                    pattern="[1-9][0-9]{5}"
                    placeholder="Enter 6-digit PIN code"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  {pincodeLoading && (
                    <p className="text-xs text-indigo-600 mt-1">
                      Fetching postal details...
                    </p>
                  )}
                </div>

                {/* AREA */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Area / Locality *
                  </label>
                  <input
                    type="text"
                    name="area"
                    value={form.area}
                    onChange={handleFormChange}
                    required
                    maxLength={100}
                    placeholder="Automatically filled; you can edit"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* POST OFFICE */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Post Office
                  </label>
                  <input
                    type="text"
                    name="postOffice"
                    value={form.postOffice}
                    onChange={handleFormChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* CITY */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    City / Block
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* DISTRICT */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={form.district}
                    onChange={handleFormChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* STATE */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleFormChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* COUNTRY */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleFormChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* RADIUS */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Delivery Radius (km) *
                  </label>
                  <input
                    type="number"
                    name="serviceRadius"
                    value={form.serviceRadius}
                    onChange={handleFormChange}
                    required
                    min="0.1"
                    max="8"
                    step="0.1"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Maximum allowed radius: 8 km
                  </p>
                </div>

                {/* ADDRESS */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Complete Address *
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    required
                    rows={3}
                    maxLength={500}
                    placeholder="Enter plot, street, landmark or building details"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {pincodeMessage && (
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  {pincodeMessage}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-slate-600 bg-indigo-50 p-3 rounded-xl">
                <MapPin size={16} className="shrink-0 text-indigo-600 mt-0.5" />
                <p>
                  PIN code se milne wale coordinates approximate hote hain.
                  Complete address ko check karke confirm karo. Agar delivery
                  radius bilkul accurate chahiye, exact store coordinates map
                  se verify karna zaroori hai.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || pincodeLoading || managers.length === 0}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingStore
                    ? "Update Store"
                    : "Create Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS POPUP */}
      {showStatusPopup && selectedStore && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <Power size={36} className="mx-auto text-amber-500 mb-3" />

            <h2 className="text-lg font-bold text-slate-900">
              Change Store Status?
            </h2>

            <p className="text-slate-500 text-sm mt-2">
              Are you sure you want to{" "}
              <strong>
                {selectedStore.status === "active" ? "deactivate" : "activate"}
              </strong>{" "}
              <strong>{selectedStore.name}</strong>?
            </p>

            <div className="flex justify-center gap-3 mt-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowStatusPopup(false);
                  setSelectedStore(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleStatusChange}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE POPUP */}
      {showDeletePopup && selectedStore && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <Trash2 size={36} className="mx-auto text-rose-500 mb-3" />

            <h2 className="text-lg font-bold text-slate-900">
              Delete Store?
            </h2>

            <p className="text-slate-500 text-sm mt-2">
              Are you sure you want to delete{" "}
              <strong>{selectedStore.name}</strong>? Stores with inventory
              records cannot be deleted until inventory is transferred or removed.
            </p>

            <div className="flex justify-center gap-3 mt-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedStore(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;