import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const initialForm = {
  product: "",
  name: "",
  sku: "",
  barcode: "",
  unitValue: "",
  unit: "",
  mrp: "",
  sellingPrice: "",
  shippingWeight: "",
  dimensions: {
    length: "",
    width: "",
    height: "",
    unit: "cm",
  },
};

const allowedUnits = [
  "g",
  "kg",
  "ml",
  "l",
  "piece",
  "pack",
  "dozen",
];

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const Variants = () => {
  const { hasPermission } = useAuth();

  const canView = hasPermission("variants.view");
  const canCreate = hasPermission("variants.create");
  const canUpdate = hasPermission("variants.update");
  const canDelete = hasPermission("variants.delete");
  const canChangeStatus = hasPermission("variants.status_change");

  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalVariants: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const [selectedVariant, setSelectedVariant] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);

  // ==========================================
  // GET PRODUCTS
  // ==========================================
  const getProducts = async () => {
    try {
      const response = await api.get("/products", {
        params: { limit: 100 },
      });

      const data =
        response.data?.products ||
        response.data?.data ||
        [];

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch products"
      );
      setProducts([]);
    }
  };

  // ==========================================
  // GET VARIANTS
  // ==========================================
  const getVariants = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/product-variants", {
        params: {
          search: search.trim(),
          productId: productFilter,
          status: statusFilter,
          sortBy,
          order,
          page,
          limit,
        },
      });

      const data =
        response.data?.variants ||
        response.data?.data ||
        [];

      setVariants(Array.isArray(data) ? data : []);

      setPagination(
        response.data?.pagination || {
          currentPage: page,
          totalPages: 0,
          totalVariants: 0,
        }
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch variants"
      );
      setVariants([]);
      setPagination({
        currentPage: 1,
        totalPages: 0,
        totalVariants: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    search,
    productFilter,
    statusFilter,
    sortBy,
    order,
    page,
    limit,
  ]);

  useEffect(() => {
    if (canView) {
      getProducts();
    } else {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!canView) return;

    const timer = setTimeout(
      () => {
        getVariants();
      },
      search ? 350 : 0
    );

    return () => clearTimeout(timer);
  }, [getVariants, search, canView]);

  // ==========================================
  // FORM CHANGES
  // ==========================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [name]: value,
      },
    }));
  };

  // ==========================================
  // IMAGE VALIDATION
  // ==========================================
  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length > 5) {
      toast.error("You can select a maximum of 5 images.");
      e.target.value = "";
      setImages([]);
      return;
    }

    for (const file of selectedFiles) {
      if (!allowedImageTypes.includes(file.type)) {
        toast.error("Only JPG, JPEG, PNG and WEBP images are allowed.");
        e.target.value = "";
        setImages([]);
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error("Each image must be 5MB or smaller.");
        e.target.value = "";
        setImages([]);
        return;
      }
    }

    setImages(selectedFiles);
  };

  // ==========================================
  // RESET FORM
  // ==========================================
  const resetForm = () => {
    setForm({
      ...initialForm,
      dimensions: { ...initialForm.dimensions },
    });
    setImages([]);
    setEditingVariant(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (variant) => {
    setEditingVariant(variant);

    setForm({
      product:
        variant.product?._id ||
        variant.product ||
        "",
      name: variant.name || "",
      sku: variant.sku || "",
      barcode: variant.barcode || "",
      unitValue: String(variant.unitValue ?? ""),
      unit: variant.unit || "",
      mrp: String(variant.mrp ?? ""),
      sellingPrice: String(variant.sellingPrice ?? ""),
      shippingWeight: String(
        variant.shippingWeight ?? ""
      ),
      dimensions: {
        length: String(variant.dimensions?.length ?? ""),
        width: String(variant.dimensions?.width ?? ""),
        height: String(variant.dimensions?.height ?? ""),
        unit: variant.dimensions?.unit || "cm",
      },
    });

    setImages([]);
    setShowForm(true);
  };

  // ==========================================
  // VALIDATE FORM
  // ==========================================
  const validateForm = () => {
    const name = form.name.trim();

    if (!form.product) {
      return "Please select a product.";
    }

    if (!name) {
      return "Variant name is required.";
    }

    if (name.length > 100) {
      return "Variant name cannot exceed 100 characters.";
    }

    if (!allowedUnits.includes(form.unit)) {
      return "Please select a valid unit.";
    }

    const unitValue = Number(form.unitValue);
    const mrp = Number(form.mrp);
    const sellingPrice = Number(form.sellingPrice);
    const shippingWeight =
      form.shippingWeight === ""
        ? 0
        : Number(form.shippingWeight);

    if (
      form.unitValue === "" ||
      !Number.isFinite(unitValue) ||
      unitValue <= 0
    ) {
      return "Unit value must be greater than zero.";
    }

    if (
      form.mrp === "" ||
      !Number.isFinite(mrp) ||
      mrp <= 0
    ) {
      return "MRP must be greater than zero.";
    }

    if (
      form.sellingPrice === "" ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      return "Enter a valid selling price.";
    }

    if (sellingPrice > mrp) {
      return "Selling price cannot be greater than MRP.";
    }

    if (!Number.isFinite(shippingWeight) || shippingWeight < 0) {
      return "Shipping weight cannot be negative.";
    }

    if (!["cm", "inch"].includes(form.dimensions.unit)) {
      return "Please select a valid dimension unit.";
    }

    for (const field of ["length", "width", "height"]) {
      const value = form.dimensions[field];
      if (
        value !== "" &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      ) {
        return `${field} must be a valid non-negative number.`;
      }
    }

    return null;
  };

  // ==========================================
  // ADD / UPDATE VARIANT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("product", form.product);
      formData.append("name", form.name.trim());
      formData.append("unitValue", String(Number(form.unitValue)));
      formData.append("unit", form.unit);
      formData.append("mrp", String(Number(form.mrp)));
      formData.append("sellingPrice", String(Number(form.sellingPrice)));

      if (form.sku.trim()) {
        formData.append("sku", form.sku.trim().toUpperCase());
      }

      if (form.shippingWeight !== "") {
        formData.append("shippingWeight", String(Number(form.shippingWeight)));
      }

      if (form.barcode.trim()) {
        formData.append("barcode", form.barcode.trim());
      }

      const dimensions = {
        length: form.dimensions.length === "" ? 0 : Number(form.dimensions.length),
        width: form.dimensions.width === "" ? 0 : Number(form.dimensions.width),
        height: form.dimensions.height === "" ? 0 : Number(form.dimensions.height),
        unit: form.dimensions.unit,
      };

      formData.append("dimensions", JSON.stringify(dimensions));
      formData.append("status", editingVariant?.status || "active");

      images.forEach((image) => {
        formData.append("images", image);
      });

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (editingVariant) {
        await api.put(`/product-variants/${editingVariant._id}`, formData, config);
        toast.success("Variant updated successfully.");
      } else {
        await api.post("/product-variants", formData, config);
        toast.success("Variant added successfully.");
      }

      closeForm();

      if (page === 1) {
        await getVariants();
      } else {
        setPage(1);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save variant.");
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // STATUS CHANGE
  // ==========================================
  const handleStatusChange = async () => {
    if (!selectedVariant) return;

    try {
      setActionLoading(true);

      const newStatus =
        selectedVariant.status === "active" ? "inactive" : "active";

      await api.patch(`/product-variants/${selectedVariant._id}/status`, {
        status: newStatus,
      });

      toast.success(`Variant status updated to ${newStatus}`);
      setShowStatusPopup(false);
      setSelectedVariant(null);

      await getVariants();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to change variant status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // DELETE VARIANT
  // ==========================================
  const handleDelete = async () => {
    if (!selectedVariant) return;

    try {
      setActionLoading(true);

      await api.delete(`/product-variants/${selectedVariant._id}`);

      setShowDeletePopup(false);
      setSelectedVariant(null);

      if (variants.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await getVariants();
      }

      toast.success("Variant deleted successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete variant.");
    } finally {
      setActionLoading(false);
    }
  };

  const hasRowActions = canUpdate || canChangeStatus || canDelete;

  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-700">Access Denied</h2>
          <p className="mt-2 text-sm text-red-600">
            You do not have permission to view product variants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Product Variants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product units, pricing, barcodes and package dimensions.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition hover:bg-indigo-700 text-sm font-semibold"
          >
            <Plus size={18} />
            Add Variant
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Search variant, SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Products</option>
          {products.map((product) => (
            <option key={product._id} value={product._id}>
              {product.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="createdAt">Created Date</option>
          <option value="name">Variant Name</option>
          <option value="sku">SKU</option>
          <option value="sellingPrice">Selling Price</option>
          <option value="mrp">MRP</option>
          <option value="status">Status</option>
        </select>

        <select
          value={order}
          onChange={(e) => {
            setOrder(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading variants...
          </div>
        ) : variants.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No variants found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Variant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">MRP</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Selling Price</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Discount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-600">Status</th>
                  {hasRowActions && (
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {variants.map((variant) => {
                  const mrp = Number(variant.mrp || 0);
                  const sellingPrice = Number(variant.sellingPrice || 0);
                  const discount =
                    variant.discountPercentage ??
                    (mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);

                  return (
                    <tr key={variant._id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {variant.product?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        {variant.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 font-mono">
                          {variant.sku || "-"}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {variant.unitValue} {variant.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        ₹{mrp.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        ₹{sellingPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {discount > 0 ? (
                          <span className="rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                            {discount}% OFF
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            variant.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {variant.status || "inactive"}
                        </span>
                      </td>
                      {hasRowActions && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => openEditForm(variant)}
                                className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                                title="Edit variant"
                              >
                                <Pencil size={17} />
                              </button>
                            )}
                            {canChangeStatus && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVariant(variant);
                                  setShowStatusPopup(true);
                                }}
                                className={`rounded-lg p-2 transition ${
                                  variant.status === "active"
                                    ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                    : "bg-green-50 text-green-600 hover:bg-green-100"
                                }`}
                                title={variant.status === "active" ? "Deactivate" : "Activate"}
                              >
                                <Power size={17} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVariant(variant);
                                  setShowDeletePopup(true);
                                }}
                                className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                                title="Delete variant"
                              >
                                <Trash2 size={17} />
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
      <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>Total: {pagination.totalVariants}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {pagination.totalPages === 0 ? 0 : page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages || loading || pagination.totalPages === 0}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">
                {editingVariant ? "Edit Variant" : "Add Variant"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* PRODUCT */}
              <div>
                <label className="mb-1 block text-sm font-medium">Product *</label>
                <select
                  name="product"
                  value={form.product}
                  onChange={handleChange}
                  required
                  disabled={Boolean(editingVariant)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {editingVariant && (
                  <p className="mt-1 text-xs text-gray-500">
                    Product cannot be changed while editing a variant.
                  </p>
                )}
              </div>

              {/* NAME */}
              <div>
                <label className="mb-1 block text-sm font-medium">Variant Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Example: 500 g / 1 kg / 1 litre"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* SKU & BARCODE */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">SKU (optional)</label>
                  <input
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="Leave blank to auto-generate"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Barcode (optional)</label>
                  <input
                    type="text"
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="Enter barcode"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* UNIT VALUE AND UNIT */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Unit Value *</label>
                  <input
                    type="number"
                    name="unitValue"
                    value={form.unitValue}
                    onChange={handleChange}
                    required
                    min="0.001"
                    step="any"
                    placeholder="Example: 500"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Unit *</label>
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select unit</option>
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="l">Litre (l)</option>
                    <option value="piece">Piece</option>
                    <option value="pack">Pack</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </div>
              </div>

              {/* PRICES */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">MRP (₹) *</label>
                  <input
                    type="number"
                    name="mrp"
                    value={form.mrp}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="₹"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Selling Price (₹) *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={form.sellingPrice}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="₹"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* SHIPPING WEIGHT */}
              <div>
                <label className="mb-1 block text-sm font-medium">Shipping Weight (grams)</label>
                <input
                  type="number"
                  name="shippingWeight"
                  value={form.shippingWeight}
                  onChange={handleChange}
                  min="0"
                  step="any"
                  placeholder="Example: 530"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* DIMENSIONS */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Package Dimensions (optional)</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <input
                    type="number"
                    name="length"
                    value={form.dimensions.length}
                    onChange={handleDimensionChange}
                    min="0"
                    step="any"
                    placeholder="Length"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    name="width"
                    value={form.dimensions.width}
                    onChange={handleDimensionChange}
                    min="0"
                    step="any"
                    placeholder="Width"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    name="height"
                    value={form.dimensions.height}
                    onChange={handleDimensionChange}
                    min="0"
                    step="any"
                    placeholder="Height"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    name="unit"
                    value={form.dimensions.unit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          unit: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cm">Centimetres (cm)</option>
                    <option value="inch">Inches</option>
                  </select>
                </div>
              </div>

              {/* IMAGES */}
              <div>
                <label className="mb-1 block text-sm font-medium">Variant Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum 5 images, 5MB each.
                </p>
                {images.length > 0 && (
                  <p className="mt-1 text-xs text-indigo-600 font-medium">
                    {images.length} new image(s) selected
                  </p>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white font-semibold transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingVariant
                    ? "Update Variant"
                    : "Add Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION POPUP */}
      {showStatusPopup && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <Power size={40} className="mx-auto mb-4 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-900">Change Variant Status?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to{" "}
              {selectedVariant.status === "active" ? "deactivate" : "activate"}{" "}
              <b>{selectedVariant.name}</b>?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowStatusPopup(false);
                  setSelectedVariant(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleStatusChange}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white font-semibold transition hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading ? "Please wait..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP */}
      {showDeletePopup && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <Trash2 size={40} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Delete Variant?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete <b>{selectedVariant.name}</b>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedVariant(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white font-semibold transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Variants;