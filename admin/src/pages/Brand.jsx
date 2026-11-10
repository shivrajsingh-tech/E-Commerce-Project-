import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  X,
} from "lucide-react";
import api from "../api/api";
import toast from "react-hot-toast";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const Brand = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search, Filter, Sort & Pagination States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalBrands: 0,
  });

  // Modal & Selection States
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState(null);

  // ================= GET BRANDS =================

  const getBrands = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/brands/get-brands", {
        params: {
          search,
          status: statusFilter,
          sortBy,
          order,
          page,
          limit,
        },
      });

      const data = response.data?.brands || response.data?.data || [];
      setBrands(Array.isArray(data) ? data : []);

      setPagination(
        response.data?.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalBrands: 0,
        }
      );
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to fetch brands"
      );
      setBrands([]);
      setPagination({
        currentPage: 1,
        totalPages: 0,
        totalBrands: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, order, page, limit]);

  // Debounce search by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      getBrands();
    }, search ? 350 : 0);

    return () => clearTimeout(timer);
  }, [getBrands, search]);

  // ================= FORM CONTROLS =================

  const resetForm = () => {
    setName("");
    setDescription("");
    setLogo(null);
    setEditingBrand(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (brand) => {
    setEditingBrand(brand);
    setName(brand.name || "");
    setDescription(brand.description || "");
    setLogo(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      toast.error("Brand name is required");
      return;
    }

    if (cleanName.length < 2) {
      toast.error("Brand name must be at least 2 characters long");
      return;
    }

    if (logo) {
      if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
        toast.error("Logo must be JPG, JPEG, PNG, or WEBP");
        return;
      }
      if (logo.size > MAX_LOGO_SIZE) {
        toast.error("Logo size must not exceed 5 MB");
        return;
      }
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("name", cleanName);
      formData.append("description", cleanDescription);

      if (logo) {
        formData.append("logo", logo);
      }

      if (editingBrand) {
        await api.put(`/brands/update-brand/${editingBrand._id}`, formData);
      } else {
        await api.post("/brands/add-brand", formData);
      }

      setShowForm(false);
      resetForm();
      toast.success(editingBrand ? "Brand updated successfully" : "Brand added successfully");

      if (page === 1) {
        await getBrands();
      } else {
        setPage(1);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong while saving the brand"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ================= STATUS =================

  const handleStatusChange = async () => {
    if (!selectedBrand) return;

    try {
      await api.patch(`/brands/change-brand-status/${selectedBrand._id}`, {
        status: selectedBrand.status === "active" ? "inactive" : "active",
      });

      setShowStatusPopup(false);
      setSelectedBrand(null);
      toast.success("Brand status updated successfully");

      await getBrands();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to change brand status"
      );
    }
  };

  // ================= DELETE =================

  const handleDelete = async () => {
    if (!selectedBrand) return;

    try {
      await api.delete(`/brands/delete-brand/${selectedBrand._id}`);

      setShowDeletePopup(false);
      setSelectedBrand(null);
      toast.success("Brand deleted successfully");

      if (brands.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await getBrands();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete brand"
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Brands</h1>
          <p className="text-gray-500 text-sm mt-1">Manage product brands</p>
        </div>

        <button
          onClick={openAddForm}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          Add Brand
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search brand, slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2.5 outline-none text-sm text-slate-700 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Sort By Field */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2.5 outline-none text-sm text-slate-700 bg-white"
        >
          <option value="createdAt">Created Date</option>
          <option value="name">Name</option>
          <option value="slug">Slug</option>
          <option value="status">Status</option>
        </select>

        {/* Order */}
        <select
          value={order}
          onChange={(e) => {
            setOrder(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2.5 outline-none text-sm text-slate-700 bg-white"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            Loading brands...
          </div>
        ) : brands.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            No brands found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Logo
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Description
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {brands.map((brand) => (
                  <tr
                    key={brand._id}
                    className="hover:bg-gray-50 transition"
                  >
                    {/* LOGO */}
                    <td className="px-6 py-4">
                      {brand.logo?.url ? (
                        <img
                          src={brand.logo.url}
                          alt={brand.name}
                          className="w-12 h-12 rounded-lg object-contain border border-slate-200 p-1 bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          No Logo
                        </div>
                      )}
                    </td>

                    {/* NAME */}
                    <td className="px-6 py-4 font-medium text-gray-800 text-sm">
                      {brand.name}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-6 py-4 text-gray-500 max-w-xs text-sm">
                      <p className="truncate">
                        {brand.description || "-"}
                      </p>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedBrand(brand);
                          setShowStatusPopup(true);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          brand.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {brand.status || "inactive"}
                      </button>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditForm(brand)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedBrand(brand);
                            setShowStatusPopup(true);
                          }}
                          className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                          title={brand.status === "active" ? "Deactivate" : "Activate"}
                        >
                          <Power size={17} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedBrand(brand);
                            setShowDeletePopup(true);
                          }}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BACKEND PAGINATION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>Total: {pagination.totalBrands}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => prev - 1)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
          >
            Previous
          </button>

          <span className="text-sm text-slate-600">
            Page {pagination.totalPages === 0 ? 0 : page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((prev) => prev + 1)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* ================= ADD / EDIT MODAL ================= */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingBrand ? "Edit Brand" : "Add Brand"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* NAME */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Enter brand name"
                  className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows="4"
                  placeholder="Enter description"
                  className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* LOGO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Logo
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) {
                      setLogo(null);
                      return;
                    }
                    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
                      toast.error("Logo must be JPG, JPEG, PNG, or WEBP");
                      e.target.value = "";
                      setLogo(null);
                      return;
                    }
                    if (file.size > MAX_LOGO_SIZE) {
                      toast.error("Logo size must not exceed 5 MB");
                      e.target.value = "";
                      setLogo(null);
                      return;
                    }
                    setLogo(file);
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Allowed formats: JPG, PNG, WEBP. Maximum size: 5 MB.</p>

                {logo && (
                  <p className="text-xs text-emerald-600 mt-1">Selected: {logo.name}</p>
                )}

                {editingBrand && editingBrand.logo?.url && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Current Logo</p>
                    <img
                      src={editingBrand.logo.url}
                      alt={editingBrand.name}
                      className="w-16 h-16 object-contain border rounded-lg p-1"
                    />
                  </div>
                )}

                {editingBrand && (
                  <p className="text-xs text-gray-400 mt-2">
                    Leave empty to keep the existing logo.
                  </p>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm transition"
                >
                  {submitting
                    ? "Saving..."
                    : editingBrand
                    ? "Update Brand"
                    : "Add Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STATUS POPUP ================= */}
      {showStatusPopup && selectedBrand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center shadow-xl">
            <Power
              size={40}
              className="mx-auto text-orange-500 mb-4"
            />
            <h2 className="text-lg font-semibold text-slate-900">
              Change Brand Status?
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Are you sure you want to change the status of{" "}
              <b>{selectedBrand.name}</b>?
            </p>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusPopup(false);
                  setSelectedBrand(null);
                }}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleStatusChange}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE POPUP ================= */}
      {showDeletePopup && selectedBrand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center shadow-xl">
            <Trash2
              size={40}
              className="mx-auto text-red-500 mb-4"
            />
            <h2 className="text-lg font-semibold text-slate-900">
              Delete Brand?
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Are you sure you want to delete <b>{selectedBrand.name}</b>?
            </p>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedBrand(null);
                }}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brand;