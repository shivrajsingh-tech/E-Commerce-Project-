import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  X,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  store: "",
  product: "",
  variant: "",
  quantity: "",
  reservedQuantity: "0",
  availableQuantity: "",
  reorderLevel: "5",
  maxStockLevel: "100",
  lastRestockedAt: "",
};

const initialPagination = {
  totalInventories: 0,
  currentPage: 1,
  totalPages: 0,
  limit: 10,
};

const Inventory = () => {
  const { user, hasPermission } = useAuth();

  const canCreate = hasPermission("inventory.create");
  const canUpdate = hasPermission("inventory.update");
  const canDelete = hasPermission("inventory.delete");
  const canChangeStatus = hasPermission("inventory.status_change");

  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Search, sorting and pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState(initialPagination);

  // Form and popups
  const [showForm, setShowForm] = useState(false);
  const [editingInventory, setEditingInventory] = useState(null);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [form, setForm] = useState(initialForm);

  const isStoreManager =
    String(user?.role || "").toLowerCase() === "store_manager";

  // ================= GET INVENTORY =================
  const getInventory = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get("/inventory", {
        params: {
          page,
          limit,
          search,
          sortBy,
          sortOrder,
        },
      });

      const data = response.data;

      setInventory(
        Array.isArray(data?.inventories)
          ? data.inventories
          : Array.isArray(data?.data)
          ? data.data
          : []
      );

      setPagination(
        data?.pagination || {
          ...initialPagination,
          currentPage: page,
          limit,
        }
      );
    } catch (error) {
      setInventory([]);
      setErrorMessage(
        error.response?.data?.message || "Failed to fetch inventory records"
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder]);

  // ================= GET STORES =================
  const getStores = async () => {
    try {
      const response = await api.get("/stores/getAll", {
        params: { page: 1, limit: 100 },
      });

      const data = response.data?.stores ?? response.data?.data ?? [];

      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to fetch stores"
      );
    }
  };

  // ================= GET PRODUCTS =================
  const getProducts = async () => {
    try {
      const response = await api.get("/products", {
        params: { page: 1, limit: 100 },
      });

      const data = response.data?.products ?? response.data?.data ?? [];

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to fetch products"
      );
    }
  };

  // ================= GET VARIANTS =================
  const getVariants = async () => {
    try {
      const response = await api.get("/product-variants", {
        params: { page: 1, limit: 200 },
      });

      const data = response.data?.variants ?? response.data?.data ?? [];

      setVariants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to fetch variants"
      );

      setVariants([]);
    }
  };

  useEffect(() => {
    getInventory();
  }, [getInventory]);

  useEffect(() => {
    getStores();
    getProducts();
    getVariants();
  }, []);

  // ================= FORM CHANGE =================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "product") {
        updated.variant = "";
      }

      if (name === "quantity" || name === "reservedQuantity") {
        const qty = Number(name === "quantity" ? value : updated.quantity) || 0;

        const res =
          Number(
            name === "reservedQuantity" ? value : updated.reservedQuantity
          ) || 0;

        updated.availableQuantity = String(Math.max(0, qty - res));
      }

      return updated;
    });
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    setForm(initialForm);
    setEditingInventory(null);
  };

  // ================= OPEN ADD FORM =================
  const openAddForm = () => {
    resetForm();

    if (isStoreManager && user?.storeId) {
      setForm((prev) => ({
        ...prev,
        store: user.storeId,
      }));
    }

    setShowForm(true);
  };

  // ================= OPEN EDIT FORM =================
  const openEditForm = (item) => {
    setEditingInventory(item);

    setForm({
      store: item.store?._id || item.store || "",
      product: item.product?._id || item.product || "",
      variant: item.variant?._id || item.variant || "",
      quantity: item.quantity ?? "",
      reservedQuantity: item.reservedQuantity ?? "0",
      availableQuantity: item.availableQuantity ?? "",
      reorderLevel: item.reorderLevel ?? "5",
      maxStockLevel: item.maxStockLevel ?? "100",
      lastRestockedAt: item.lastRestockedAt
        ? item.lastRestockedAt.split("T")[0]
        : "",
    });

    setShowForm(true);
  };

  // ================= SUBMIT FORM =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantity = Number(form.quantity);
    const reservedQuantity = Number(form.reservedQuantity || 0);

    if (!form.store && !isStoreManager) {
      setErrorMessage("Please select a target store.");
      return;
    }

    if (!form.product || !form.variant) {
      setErrorMessage("Please select product and variant.");
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      reservedQuantity < 0 ||
      reservedQuantity > quantity
    ) {
      setErrorMessage(
        "Enter valid stock quantities. Reserved quantity cannot exceed total quantity."
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const payload = {
        store: form.store,
        product: form.product,
        variant: form.variant,
        quantity,
        reservedQuantity,
        reorderLevel: Number(form.reorderLevel || 0),
        maxStockLevel: Number(form.maxStockLevel || 0),
      };

      if (editingInventory) {
        await api.put(`/inventory/${editingInventory._id}`, payload);
      } else {
        await api.post("/inventory", payload);
      }

      setShowForm(false);
      resetForm();

      await getInventory();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to save inventory record. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ================= STATUS CHANGE =================
  const handleStatusChange = async () => {
    if (!selectedInventory || actionLoading) return;

    try {
      setActionLoading(true);
      setErrorMessage("");

      await api.patch(`/inventory/status/${selectedInventory._id}`, {
        status:
          selectedInventory.status === "active" ? "inactive" : "active",
      });

      setShowStatusPopup(false);
      setSelectedInventory(null);

      await getInventory();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update inventory status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ================= DELETE INVENTORY =================
  const handleDelete = async () => {
    if (!selectedInventory || actionLoading) return;

    try {
      setActionLoading(true);
      setErrorMessage("");

      await api.delete(`/inventory/${selectedInventory._id}`);

      setShowDeletePopup(false);
      setSelectedInventory(null);

      if (inventory.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await getInventory();
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to delete inventory record"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getEntityId = (entity) => entity?._id || entity || "";

  const hasRowActions = canUpdate || canChangeStatus || canDelete;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Store Inventory
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            Monitor real-time dark store stock counts, reservations, and reorder
            levels.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold text-sm shadow-md shadow-indigo-600/20 transition"
          >
            <Plus size={18} />
            Add Stock Record
          </button>
        )}
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl p-3.5 text-sm">
          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="shrink-0"
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SEARCH, SORTING & PAGE SIZE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Search stock
            </label>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Product name, store code, SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Sort By
            </label>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-indigo-500"
            >
              <option value="createdAt">Created date</option>
              <option value="updatedAt">Updated date</option>
              <option value="quantity">Total quantity</option>
              <option value="availableQuantity">Available quantity</option>
              <option value="reorderLevel">Reorder level</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Sort Order
            </label>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-indigo-500"
            >
              <option value="desc">Descending (High to Low)</option>
              <option value="asc">Ascending (Low to High)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Records Per Page
            </label>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-indigo-500"
            >
              <option value={10}>10 items</option>
              <option value={25}>25 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            Loading inventory items...
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {search
              ? "No inventory matches your search criteria."
              : "No stock records configured for this dark store."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    "Store",
                    "Product Item",
                    "Variant / SKU",
                    "Total",
                    "Reserved",
                    "Available",
                    "Reorder Threshold",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}

                  {hasRowActions && (
                    <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const isLowStock =
                    Number(item.availableQuantity) <=
                    Number(item.reorderLevel);

                  const variantDisplay =
                    item.variant?.title || item.variant?.name || "-";

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 text-sm">
                          {item.store?.name || "-"}
                        </div>

                        <div className="text-xs text-slate-400 font-mono">
                          {item.store?.code || ""}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 text-sm">
                          {item.product?.name || "-"}
                        </div>

                        <div className="text-xs text-slate-400 font-mono">
                          SKU: {item.product?.sku || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Boxes size={12} className="text-indigo-600" />
                          {variantDisplay}
                        </span>

                        {item.variant?.sku && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {item.variant.sku}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                        {item.quantity ?? 0}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-amber-600">
                        {item.reservedQuantity ?? 0}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-bold ${
                            isLowStock ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {item.availableQuantity ?? 0}
                        </span>

                        {isLowStock && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold mt-0.5">
                            <AlertTriangle size={12} />
                            Low stock
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.reorderLevel ?? 0} units
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                            item.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />

                          {item.status || "inactive"}
                        </span>
                      </td>

                      {hasRowActions && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-1.5">
                            {canUpdate && (
                              <button
                                type="button"
                                title="Edit Stock"
                                onClick={() => openEditForm(item)}
                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <Pencil size={16} />
                              </button>
                            )}

                            {canChangeStatus && (
                              <button
                                type="button"
                                title="Toggle Status"
                                onClick={() => {
                                  setSelectedInventory(item);
                                  setShowStatusPopup(true);
                                }}
                                className={`p-2 rounded-lg transition ${
                                  item.status === "active"
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
                                title="Delete Record"
                                onClick={() => {
                                  setSelectedInventory(item);
                                  setShowDeletePopup(true);
                                }}
                                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
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
          Total items: <strong>{pagination.totalInventories}</strong>
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
            onClick={() => setPage((prev) => prev + 1)}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingInventory ? "Update Stock Record" : "Add Stock to Store"}
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* STORE SELECTION */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Store Hub <span className="text-rose-500">*</span>
                  </label>

                  <select
                    name="store"
                    value={form.store}
                    onChange={handleChange}
                    disabled={isStoreManager || Boolean(editingInventory)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select store</option>

                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRODUCT SELECTION */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Product Item <span className="text-rose-500">*</span>
                  </label>

                  <select
                    name="product"
                    value={form.product}
                    onChange={handleChange}
                    disabled={Boolean(editingInventory)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select product</option>

                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* VARIANT SELECTION */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Variant / SKU <span className="text-rose-500">*</span>
                  </label>

                  <select
                    name="variant"
                    value={form.variant}
                    onChange={handleChange}
                    disabled={Boolean(editingInventory) || !form.product}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select variant</option>

                    {variants
                      .filter((v) => {
                        const vPid = getEntityId(v.product);
                        return !form.product || vPid === form.product;
                      })
                      .map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.title || v.name} {v.sku ? `(${v.sku})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* QUANTITY */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Total Quantity <span className="text-rose-500">*</span>
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    value={form.quantity}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* RESERVED */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Reserved in Orders
                  </label>

                  <input
                    type="number"
                    name="reservedQuantity"
                    min="0"
                    value={form.reservedQuantity}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* REORDER LEVEL */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Reorder Alert Level
                  </label>

                  <input
                    type="number"
                    name="reorderLevel"
                    min="0"
                    value={form.reorderLevel}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* MAX LEVEL */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Max Stock Level
                  </label>

                  <input
                    type="number"
                    name="maxStockLevel"
                    min="0"
                    value={form.maxStockLevel}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-md shadow-indigo-600/20"
                >
                  {submitting
                    ? "Saving..."
                    : editingInventory
                    ? "Update Stock"
                    : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION POPUP */}
      {showStatusPopup && selectedInventory && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-slate-100">
            <Power size={36} className="mx-auto text-amber-500 mb-3" />

            <h2 className="text-lg font-bold text-slate-900">
              Change Stock Status?
            </h2>

            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
              Are you sure you want to{" "}
              <strong>
                {selectedInventory.status === "active"
                  ? "deactivate"
                  : "activate"}
              </strong>{" "}
              this stock listing? Customers will not be able to purchase
              inactive stock.
            </p>

            <div className="flex justify-center gap-3 mt-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowStatusPopup(false);
                  setSelectedInventory(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleStatusChange}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition shadow-md shadow-amber-500/20"
              >
                {actionLoading ? "Updating..." : "Confirm Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP */}
      {showDeletePopup && selectedInventory && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-slate-100">
            <Trash2 size={36} className="mx-auto text-rose-500 mb-3" />

            <h2 className="text-lg font-bold text-slate-900">
              Delete Record?
            </h2>

            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
              Are you sure you want to delete this inventory record? Historical
              stock counts will be removed.
            </p>

            <div className="flex justify-center gap-3 mt-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedInventory(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition shadow-md shadow-rose-600/20"
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

export default Inventory;