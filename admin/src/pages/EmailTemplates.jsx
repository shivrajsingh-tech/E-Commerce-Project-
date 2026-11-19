import { useCallback, useEffect, useState } from "react";
import toast from 'react-hot-toast';
import { confirmToast } from '../components/ConfirmToast';
import { Plus, Search, Pencil, Trash2, X, Eye, Code, Layout } from "lucide-react";

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
  name: "",
  type: "general",
  subject: "",
  body: "<p>Hello {{name}},</p><p>Write your email content here.</p>",
};

const MOCK_USER_DATA = {
  name: "Alex Morgan",
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex.morgan@example.com",
  role: "Product Manager",
  resetLink: "https://yourcompany.com/reset-password?token=mock_sample_token",
};

const renderPreviewHtml = (rawHtml = "") =>
  rawHtml.replace(/{{\s*(\w+)\s*}}/g, (_, key) => MOCK_USER_DATA[key] || "");

// Fixed: Bold hata diya, normal font-normal text hai, koi border nahi
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

const EmailTemplates = () => {
  const { hasPermission } = useAuth();
  const canCreate       = hasPermission("email_templates.create");
  const canUpdate       = hasPermission("email_templates.update");
  const canDelete       = hasPermission("email_templates.delete");
  const canChangeStatus = hasPermission("email_templates.status_change");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
    sortBy: "createdAt",
    order: "desc",
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({ totalPages: 0, totalTemplates: 0 });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [htmlMode, setHtmlMode] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const getTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/email-templates/get-email-templates", { params: filters });
      setTemplates(res.data?.templates || []);
      setPagination(res.data?.pagination || { totalPages: 0, totalTemplates: 0 });
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => getTemplates(), filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [getTemplates, filters.search]);

  const handleOpenForm = (template = null) => {
    setEditId(template ? template._id : null);
    setForm(template ? { ...template } : { ...emptyForm });
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

    try {
      setSaving(true);
      if (editId) {
        await api.put(`/email-templates/update-email-template/${editId}`, form);
        toast.success("Template updated successfully");
      } else {
        await api.post("/email-templates/add-email-template", form);
        toast.success("Template created successfully");
      }
      handleCloseForm();
      getTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const _ok = await confirmToast("Delete this template?"); if (!_ok) return;
    try {
      await api.delete(`/email-templates/delete-email-template/${id}`);
      getTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete template");
    }
  };

  const handleStatusToggle = async (template) => {
    const newStatus = template.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/email-templates/update-email-template-status/${template._id}`, {
        status: newStatus,
      });
      getTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || "Status update failed");
    }
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Email Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Design, edit, and organize clean email workflows</p>
        </div>
        {canCreate && (
        <ActionTooltip text="Create a new template" position="bottom">
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all duration-300 ease-out shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
          >
            <Plus size={18} /> Add Template
          </button>
        </ActionTooltip>
        )}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all duration-200"
          />
        </div>

        <input
          type="text"
          placeholder="Filter by type..."
          value={filters.type}
          onChange={(e) => updateFilter("type", e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all duration-200"
        />

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
          <option value="name">Name</option>
          <option value="subject">Subject</option>
          <option value="type">Type</option>
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
            <span className="text-sm font-medium">Fetching templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No email templates found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/70 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Template Name</th>
                  <th className="px-6 py-3.5 font-semibold">Type</th>
                  <th className="px-6 py-3.5 font-semibold">Subject</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((tpl) => (
                  <tr
                    key={tpl._id}
                    className="hover:bg-slate-50/60 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-medium text-slate-800">{tpl.name}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{tpl.type}</td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{tpl.subject}</td>
                    <td className="px-6 py-4">
                      <ActionTooltip text={`Set to ${tpl.status === "active" ? "inactive" : "active"}`}>
                        {canChangeStatus ? (
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(tpl)}
                          className={`px-3 py-1 rounded-full text-xs font-normal transition-all duration-200 ease-out hover:scale-105 active:scale-95 cursor-pointer ${
                            tpl.status === "active"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tpl.status || "inactive"}
                        </button>
                        ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-normal ${tpl.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {tpl.status || "inactive"}
                        </span>
                        )}
                      </ActionTooltip>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <ActionTooltip text="Preview">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(tpl)}
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                          >
                            <Eye size={17} />
                          </button>
                        </ActionTooltip>
                        {canUpdate && (
                        <ActionTooltip text="Edit">
                          <button
                            type="button"
                            onClick={() => handleOpenForm(tpl)}
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
                            onClick={() => handleDelete(tpl._id)}
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
        <span>Total: {pagination.totalTemplates}</span>
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
                  {editId ? "Edit Email Template" : "Add Email Template"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill out your parameters and content below</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Template Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Category / Type</label>
                  <input
                    type="text"
                    required
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Subject Line</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                />
              </div>

              {/* EDITOR TOGGLE & BODY */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-600">Message Body</label>
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
                    rows={11}
                    value={form.body}
                    onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <CKEditor
                      editor={ClassicEditor}
                      data={form.body}
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
                        setForm((p) => ({ ...p, body: editor.getData() }));
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
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/60">
              <div className="truncate pr-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-1">
                  Preview Mode
                </span>
                <h3 className="font-medium text-sm text-slate-800 truncate">
                  {previewTemplate.subject || "(No Subject)"}
                </h3>
              </div>
              <ActionTooltip text="Close preview">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all duration-200 hover:rotate-90 active:scale-90 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </ActionTooltip>
            </div>
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/30">
              <iframe
                title="Preview"
                srcDoc={`<!DOCTYPE html><html><head><style>body{margin:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1e293b;font-size:14px;}p{margin:0 0 12px 0;}*::-webkit-scrollbar{display:none;}*{-ms-overflow-style:none;scrollbar-width:none;}</style></head><body>${renderPreviewHtml(
                  previewTemplate.body
                )}</body></html>`}
                className="w-full h-80 border border-slate-100 rounded-xl bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;