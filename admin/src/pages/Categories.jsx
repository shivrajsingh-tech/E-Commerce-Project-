import { useCallback, useEffect, useState } from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    CheckCircle,
    XCircle,
} from "lucide-react";
import toast from 'react-hot-toast';
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const Categories = () => {
    const { hasPermission } = useAuth();
    const canCreate       = hasPermission("categories.create");
    const canUpdate       = hasPermission("categories.update");
    const canDelete       = hasPermission("categories.delete");
    const canChangeStatus = hasPermission("categories.status_change");
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
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
        totalCategories: 0,
    });

    // Form & Modal States
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [form, setForm] = useState({
        name: "",
        description: "",
        image: null,
    });

    // =========================
    // FETCH CATEGORIES
    // =========================
    const getCategories = useCallback(async () => {
        try {
            setLoading(true);

            const response = await api.get("/categories", {
                params: {
                    search,
                    status: statusFilter,
                    sortBy,
                    order,
                    page,
                    limit,
                },
            });

            const data = response.data?.categories || [];
            setCategories(Array.isArray(data) ? data : []);

            setPagination(
                response.data?.pagination || {
                    currentPage: 1,
                    totalPages: 0,
                    totalCategories: 0,
                }
            );
        } catch (error) {
            console.error(
                error.response?.data?.message || "Failed to fetch categories"
            );
            setCategories([]);
            setPagination({
                currentPage: 1,
                totalPages: 0,
                totalCategories: 0,
            });
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, sortBy, order, page, limit]);

    // Debounce search by 350ms; trigger immediately for filter/page/sort changes
    useEffect(() => {
        const timer = setTimeout(() => {
            getCategories();
        }, search ? 350 : 0);

        return () => clearTimeout(timer);
    }, [getCategories, search]);

    // =========================
    // FORM HANDLERS
    // =========================
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: files ? files[0] : value,
        }));
    };

    const handleAdd = () => {
        setEditId(null);
        setForm({
            name: "",
            description: "",
            image: null,
        });
        setShowForm(true);
    };

    const handleEdit = (category) => {
        setEditId(category._id);
        setForm({
            name: category.name || "",
            description: category.description || "",
            image: null,
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditId(null);
        setForm({
            name: "",
            description: "",
            image: null,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("description", form.description);

            if (form.image) {
                formData.append("image", form.image);
            }

            if (editId) {
                await api.put(`/categories/${editId}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                await api.post("/categories", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            closeForm();
            if (page === 1) {
                await getCategories();
            } else {
                setPage(1);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save category");
        } finally {
            setSubmitting(false);
        }
    };

    // =========================
    // STATUS & DELETE
    // =========================
    const handleStatusChange = async (category) => {
        try {
            const newStatus = category.status === "active" ? "inactive" : "active";
            await api.patch(`/categories/${category._id}/status`, {
                status: newStatus,
            });
            await getCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change status");
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/categories/${id}`);
            setDeleteId(null);

            // If the last remaining row on page > 1 was removed, step back one page
            if (categories.length === 1 && page > 1) {
                setPage((prev) => prev - 1);
            } else {
                await getCategories();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete category");
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your product categories
                    </p>
                </div>

                {canCreate && (
                <button
                    onClick={handleAdd}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition"
                >
                    <Plus size={18} />
                    Add Category
                </button>
                )}
            </div>

            {/* SEARCH & FILTERS CONTROLS */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search input */}
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search category, slug..."
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

                {/* Sort Field */}
                <select
                    value={sortBy}
                    onChange={(e) => {
                        setSortBy(e.target.value);
                        setPage(1);
                    }}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 outline-none text-sm text-slate-700 bg-white"
                >
                    <option value="createdAt">Created Date</option>
                    <option value="name">Category Name</option>
                    <option value="slug">Slug</option>
                    <option value="status">Status</option>
                </select>

                {/* Sort Order */}
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
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                                    Category
                                </th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                                    Slug
                                </th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                                    Status
                                </th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="4"
                                        className="text-center py-10 text-slate-500 text-sm"
                                    >
                                        Loading categories...
                                    </td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="4"
                                        className="text-center py-10 text-slate-500 text-sm"
                                    >
                                        No categories found. Try adjusting your search or filters.
                                    </td>
                                </tr>
                            ) : (
                                categories.map((category) => (
                                    <tr
                                        key={category._id}
                                        className="hover:bg-slate-50 transition"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {category.image?.url ? (
                                                    <img
                                                        src={category.image.url}
                                                        alt={category.name}
                                                        className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                        {(category.name || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">
                                                        {category.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">
                                                        {category.description || "No description"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                                                {category.slug}
                                            </code>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    category.status === "active"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {category.status}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {canUpdate && (
                                                <button
                                                    onClick={() => handleEdit(category)}
                                                    className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                                                    title="Edit"
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                )}

                                                {canChangeStatus && (
                                                <button
                                                    onClick={() => handleStatusChange(category)}
                                                    className={`p-2 rounded-lg ${
                                                        category.status === "active"
                                                            ? "text-red-600 hover:bg-red-50"
                                                            : "text-green-600 hover:bg-green-50"
                                                    }`}
                                                    title={category.status === "active" ? "Deactivate" : "Activate"}
                                                >
                                                    {category.status === "active" ? (
                                                        <XCircle size={17} />
                                                    ) : (
                                                        <CheckCircle size={17} />
                                                    )}
                                                </button>
                                                )}

                                                {canDelete && (
                                                <button
                                                    onClick={() => setDeleteId(category._id)}
                                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                    <span>Total: {pagination.totalCategories}</span>
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

            {/* ADD / EDIT MODAL */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editId ? "Edit Category" : "Add Category"}
                            </h2>
                            <button
                                onClick={closeForm}
                                className="text-slate-500 hover:text-slate-800"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Enter category name"
                                    required
                                    className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Enter category description"
                                    rows="3"
                                    className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Category Image
                                </label>
                                <input
                                    type="file"
                                    name="image"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {editId && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Leave empty to keep the existing image.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {submitting
                                        ? "Saving..."
                                        : editId
                                          ? "Update Category"
                                          : "Add Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Delete Category?
                        </h2>
                        <p className="text-sm text-slate-500 mt-2">
                            Are you sure you want to delete this category?
                        </p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

export default Categories;