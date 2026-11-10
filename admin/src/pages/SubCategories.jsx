
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Power,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "../api/api";

export default function SubCategories() {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);

  // Search, filters and sorting
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalSubCategories: 0,
  });

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    image: null,
  });

  const [imagePreview, setImagePreview] = useState("");

  // Delete modal
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status confirmation modal
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Fetch categories
  const getCategories = async () => {
    try {
      const res = await api.get("/categories");

      const data =
        res.data?.categories ||
        res.data?.data?.categories ||
        res.data?.data ||
        res.data;

      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Categories fetch error:", error);
    }
  };

  // Fetch subcategories
  const getSubCategories = async () => {
    try {
      setLoading(true);

      const res = await api.get("/subcategories", {
        params: {
          search,
          category: categoryFilter,
          status: statusFilter,
          sortBy,
          order: sortOrder,
          page,
          limit,
        },
      });

      const data = res.data?.data || res.data;

      setSubCategories(
        data?.subCategories ||
        data?.subcategories ||
        data?.results ||
        []
      );

      setPagination(
        data?.pagination || {
          currentPage: page,
          totalPages: 0,
          totalSubCategories: 0,
        }
      );
    } catch (error) {
      console.error("Subcategories fetch error:", error);
      setSubCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  useEffect(() => {
    getSubCategories();
  }, [
    search,
    categoryFilter,
    statusFilter,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  // Form handlers
  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      description: "",
      image: null,
    });
    setImagePreview("");
    setEditId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG and WEBP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should not exceed 5MB.");
      e.target.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      image: file,
    }));

    setImagePreview(URL.createObjectURL(file));
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (subCategory) => {
    setEditId(subCategory._id);

    setForm({
      name: subCategory.name || "",
      category:
        subCategory.category?._id ||
        subCategory.category ||
        "",
      description: subCategory.description || "",
      image: null,
    });

    setImagePreview(
      subCategory.image?.url ||
      subCategory.image ||
      ""
    );

    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter subcategory name.");
      return;
    }

    if (!form.category) {
      alert("Please select a category.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("category", form.category);
      formData.append("description", form.description);

      if (form.image) {
        formData.append("image", form.image);
      }

      if (editId) {
        await api.put(`/subcategories/${editId}`, formData);
      } else {
        await api.post("/subcategories", formData);
      }

      closeForm();
      getSubCategories();
    } catch (error) {
      console.error("Save subcategory error:", error);

      alert(
        error.response?.data?.message ||
        "Something went wrong while saving subcategory."
      );
    } finally {
      setSaving(false);
    }
  };

  // Status confirmation popup
  const openStatusPopup = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setShowStatusPopup(true);
  };

  const closeStatusPopup = () => {
    if (statusLoading) return;

    setShowStatusPopup(false);
    setSelectedSubCategory(null);
  };

  // Status changes ONLY after confirmation
  const handleStatusChange = async () => {
    if (!selectedSubCategory) return;

    const newStatus =
      selectedSubCategory.status === "active"
        ? "inactive"
        : "active";

    try {
      setStatusLoading(true);

      await api.patch(
        `/subcategories/${selectedSubCategory._id}/status`,
        {
          status: newStatus,
        }
      );

      setShowStatusPopup(false);
      setSelectedSubCategory(null);

      getSubCategories();
    } catch (error) {
      console.error("Status update error:", error);

      alert(
        error.response?.data?.message ||
        "Unable to update subcategory status."
      );
    } finally {
      setStatusLoading(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      await api.delete(`/subcategories/${deleteId}`);

      setDeleteId(null);
      getSubCategories();
    } catch (error) {
      console.error("Delete subcategory error:", error);

      alert(
        error.response?.data?.message ||
        "Unable to delete subcategory."
      );
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryName = (subCategory) => {
    if (subCategory.category && typeof subCategory.category === "object") {
      return subCategory.category.name || "N/A";
    }

    const category = categories.find(
      (item) => item._id === subCategory.category
    );

    return category?.name || "N/A";
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Sub Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product subcategories
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition"
        >
          <Plus size={18} />
          Add Sub Category
        </button>
      </div>

      {/* Search, Filters and Sorting */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search subcategory..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">All Categories</option>

            {categories.map((category) => (
              <option
                key={category._id}
                value={category._id}
              >
                {category.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Sorting */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="createdAt">Date</option>
              <option value="name">Name</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="desc">DESC</option>
              <option value="asc">ASC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">

            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 font-semibold text-gray-600">
                  #
                </th>

                <th className="px-5 py-4 font-semibold text-gray-600">
                  Image
                </th>

                <th className="px-5 py-4 font-semibold text-gray-600">
                  Sub Category
                </th>

                <th className="px-5 py-4 font-semibold text-gray-600">
                  Category
                </th>

                <th className="px-5 py-4 font-semibold text-gray-600">
                  Slug
                </th>

                <th className="px-5 py-4 font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-5 py-4 font-semibold text-gray-600 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <Loader2
                      className="animate-spin mx-auto text-orange-500"
                      size={28}
                    />
                    <p className="text-gray-500 mt-2">
                      Loading subcategories...
                    </p>
                  </td>
                </tr>
              ) : subCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-12 text-center text-gray-500"
                  >
                    No subcategories found.
                  </td>
                </tr>
              ) : (
                subCategories.map((subCategory, index) => (
                  <tr
                    key={subCategory._id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-4 text-gray-500">
                      {(page - 1) * limit + index + 1}
                    </td>

                    {/* Image */}
                    <td className="px-5 py-4">
                      {subCategory.image?.url || subCategory.image ? (
                        <img
                          src={
                            subCategory.image?.url ||
                            subCategory.image
                          }
                          alt={subCategory.name}
                          className="w-11 h-11 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4">
                      <span className="font-medium text-gray-800">
                        {subCategory.name}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 text-gray-600">
                      {getCategoryName(subCategory)}
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-4 text-gray-500">
                      {subCategory.slug || "-"}
                    </td>

                    {/* Status Badge - Not Clickable */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          subCategory.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {subCategory.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">

                        {/* Edit */}
                        <button
                          onClick={() => openEditForm(subCategory)}
                          title="Edit"
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        >
                          <Pencil size={17} />
                        </button>

                        {/* Power - Opens Confirmation Modal */}
                        <button
                          onClick={() => openStatusPopup(subCategory)}
                          title={
                            subCategory.status === "active"
                              ? "Deactivate"
                              : "Activate"
                          }
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                        >
                          <Power size={18} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(subCategory._id)}
                          title="Delete"
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-200">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Rows per page:</span>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <span className="ml-2">
              Total: {pagination.totalSubCategories || 0}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Page {pagination.currentPage || page} of{" "}
              {pagination.totalPages || 1}
            </span>

            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              onClick={() =>
                setPage((prev) =>
                  Math.min(
                    pagination.totalPages || 1,
                    prev + 1
                  )
                )
              }
              disabled={page >= (pagination.totalPages || 1)}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">

            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editId ? "Edit Sub Category" : "Add Sub Category"}
              </h2>

              <button
                onClick={closeForm}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub Category Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="Enter subcategory name"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>

                <select
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Select Category</option>

                  {categories.map((category) => (
                    <option
                      key={category._id}
                      value={category._id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Enter description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Category Image
                </label>

                {imagePreview && (
                  <div className="mb-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />

                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, WEBP (Maximum 5MB)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium flex items-center gap-2 disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 size={17} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editId
                    ? "Update"
                    : "Create"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {showStatusPopup && selectedSubCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">

          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center shadow-xl">

            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-50 flex items-center justify-center">
              <Power
                size={32}
                className="text-orange-500"
              />
            </div>

            <h2 className="text-lg font-bold text-gray-800">
              Change Sub Category Status?
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to{" "}
              <span className="font-semibold text-gray-700">
                {selectedSubCategory.status === "active"
                  ? "deactivate"
                  : "activate"}
              </span>{" "}
              <span className="font-semibold text-gray-800">
                {selectedSubCategory.name}
              </span>
              ?
            </p>

            <div className="flex justify-center gap-3 mt-6">

              <button
                onClick={closeStatusPopup}
                disabled={statusLoading}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleStatusChange}
                disabled={statusLoading}
                className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {statusLoading && (
                  <Loader2 size={16} className="animate-spin" />
                )}

                {statusLoading ? "Updating..." : "Confirm"}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">

          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center shadow-xl">

            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle
                size={32}
                className="text-red-500"
              />
            </div>

            <h2 className="text-lg font-bold text-gray-800">
              Delete Sub Category?
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to delete this subcategory?
              This action cannot be undone.
            </p>

            <div className="flex justify-center gap-3 mt-6">

              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2 disabled:opacity-60"
              >
                {deleting && (
                  <Loader2 size={16} className="animate-spin" />
                )}

                {deleting ? "Deleting..." : "Delete"}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
