import { useEffect, useState, useMemo } from "react";
import toast from 'react-hot-toast';
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  LoaderCircle,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";

// Updated permission groups and full permissions list
import { permissionGroups, allPermissions } from "../constants/permissionGroups";

const initialForm = {
  name: "",
  permissions: [],
  status: "active",
};

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Something went wrong. Please try again.";

// Super admin role fixed rehta hai (auto all-access)
const isSuperAdminRole = (name) =>
  ["super_admin", "super-admin"].includes((name || "").trim().toLowerCase());

// System roles jo delete nahi ho sakte
const isProtectedDeleteRole = (name) =>
  ["super_admin", "super-admin", "customer"].includes(
    (name || "").trim().toLowerCase()
  );

export default function RoleManagement() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const canDelete = hasPermission("roles.delete");
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editingRoleName, setEditingRoleName] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // GET ALL ROLES
  const fetchRoles = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/roles");
      const data = response.data;
      setRoles(
        Array.isArray(data)
          ? data
          : data.roles || data.data || []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // OPEN CREATE FORM
  const handleCreate = () => {
    setForm({
      name: "",
      permissions: [],
      status: "active",
    });
    setEditingId(null);
    setEditingRoleName("");
    setPermissionSearch("");
    setError("");
    setMessage("");
    setShowForm(true);
  };

  // OPEN EDIT FORM
  const handleEdit = (role) => {
    setForm({
      name: role.name || "",
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
      status: role.status || "active",
    });
    setEditingId(role._id);
    setEditingRoleName(role.name?.toLowerCase() || "");
    setPermissionSearch("");
    setError("");
    setMessage("");
    setShowForm(true);
  };

  // CLOSE FORM
  const handleClose = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setEditingRoleName("");
    setPermissionSearch("");
    setForm({ ...initialForm });
    setError("");
  };

  // TOGGLE SINGLE PERMISSION
  const togglePermission = (permission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  // TOGGLE COMPLETE GROUP
  const toggleGroup = (group) => {
    const values = group.permissions.map((item) => item.value);
    const allSelected = values.every((value) =>
      form.permissions.includes(value)
    );

    setForm((current) => ({
      ...current,
      permissions: allSelected
        ? current.permissions.filter((value) => !values.includes(value))
        : [...new Set([...current.permissions, ...values])],
    }));
  };

  // MASTER TOGGLE: SELECT ALL / DESELECT ALL
  const handleToggleAllPermissions = () => {
    if (form.permissions.length === allPermissions.length) {
      setForm((prev) => ({ ...prev, permissions: [] }));
    } else {
      setForm((prev) => ({ ...prev, permissions: [...allPermissions] }));
    }
  };

  // CREATE OR UPDATE ROLE
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = form.name.trim().toLowerCase().replace(/[\s-]+/g, "_");

    if (!name) {
      setError("Please enter a role name.");
      return;
    }

    if (!editingId && isProtectedDeleteRole(name)) {
      setError(`The role name "${name}" is reserved by the system.`);
      return;
    }

    if (form.permissions.length === 0) {
      setError("Please select at least one permission.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        permissions: form.permissions,
        status: form.status,
      };

      if (editingId) {
        await api.put(`/roles/${editingId}`, payload);
        setMessage("Role updated successfully.");
      } else {
        await api.post("/roles", payload);
        setMessage("Role created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setEditingRoleName("");
      setForm({ ...initialForm });
      await fetchRoles();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // DELETE ROLE
  const handleDelete = async (role) => {
    if (isProtectedDeleteRole(role.name)) {
      setError(`The system role "${role.name}" cannot be deleted.`);
      return;
    }

    const confirmed = true;

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(role._id);

    try {
      await api.delete(`/roles/${role._id}`);
      setMessage("Role deleted successfully.");
      await fetchRoles();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // FILTERED GROUPS IN MODAL VIA SEARCH
  const filteredPermissionGroups = useMemo(() => {
    if (!permissionSearch.trim()) return permissionGroups;

    const query = permissionSearch.toLowerCase();
    return permissionGroups
      .map((group) => {
        const matchingPermissions = group.permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(query) ||
            p.value.toLowerCase().includes(query)
        );

        if (
          group.title.toLowerCase().includes(query) ||
          matchingPermissions.length > 0
        ) {
          return {
            ...group,
            permissions:
              matchingPermissions.length > 0
                ? matchingPermissions
                : group.permissions,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [permissionSearch]);

  // SEARCH ROLES LIST
  const filteredRoles = roles.filter((role) =>
    role.name?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const activeRoles = roles.filter(
    (role) => role.status === "active"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            <ShieldCheck size={16} />
            Access Control
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900">
            Role & Permission Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure granular module permissions and operational staff roles.
          </p>
        </div>

        {canCreate && (
        <button
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 cursor-pointer"
        >
          <Plus size={18} />
          Create Role
        </button>
        )}
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={19} />
          <span className="flex-1">{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}

      {error && !showForm && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATISTICS CARDS */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: "Configured Roles",
            value: roles.length,
            icon: ShieldCheck,
            color: "bg-indigo-100 text-indigo-600",
          },
          {
            label: "Active Roles",
            value: activeRoles,
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Total Granular Permissions",
            value: allPermissions.length,
            icon: LockKeyhole,
            color: "bg-blue-100 text-blue-600",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
            >
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {item.value}
                </h2>
              </div>
              <div className={`rounded-xl p-3 ${item.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ROLE TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">All Roles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage permissions granted to each operational role.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3">
            <LoaderCircle size={30} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading roles...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600">
              <ShieldCheck size={30} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-800">No roles found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try searching with a different name."
                : "Seed or create a role to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["ROLE", "PERMISSIONS GRANTED", "STATUS", "ACTIONS"].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRoles.map((role) => {
                  const isProtectedDelete = isProtectedDeleteRole(role.name);
                  const isSuper = isSuperAdminRole(role.name);

                  return (
                    <tr
                      key={role._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700">
                            {role.name?.charAt(0).toUpperCase() || "R"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 capitalize">
                              {role.name?.replace(/[_-]/g, " ")}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 font-mono">
                              {role.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex max-w-md flex-wrap gap-1.5">
                          {isSuper ? (
                            <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              * All Access (Full System Bypass)
                            </span>
                          ) : (
                            <>
                              <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                {role.permissions?.length || 0} permissions
                              </span>

                              {(role.permissions || [])
                                .slice(0, 3)
                                .map((permission) => (
                                  <span
                                    key={permission}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 font-mono"
                                  >
                                    {permission}
                                  </span>
                                ))}

                              {(role.permissions?.length || 0) > 3 && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                  +{role.permissions.length - 3} more
                                </span>
                              )}

                              {!role.permissions?.length && (
                                <span className="text-xs text-slate-400 italic">
                                  No permissions assigned
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            role.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              role.status === "active"
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />
                          {role.status || "active"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {canUpdate && (
                          <button
                            type="button"
                            title={isSuper ? "Super Admin cannot be modified" : "Edit role"}
                            disabled={isSuper}
                            onClick={() => handleEdit(role)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          )}

                          {canDelete && (
                          <button
                            type="button"
                            title={isProtectedDelete ? "System role cannot be deleted" : "Delete role"}
                            disabled={isProtectedDelete || deletingId === role._id}
                            onClick={() => handleDelete(role)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            {deletingId === role._id ? (
                              <LoaderCircle
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Delete
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>
            Showing {filteredRoles.length} of {roles.length} roles
          </span>

          <button
            type="button"
            onClick={fetchRoles}
            disabled={loading}
            className="inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Roles
          </button>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-xs sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  Role Configuration
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                  {editingId ? `Edit Role: ${form.name}` : "Create New Role"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Assign granular capabilities across Customer Management, Catalog, Deliveries, and Orders.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL FORM */}
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {error && (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="role-name"
                      className="mb-1.5 block text-xs font-bold uppercase text-slate-600"
                    >
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="role-name"
                      type="text"
                      required
                      maxLength={50}
                      value={form.name}
                      disabled={saving || (Boolean(editingId) && editingRoleName === "customer")}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. delivery_manager"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    {editingRoleName === "customer" && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        * System role name cannot be renamed, but permissions can be updated.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="role-status"
                      className="mb-1.5 block text-xs font-bold uppercase text-slate-600"
                    >
                      Status
                    </label>
                    <select
                      id="role-status"
                      value={form.status}
                      disabled={saving}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* PERMISSION FILTER & SELECT ALL BAR */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div className="relative w-full sm:w-64">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Filter permissions..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      type="button"
                      onClick={handleToggleAllPermissions}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      {form.permissions.length === allPermissions.length ? (
                        <>
                          <Square size={14} /> Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare size={14} /> Select All Permissions
                        </>
                      )}
                    </button>

                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                      {form.permissions.length} / {allPermissions.length} selected
                    </span>
                  </div>
                </div>

                {/* PERMISSION GROUPS LIST */}
                <div className="space-y-4">
                  {filteredPermissionGroups.map((group) => {
                    const Icon = group.icon;
                    const values = group.permissions.map((p) => p.value);
                    const selectedCount = values.filter((val) =>
                      form.permissions.includes(val)
                    );
                    const allSelected =
                      values.length > 0 && selectedCount.length === values.length;

                    return (
                      <div
                        key={group.title}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-white p-1.5 text-indigo-600 shadow-xs border border-slate-100">
                              <Icon size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                {group.title}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {selectedCount.length} of {values.length} selected
                              </p>
                            </div>
                          </div>

                          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-indigo-700 select-none">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleGroup(group)}
                              className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                            />
                            Select all
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.permissions.map((permission) => {
                            const checked = form.permissions.includes(
                              permission.value
                            );

                            return (
                              <label
                                key={permission.value}
                                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition select-none ${
                                  checked
                                    ? "border-indigo-300 bg-indigo-50/60"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    togglePermission(permission.value)
                                  }
                                  className="sr-only"
                                />

                                <span
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    checked
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-300 bg-white text-transparent"
                                  }`}
                                >
                                  <Check size={11} strokeWidth={3} />
                                </span>

                                <span className="min-w-0">
                                  <span className="block text-xs font-semibold text-slate-700">
                                    {permission.label}
                                  </span>
                                  <span className="mt-0.5 block break-all text-[10px] text-slate-400 font-mono">
                                    {permission.value}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}