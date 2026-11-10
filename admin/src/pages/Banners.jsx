import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Eye, Code, Layout, Image as ImageIcon, Folder } from "lucide-react";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Link,
  List,
  Heading,
  Undo,
} from "ckeditor5";

import "ckeditor5/ckeditor5.css";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  title: "",
  badge: "LIMITED OFFER",
  subtitle: "",
  category: "", // null or "" = Global/All Categories
  imageUrl: "",
  link: "",
  content: "<p>Special discount details and terms here.</p>",
};

const ActionTooltip = ({ text, children, position = "top" }) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  };

  return (
    <div className="relative group/tip inline-flex items-center justify-center">
      {children}
      <div
        className={`pointer-events-none absolute ${positionClasses[position]} z-[100] flex items-center justify-center opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 ease-out`}
      >
        <span className="whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-normal text-slate-800 shadow-md select-none">
          {text}
        </span>
      </div>
    </div>
  );
};

const Banners = () => {
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("banners.create");
  const canUpdate = hasPermission("banners.update");
  const canDelete = hasPermission("banners.delete");
  const canChangeStatus = hasPermission("banners.status_change") || hasPermission("banners.status");

  const [banners, setBanners] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    sortBy: "createdAt",
    order: "desc",
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({ totalPages: 0, totalBanners: 0 });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [htmlMode, setHtmlMode] = useState(false);
  const [previewBanner, setPreviewBanner] = useState(null);

  // Fetch Categories for Dropdown
  const getCategories = useCallback(async () => {
    try {
      const res = await api.get("/categories/active");
      const list = res.data?.categories || res.data?.data || res.data || [];
      setCategoriesList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load categories for banner dropdown:", err);
    }
  }, []);

  useEffect(() => {
    getCategories();
  }, [getCategories]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const getBanners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/banners/get-banners", { params: filters });
      setBanners(res.data?.banners || res.data?.data || []);
      setPagination(res.data?.pagination || { totalPages: 0, totalBanners: 0 });
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to load banners");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => getBanners(), filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [getBanners, filters.search]);

  const handleOpenForm = (banner = null) => {
    setEditId(banner ? banner._id : null);
    setForm(
      banner
        ? {
            ...banner,
            category: banner.category?._id || banner.category || "",
            imageUrl: banner.image?.url || banner.imageUrl || "",
          }
        : { ...emptyForm }
    );
    setHtmlMode(false);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (editId && !canUpdate) {
      alert("Aapke paas banner update karne ki permission nahi hai.");
      return;
    }
    if (!editId && !canCreate) {
      alert("Aapke paas banner create karne ki permission nahi hai.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        category: form.category || null,
      };

      if (editId) {
        await api.put(`/banners/update-banner/${editId}`, payload);
        alert("Banner updated successfully");
      } else {
        await api.post("/banners/add-banner", payload);
        alert("Banner created successfully");
      }
      handleCloseForm();
      getBanners();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      alert("Aapke paas banner delete karne ki permission nahi hai.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await api.delete(`/banners/delete-banner/${id}`);
      getBanners();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete");
    }
  };

  const handleStatusToggle = async (banner) => {
    if (!canChangeStatus) {
      alert("Aapke paas banner status change karne ki permission nahi hai.");
      return;
    }
    const newStatus = banner.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/banners/update-banner-status/${banner._id}`, {
        status: newStatus,
      });
      getBanners();
    } catch (error) {
      alert(error.response?.data?.message || "Status update failed");
    }
  };

  const getCategoryName = (catIdOrObj) => {
    if (!catIdOrObj) return "All Categories (Global)";
    if (typeof catIdOrObj === "object" && catIdOrObj.name) return catIdOrObj.name;
    const found = categoriesList.find((c) => String(c._id) === String(catIdOrObj));
    return found ? found.name : "Category Linked";
  };

  return (
    <div className="space-y-6">
      {/* Scrollbar-free styling */}
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .ck-editor__editable_inline { min-height: 220px; max-height: 380px; }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Banner Management</h1>
          <p className="text-sm text-slate-500 mt-1">Design, edit, and assign promotional banners to categories</p>
        </div>
        {canCreate && (
          <ActionTooltip text="Create a new banner" position="bottom">
            <button
              type="button"
              onClick={() => handleOpenForm()}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all duration-300 ease-out shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
            >
              <Plus size={18} /> Add Banner
            </button>
          </ActionTooltip>
        )}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search banners..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all duration-200"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all duration-200 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all duration-200 cursor-pointer"
        >
          <option value="createdAt">Created Date</option>
          <option value="title">Title</option>
          <option value="badge">Badge</option>
        </select>

        <select
          value={filters.order}
          onChange={(e) => updateFilter("order", e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all duration-200 cursor-pointer"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <span className="text-sm font-medium">Fetching banners...</span>
          </div>
        ) : banners.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No banners found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/70 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Banner</th>
                  <th className="px-6 py-3.5 font-semibold">Category</th>
                  <th className="px-6 py-3.5 font-semibold">Badge</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banners.map((b) => (
                  <tr
                    key={b._id}
                    className="hover:bg-slate-50/60 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        {b.image?.url || b.imageUrl ? (
                          <img
                            src={b.image?.url || b.imageUrl}
                            alt={b.title}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{b.title}</p>
                          <p className="text-xs text-slate-400 truncate max-w-xs">{b.subtitle || b.link || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs rounded-md font-medium">
                        <Folder size={12} />
                        {getCategoryName(b.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md font-medium uppercase">
                        {b.badge || "DEAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ActionTooltip text={`Set to ${b.status === "active" ? "inactive" : "active"}`}>
                        <button
                          type="button"
                          disabled={!canChangeStatus}
                          onClick={() => handleStatusToggle(b)}
                          className={`px-3 py-1 rounded-full text-xs font-normal transition-all duration-200 ease-out hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100 ${
                            b.status === "active"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {b.status || "inactive"}
                        </button>
                      </ActionTooltip>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <ActionTooltip text="Preview">
                          <button
                            type="button"
                            onClick={() => setPreviewBanner(b)}
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                          >
                            <Eye size={17} />
                          </button>
                        </ActionTooltip>
                        {canUpdate && (
                          <ActionTooltip text="Edit">
                            <button
                              type="button"
                              onClick={() => handleOpenForm(b)}
                              className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                            >
                              <Pencil size={17} />
                            </button>
                          </ActionTooltip>
                        )}
                        {canDelete && (
                          <ActionTooltip text="Delete">
                            <button
                              type="button"
                              onClick={() => handleDelete(b._id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                            >
                              <Trash2 size={17} />
                            </button>
                          </ActionTooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between text-sm text-slate-500 px-1">
        <span>Total: {pagination.totalBanners}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => updateFilter("page", filters.page - 1)}
            className="px-3.5 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
          >
            Prev
          </button>
          <span className="font-medium text-slate-700">
            {filters.page} / {pagination.totalPages || 1}
          </span>
          <button
            type="button"
            disabled={filters.page >= pagination.totalPages}
            onClick={() => updateFilter("page", filters.page + 1)}
            className="px-3.5 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl transition-all duration-200 transform scale-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editId ? "Edit Banner" : "Add Banner"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Assign category, upload image and format rich offer content</p>
              </div>
              <ActionTooltip text="Close modal">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 hover:rotate-90 active:scale-90 cursor-pointer"
                >
                  <X size={19} />
                </button>
              </ActionTooltip>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Banner Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50% OFF Fresh Dairy"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Badge Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LIMITED OFFER / MEGA SALE"
                    value={form.badge}
                    onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* CATEGORY SELECTION & SUBTITLE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Target Category <span className="text-slate-400 font-normal">(Select Category)</span>
                  </label>
                  <select
                    value={form.category || ""}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all bg-white cursor-pointer"
                  >
                    <option value="">🌐 All Categories (Global Store Banner)</option>
                    {categoriesList.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        📁 {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Subtitle / Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Exclusive discounts on morning breakfast"
                    value={form.subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* IMAGE URL & TARGET LINK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Banner Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/banner.jpg"
                    value={form.imageUrl}
                    onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Target Action Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. /category/dairy or https://..."
                    value={form.link}
                    onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* CKEDITOR 5 CONTENT BODY */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-600">Banner Offer Content / T&C</label>
                  <ActionTooltip text={htmlMode ? "Switch to Visual Editor" : "Switch to HTML Code"}>
                    <button
                      type="button"
                      onClick={() => setHtmlMode(!htmlMode)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer font-normal"
                    >
                      {htmlMode ? <Layout size={14} /> : <Code size={14} />}
                      {htmlMode ? "Visual Editor" : "Raw HTML"}
                    </button>
                  </ActionTooltip>
                </div>

                {htmlMode ? (
                  <textarea
                    rows={10}
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <CKEditor
                      editor={ClassicEditor}
                      data={form.content}
                      config={{
                        licenseKey: "GPL",
                        plugins: [Essentials, Paragraph, Bold, Italic, Link, List, Heading, Undo],
                        toolbar: [
                          "undo", "redo", "|",
                          "heading", "|",
                          "bold", "italic", "link", "|",
                          "bulletedList", "numberedList",
                        ],
                      }}
                      onChange={(_, editor) => {
                        setForm((p) => ({ ...p, content: editor.getData() }));
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-normal text-slate-600 hover:bg-slate-100 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-normal hover:bg-slate-800 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewBanner && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/60">
              <div className="truncate pr-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-1">
                  Banner Live Preview
                </span>
                <h3 className="font-medium text-sm text-slate-800 truncate">
                  {previewBanner.title}
                </h3>
              </div>
              <ActionTooltip text="Close preview">
                <button
                  type="button"
                  onClick={() => setPreviewBanner(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all duration-200 hover:rotate-90 active:scale-90 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </ActionTooltip>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-50/30">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex gap-4 items-center">
                {previewBanner.image?.url || previewBanner.imageUrl ? (
                  <img
                    src={previewBanner.image?.url || previewBanner.imageUrl}
                    alt={previewBanner.title}
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                ) : null}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">
                      {previewBanner.badge}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {getCategoryName(previewBanner.category)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mt-1">{previewBanner.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{previewBanner.subtitle}</p>
                </div>
              </div>

              <iframe
                title="Banner Body Preview"
                srcDoc={`<!DOCTYPE html><html><head><style>body{margin:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1e293b;font-size:14px;}p{margin:0 0 12px 0;}*::-webkit-scrollbar{display:none;}*{-ms-overflow-style:none;scrollbar-width:none;}</style></head><body>${previewBanner.content || ""}</body></html>`}
                className="w-full h-56 border border-slate-100 rounded-xl bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;