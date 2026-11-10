import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
  Minus,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const emptyVariant = () => ({
  _id: "",
  name: "",
  unitValue: "1",
  unit: "piece",
  mrp: "",
  sellingPrice: "",
  status: "active",
});

const emptyForm = () => ({
  name: "",
  description: "",
  category: "",
  subCategory: "",
  brand: "",
  specifications: [],
  variants: [emptyVariant()],
});

const getId = (value) => value?._id || value || "";

const getList = (data, ...keys) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function Products() {
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("products.create");
  const canUpdate = hasPermission("products.update");
  const canDelete = hasPermission("products.delete");
  const canChangeStatus = hasPermission("products.status_change");

  const hasRowActions = canUpdate || canDelete;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [form, setForm] = useState(emptyForm());
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  // Fetch products
  const getProducts = async (
    currentPage = page,
    currentSearch = search,
    currentLimit = limit
  ) => {
    try {
      setLoading(true);

      const { data } = await api.get("/products", {
        params: {
          page: currentPage,
          limit: currentLimit,
          search: currentSearch,
        },
      });

      setProducts(data?.products || []);
      setPagination(
        data?.pagination || {
          total: 0,
          page: currentPage,
          limit: currentLimit,
          totalPages: 0,
        }
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch products");
      setProducts([]);
      setPagination({
        total: 0,
        page: currentPage,
        limit: currentLimit,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown options
  const loadOptions = async () => {
    const results = await Promise.allSettled([
      api.get("/categories"),
      api.get("/subcategories"),
      api.get("/brands/get-brands"),
    ]);

    if (results[0].status === "fulfilled") {
      setCategories(getList(results[0].value.data, "categories"));
    } else {
      toast.error("Failed to load categories");
    }

    if (results[1].status === "fulfilled") {
      setSubCategories(
        getList(results[1].value.data, "subCategories", "subcategories")
      );
    } else {
      toast.error("Failed to load subcategories");
    }

    if (results[2].status === "fulfilled") {
      setBrands(getList(results[2].value.data, "brands"));
    } else {
      toast.error("Failed to load brands");
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      getProducts(page, search, limit);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search, limit]);

  // Sorting
  const sortedProducts = useMemo(() => {
    const list = [...products];

    if (sort === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sort === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === "price-low") {
      list.sort((a, b) => {
        const priceA = Math.min(
          ...(a.variants || []).map((v) => Number(v.sellingPrice) || 0),
          Infinity
        );
        const priceB = Math.min(
          ...(b.variants || []).map((v) => Number(v.sellingPrice) || 0),
          Infinity
        );
        return priceA - priceB;
      });
    } else if (sort === "price-high") {
      list.sort((a, b) => {
        const priceA = Math.min(
          ...(a.variants || []).map((v) => Number(v.sellingPrice) || 0),
          Infinity
        );
        const priceB = Math.min(
          ...(b.variants || []).map((v) => Number(v.sellingPrice) || 0),
          Infinity
        );
        return priceB - priceA;
      });
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [products, sort]);

  // Form helpers
  const resetForm = () => {
    setForm(emptyForm());
    setExistingImages([]);
    setNewImages([]);
    setEditId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditId(product._id);
    setExistingImages(product.images || []);
    setNewImages([]);

    setForm({
      name: product.name || "",
      description: product.description || "",
      category: getId(product.category),
      subCategory: getId(product.subCategory),
      brand: getId(product.brand),
      specifications: (product.specifications || []).map((item) => ({
        key: item.key || "",
        value: item.value || "",
      })),
      variants: product.variants?.length
        ? product.variants.map((v) => ({
            _id: v._id || "",
            name: v.name || "",
            unitValue: String(v.unitValue ?? 1),
            unit: v.unit || "piece",
            mrp: String(v.mrp ?? ""),
            sellingPrice: String(v.sellingPrice ?? ""),
            status: v.status || "active",
          }))
        : [emptyVariant()],
    });

    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCategoryChange = (event) => {
    setForm((previous) => ({
      ...previous,
      category: event.target.value,
      subCategory: "",
    }));
  };

  // Variant operations
  const handleVariantChange = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      ),
    }));
  };

  const addVariant = () => {
    setForm((previous) => ({
      ...previous,
      variants: [...previous.variants, emptyVariant()],
    }));
  };

  const removeVariant = (index) => {
    if (form.variants.length === 1) {
      toast.error("At least one variant is required");
      return;
    }

    setForm((previous) => ({
      ...previous,
      variants: previous.variants.filter((_, i) => i !== index),
    }));
  };

  // Specifications
  const addSpecification = () => {
    setForm((previous) => ({
      ...previous,
      specifications: [...previous.specifications, { key: "", value: "" }],
    }));
  };

  const changeSpecification = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      specifications: previous.specifications.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeSpecification = (index) => {
    setForm((previous) => ({
      ...previous,
      specifications: previous.specifications.filter((_, i) => i !== index),
    }));
  };

  // Images
  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (existingImages.length + newImages.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      event.target.value = "";
      return;
    }

    for (const file of files) {
      if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name}: JPG, PNG or WEBP only`);
        event.target.value = "";
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name}: maximum size is 5 MB`);
        event.target.value = "";
        return;
      }
    }

    setNewImages((previous) => [...previous, ...files]);
    event.target.value = "";
  };

  const removeNewImage = (index) => {
    setNewImages((previous) => previous.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages((previous) => previous.filter((_, i) => i !== index));
  };

  // Submit
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.category || !form.subCategory || !form.brand) {
      toast.error("Enter product name, category, subcategory and brand");
      return;
    }

    if (!form.variants.length) {
      toast.error("Add at least one variant");
      return;
    }

    for (const [index, variant] of form.variants.entries()) {
      const row = index + 1;
      if (!variant.name.trim()) {
        toast.error(`Variant ${row}: name is required`);
        return;
      }

      if (!variant.unitValue || Number(variant.unitValue) <= 0) {
        toast.error(`Variant ${row}: valid unit value is required`);
        return;
      }

      if (variant.mrp === "" || Number(variant.mrp) <= 0) {
        toast.error(`Variant ${row}: valid MRP is required`);
        return;
      }

      if (variant.sellingPrice === "" || Number(variant.sellingPrice) < 0) {
        toast.error(`Variant ${row}: valid selling price is required`);
        return;
      }

      if (Number(variant.sellingPrice) > Number(variant.mrp)) {
        toast.error(`Variant ${row}: selling price cannot exceed MRP`);
        return;
      }
    }

    if (!editId && newImages.length === 0) {
      toast.error("Product must have at least one image");
      return;
    }

    if (existingImages.length + newImages.length === 0) {
      toast.error("Product must have at least one image");
      return;
    }

    const invalidSpecification = form.specifications.some(
      (item) => !item.key.trim() || !String(item.value).trim()
    );

    if (invalidSpecification) {
      toast.error("Complete each specification or remove the empty row");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("subCategory", form.subCategory);
      formData.append("brand", form.brand);

      formData.append(
        "specifications",
        JSON.stringify(
          form.specifications.map((item) => ({
            key: item.key.trim(),
            value: String(item.value).trim(),
          }))
        )
      );

      // Variants sent without SKU; backend handles auto-generation
      formData.append(
        "variants",
        JSON.stringify(
          form.variants.map((v) => ({
            ...(v._id ? { _id: v._id } : {}),
            name: v.name.trim(),
            unitValue: Number(v.unitValue),
            unit: v.unit,
            mrp: Number(v.mrp),
            sellingPrice: Number(v.sellingPrice),
            status: v.status || "active",
          }))
        )
      );

      if (editId) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      newImages.forEach((image) => {
        formData.append("images", image);
      });

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (editId) {
        await api.put(`/products/${editId}`, formData, config);
        toast.success("Product updated successfully");
      } else {
        await api.post("/products", formData, config);
        toast.success("Product added successfully");
      }

      closeForm();
      await getProducts(page, search, limit);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change
  const handleStatusChange = async (productId, currentStatus) => {
    if (!canChangeStatus || statusUpdatingId) return;

    try {
      setStatusUpdatingId(productId);
      const status = currentStatus === "active" ? "inactive" : "active";

      await api.patch(`/products/${productId}/status`, { status });
      toast.success("Product status updated");
      await getProducts(page, search, limit);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Delete Product
  const confirmDelete = async () => {
    if (!deleteId || deleting) return;

    try {
      setDeleting(true);
      await api.delete(`/products/${deleteId}`);

      toast.success("Product deleted successfully");
      setShowDelete(false);
      setDeleteId(null);

      if (products.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await getProducts(page, search, limit);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const filteredSubCategories = subCategories.filter(
    (item) => String(getId(item.category)) === String(form.category)
  );

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1";
  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage product catalog, packs, and pricing
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 text-sm font-semibold"
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 justify-between">
        <div className="relative max-w-md w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search product..."
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>

          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className={`${inputClass} w-auto`}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Loading products...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {[
                    "Product",
                    "Category",
                    "Price",
                    "Total stock",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-left px-5 py-4 text-xs font-bold uppercase text-slate-600"
                    >
                      {heading}
                    </th>
                  ))}

                  {hasRowActions && (
                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-slate-600">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {!sortedProducts.length ? (
                  <tr>
                    <td
                      colSpan={hasRowActions ? 6 : 5}
                      className="text-center py-12 text-slate-500"
                    >
                      No products found
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((product) => {
                    const firstVariant = product.variants?.[0];
                    const availableStock =
                      product.inventory?.availableQuantity ?? 0;

                    return (
                      <tr
                        key={product._id}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                              {product.images?.[0]?.url ? (
                                <img
                                  src={product.images[0].url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon
                                  size={20}
                                  className="text-slate-400"
                                />
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-sm text-slate-800">
                                {product.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {product.brand?.name || "-"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {product.variants?.length || 0} variant(s)
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-700">
                            {product.category?.name || "-"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {product.subCategory?.name || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {firstVariant ? (
                            <>
                              <p className="font-semibold text-sm text-slate-800">
                                ₹{money(firstVariant.sellingPrice)}
                              </p>
                              {Number(firstVariant.mrp) >
                                Number(firstVariant.sellingPrice) && (
                                <p className="text-xs text-slate-400 line-through">
                                  ₹{money(firstVariant.mrp)}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                {firstVariant.name}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No variants
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`text-sm font-medium ${
                              availableStock > 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {availableStock}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            disabled={
                              !canChangeStatus ||
                              statusUpdatingId === product._id
                            }
                            onClick={() =>
                              handleStatusChange(product._id, product.status)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                              product.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {statusUpdatingId === product._id
                              ? "Updating..."
                              : product.status || "active"}
                          </button>
                        </td>

                        {hasRowActions && (
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {canUpdate && (
                                <button
                                  title="Edit product"
                                  type="button"
                                  onClick={() => openEditForm(product)}
                                  className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  title="Delete product"
                                  type="button"
                                  onClick={() => {
                                    setDeleteId(product._id);
                                    setShowDelete(true);
                                  }}
                                  className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Total Products: {pagination.total || 0} | Page {page} of {totalPages}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((previous) => previous - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-40 text-sm"
          >
            Previous
          </button>

          <span className="text-sm font-semibold">{page}</span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((previous) => previous + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-40 text-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold">
                  {editId ? "Edit Product" : "Add Product"}
                </h2>
                <p className="text-xs text-slate-500">
                  Basic details, packs & variants
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Product Basic Details */}
              <section>
                <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">
                  Basic details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Product name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      maxLength={200}
                      className={inputClass}
                      placeholder="e.g. Fortune Sunlite Sunflower Oil"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Category *</label>
                    <select
                      value={form.category}
                      onChange={handleCategoryChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select category</option>
                      {categories.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Subcategory *</label>
                    <select
                      name="subCategory"
                      value={form.subCategory}
                      onChange={handleChange}
                      required
                      disabled={!form.category}
                      className={inputClass}
                    >
                      <option value="">Select subcategory</option>
                      {filteredSubCategories.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Brand *</label>
                    <select
                      name="brand"
                      value={form.brand}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select brand</option>
                      {brands.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      className={inputClass}
                      placeholder="Product details & description"
                    />
                  </div>
                </div>
              </section>

              {/* Variants Section */}
              <section className="border-t pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase text-slate-600">
                    Variants & Packs *
                  </h3>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-1 text-sm font-semibold text-indigo-600"
                  >
                    <Plus size={16} />
                    Add Variant
                  </button>
                </div>

                <div className="space-y-4">
                  {form.variants.map((variant, index) => (
                    <div
                      key={variant._id || `new-${index}`}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-sm text-slate-700">
                          Variant {index + 1}
                        </p>
                        {form.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-rose-600 p-1 hover:bg-rose-50 rounded"
                            title="Remove variant"
                          >
                            <Minus size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="md:col-span-2 lg:col-span-2">
                          <label className={labelClass}>Variant Name *</label>
                          <input
                            value={variant.name}
                            onChange={(e) =>
                              handleVariantChange(index, "name", e.target.value)
                            }
                            className={inputClass}
                            placeholder="e.g. 1 Litre Pouch"
                            required
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Unit Value *</label>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={variant.unitValue}
                            onChange={(e) =>
                              handleVariantChange(index, "unitValue", e.target.value)
                            }
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Unit *</label>
                          <select
                            value={variant.unit}
                            onChange={(e) =>
                              handleVariantChange(index, "unit", e.target.value)
                            }
                            className={inputClass}
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="l">l</option>
                            <option value="piece">piece</option>
                            <option value="pack">pack</option>
                            <option value="dozen">dozen</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelClass}>MRP (₹) *</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={variant.mrp}
                            onChange={(e) =>
                              handleVariantChange(index, "mrp", e.target.value)
                            }
                            className={inputClass}
                            placeholder="e.g. 180"
                            required
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Selling Price (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.sellingPrice}
                            onChange={(e) =>
                              handleVariantChange(index, "sellingPrice", e.target.value)
                            }
                            className={inputClass}
                            placeholder="e.g. 155"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Product Images */}
              <section className="border-t pt-5">
                <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">
                  Product images (up to 5)
                </h3>

                {existingImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    {existingImages.map((image, index) => (
                      <div
                        key={image.publicId || index}
                        className="relative rounded-xl overflow-hidden border"
                      >
                        <img
                          src={image.url}
                          alt="Product"
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:bg-slate-50">
                  <ImageIcon
                    size={26}
                    className="mx-auto text-slate-400 mb-2"
                  />
                  <p className="text-sm font-semibold">Upload images</p>
                  <p className="text-xs text-slate-400">
                    JPG, PNG or WEBP • Maximum 5 MB each
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {newImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                    {newImages.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative rounded-xl overflow-hidden border"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Specifications */}
              <section className="border-t pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase text-slate-600">
                    Specifications
                  </h3>
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="text-sm font-semibold text-indigo-600 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add specification
                  </button>
                </div>

                {form.specifications.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mb-3"
                  >
                    <input
                      value={item.key}
                      onChange={(event) =>
                        changeSpecification(index, "key", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Key (e.g. Diet Type)"
                    />
                    <input
                      value={item.value}
                      onChange={(event) =>
                        changeSpecification(index, "value", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Value (e.g. Vegetarian)"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecification(index)}
                      className="text-rose-600 p-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </section>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {submitting
                    ? "Saving..."
                    : editId
                    ? "Update Product"
                    : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">
              Delete product?
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              The product and its associated variants will be deactivated.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteId(null);
                }}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}