import { useCallback, useEffect, useState } from "react";
import {
  Users as UsersIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Mail,
  Phone,
  Bike,
} from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

// Grouped Operational Permissions
const AVAILABLE_PERMISSIONS = [
  {
    module: "Dashboard",
    permissions: [{ id: "dashboard.view", label: "View Dashboard" }],
  },
  {
    module: "Catalog Management",
    permissions: [
      { id: "categories.view", label: "Categories" },
      { id: "subcategories.view", label: "Sub Categories" },
      { id: "brands.view", label: "Brands" },
      { id: "products.view", label: "Products" },
      { id: "variants.view", label: "Variants" },
    ],
  },
  {
    module: "Stores & Stock",
    permissions: [
      { id: "stores.view", label: "Dark Stores" },
      { id: "inventory.view", label: "Inventory Management" },
    ],
  },
  {
    module: "Staff & Roles",
    permissions: [
      { id: "users.view", label: "User Management" },
      { id: "roles.view", label: "Role Management" },
    ],
  },
  {
    module: "Orders & Customers",
    permissions: [
      { id: "orders.view", label: "Orders Management" },
      { id: "customers.view", label: "Customers View" },
    ],
  },
  {
    module: "Logistics & Deliveries",
    permissions: [
      { id: "deliveries.view", label: "View Deliveries" },
      { id: "deliveries.assign", label: "Assign Orders" },
    ],
  },
  {
    module: "System & Settings",
    permissions: [
      { id: "email_templates.view", label: "Email Templates" },
      { id: "settings.view", label: "System Settings" },
    ],
  },
];

const User = () => {
  const { user: currentUser, hasPermission } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);

  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Form State with Delivery Partner Specific Attributes
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    emailTemplateId: "",
    vehicleType: "bike",
    vehicleNumber: "",
    drivingLicenseNumber: "",
  });

  // Granular Action Permissions
  const canCreateUser = hasPermission("users.create");
  const canUpdateUser = hasPermission("users.update");
  const canDeleteUser = hasPermission("users.delete");
  const canChangeStatus = hasPermission("users.status_change");
  const canAssignRoles = hasPermission("users.assign_roles");

  // Selected role detection helper
  const selectedRoleDoc = roles.find((r) => r._id === form.role);
  const isDeliveryPartnerRole =
    selectedRoleDoc?.name?.toLowerCase() === "delivery_partner";

  // Fetch users from backend
  const getUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/users/get-users", {
        params: {
          search,
          role: roleFilter,
          status: statusFilter,
          page,
          limit,
          sortBy,
          order,
        },
      });

      setUsers(response.data?.users || []);
      setPagination(
        response.data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalUsers: 0,
        }
      );
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, limit, sortBy, order]);

  // Fetch roles
  const getRoles = async () => {
    try {
      const response = await api.get("/roles");
      const data =
        response.data?.roles ||
        response.data?.data?.roles ||
        response.data?.data ||
        [];
      // Filter out customer role for operations staff modal
      setRoles(
        Array.isArray(data)
          ? data.filter((r) => (r.name || "").toLowerCase() !== "customer")
          : []
      );
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to fetch roles");
    }
  };

  // Fetch active email templates
  const getTemplates = async () => {
    try {
      const response = await api.get("/email-templates/get-email-templates", {
        params: {
          status: "active",
          limit: 100,
          page: 1,
          sortBy: "name",
          order: "asc",
        },
      });

      const data =
        response.data?.templates ||
        response.data?.data?.templates ||
        [];
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to fetch email templates"
      );
      setTemplates([]);
    }
  };

  useEffect(() => {
    getRoles();
    getTemplates();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      getUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [getUsers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-populate permissions when role changes in Add Mode
    if (name === "role" && !editingUser && value) {
      const rDoc = roles.find((r) => r._id === value);
      if (rDoc?.permissions) {
        setSelectedPermissions(rDoc.permissions);
      }
    }
  };

  // Permission selection toggle helpers
  const togglePermission = (permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  const toggleModulePermissions = (modulePerms) => {
    const permIds = modulePerms.map((p) => p.id);
    const allSelected = permIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !permIds.includes(id))
      );
    } else {
      setSelectedPermissions((prev) =>
        Array.from(new Set([...prev, ...permIds]))
      );
    }
  };

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      emailTemplateId: "",
      vehicleType: "bike",
      vehicleNumber: "",
      drivingLicenseNumber: "",
    });
    setSelectedPermissions([]);
    setEditingUser(null);
  };

  const handleAddUser = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditUser = (targetUser) => {
    setEditingUser(targetUser);

    const partnerProfile = targetUser.partnerProfile || {};

    setForm({
      firstName: targetUser.firstName || "",
      lastName: targetUser.lastName || "",
      email: targetUser.email || "",
      phone: targetUser.phone || "",
      role:
        typeof targetUser.role === "object"
          ? targetUser.role?._id || ""
          : targetUser.role || "",
      emailTemplateId: "",
      vehicleType: partnerProfile.vehicleType || "bike",
      vehicleNumber: partnerProfile.vehicleNumber || "",
      drivingLicenseNumber: partnerProfile.drivingLicenseNumber || "",
    });

    const userPerms =
      Array.isArray(targetUser.permissions) && targetUser.permissions.length > 0
        ? targetUser.permissions
        : targetUser.role?.permissions || [];
    setSelectedPermissions(userPerms);

    setShowForm(true);
  };

  // Create or update user
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      let response;

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        permissions: selectedPermissions,
      };

      if (form.role) {
        payload.role = form.role;
      }

      // If delivery partner, append vehicle metadata
      if (isDeliveryPartnerRole) {
        payload.vehicleType = form.vehicleType;
        payload.vehicleNumber = form.vehicleNumber;
        payload.drivingLicenseNumber = form.drivingLicenseNumber;
      }

      if (editingUser) {
        response = await api.put(
          `/users/update-user/${editingUser._id}`,
          payload
        );
      } else {
        payload.emailTemplateId = form.emailTemplateId;
        response = await api.post("/users/create-user", payload);
      }

      if (response.data?.success) {
        alert(response.data.message);
        setShowForm(false);
        resetForm();

        if (page !== 1) {
          setPage(1);
        } else {
          await getUsers();
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusPopup = (targetUser) => {
    setSelectedUser(targetUser);
    setShowStatusPopup(true);
  };

  const handleStatusChange = async () => {
    if (!selectedUser) return;

    const newStatus =
      selectedUser.status === "active" ? "inactive" : "active";

    try {
      const response = await api.patch(
        `/users/update-user-status/${selectedUser._id}`,
        { status: newStatus }
      );

      if (response.data?.success) {
        setShowStatusPopup(false);
        setSelectedUser(null);
        await getUsers();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to change user status");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      const response = await api.delete(
        `/users/delete-user/${selectedUser._id}`
      );

      if (response.data?.success) {
        setShowDeletePopup(false);
        setSelectedUser(null);
        await getUsers();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete user");
    }
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const statusClass = (status) => {
    if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const isUserSuperAdmin = (targetUser) => {
    const rName =
      typeof targetUser.role === "object"
        ? targetUser.role?.name
        : targetUser.role;
    return ["super_admin", "superadmin"].includes(
      String(rName || "").toLowerCase()
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            User &amp; Staff Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage operational team members, custom permissions, and fleet delivery partners.
          </p>
        </div>

        {canCreateUser && (
          <button
            onClick={handleAddUser}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 text-sm font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus size={18} />
            Add Staff Member
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name?.replace(/[_-]/g, " ").toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="firstName">Sort: First Name</option>
            <option value="lastName">Sort: Last Name</option>
            <option value="email">Sort: Email</option>
            <option value="status">Sort: Status</option>
          </select>

          <select
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white"
          >
            <option value="desc">Order: Newest First</option>
            <option value="asc">Order: Oldest First</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  User Details
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Contact
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Role
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-sm">Fetching user records...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((item) => {
                  const roleName =
                    typeof item.role === "object"
                      ? item.role?.name
                      : item.role;
                  const isSuper = isUserSuperAdmin(item);
                  const isSelf =
                    currentUser?.id === item._id ||
                    currentUser?._id === item._id;
                  const isDeliveryBoy =
                    String(roleName || "").toLowerCase() === "delivery_partner";

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                            {item.firstName?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-sm block">
                              {item.firstName} {item.lastName}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              ID: {item._id?.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail size={13} className="text-slate-400" />
                            <span>{item.email}</span>
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Phone size={13} className="text-slate-400" />
                              <span>{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Shield size={12} className="text-indigo-600" />
                            <span className="capitalize">
                              {roleName?.replace(/[_-]/g, " ") || "No Role"}
                            </span>
                          </span>
                          {isDeliveryBoy && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                              <Bike size={11} />
                              Rider
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusClass(
                            item.status
                          )}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "active"
                                ? "bg-emerald-500"
                                : item.status === "pending"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {canUpdateUser && (
                            <button
                              onClick={() => handleEditUser(item)}
                              className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition cursor-pointer"
                              title="Edit User & Permissions"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canChangeStatus && !isSuper && !isSelf && (
                            <button
                              onClick={() => openStatusPopup(item)}
                              className={`p-2 rounded-lg transition cursor-pointer ${
                                item.status === "active"
                                  ? "hover:bg-rose-50 text-rose-600"
                                  : "hover:bg-emerald-50 text-emerald-600"
                              }`}
                              title={
                                item.status === "active"
                                  ? "Deactivate User"
                                  : "Activate User"
                              }
                            >
                              {item.status === "active" ? (
                                <UserX size={16} />
                              ) : (
                                <UserCheck size={16} />
                              )}
                            </button>
                          )}

                          {canDeleteUser && !isSuper && !isSelf && (
                            <button
                              onClick={() => {
                                setSelectedUser(item);
                                setShowDeletePopup(true);
                              }}
                              className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>
              Total records: <strong>{pagination.totalUsers}</strong>
            </span>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white outline-none focus:border-indigo-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">
              Page {pagination.currentPage || page} of{" "}
              {Math.max(1, pagination.totalPages)}
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="p-2 border border-slate-200 bg-white rounded-lg disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                disabled={
                  page >= pagination.totalPages ||
                  loading ||
                  pagination.totalPages === 0
                }
                onClick={() => setPage((prev) => prev + 1)}
                className="p-2 border border-slate-200 bg-white rounded-lg disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingUser ? "Edit User & Access" : "Add Staff Member"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set user credentials, vehicle info, and granular module access rights.
                </p>
              </div>

              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="e.g. John"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="e.g. Doe"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* ROLE SELECTION */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Primary Role {!canAssignRoles && "(Locked)"} <span className="text-rose-500">*</span>
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={!canAssignRoles}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Role</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name?.replace(/[_-]/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
                {!canAssignRoles && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    You do not have permission to modify user roles.
                  </p>
                )}
              </div>

              {/* DYNAMIC DELIVERY PARTNER PROFILE SECTION */}
              {isDeliveryPartnerRole && (
                <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/40 space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-amber-200/60">
                    <Bike size={16} className="text-amber-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Rider Vehicle &amp; Fleet Information
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Vehicle Type
                      </label>
                      <select
                        name="vehicleType"
                        value={form.vehicleType}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:border-indigo-500"
                      >
                        <option value="bike">Bike (Motorcycle)</option>
                        <option value="scooter">Scooter</option>
                        <option value="ev">Electric Vehicle (EV)</option>
                        <option value="bicycle">Bicycle</option>
                        <option value="van">Delivery Van</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        placeholder="e.g. DL-01-AB-1234"
                        value={form.vehicleNumber}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase bg-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Driving License No.
                      </label>
                      <input
                        type="text"
                        name="drivingLicenseNumber"
                        placeholder="e.g. DL1420110012345"
                        value={form.drivingLicenseNumber}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase bg-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DIRECT PERMISSIONS SECTION */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-800">
                      Module Access &amp; Permissions
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select specific sections this staff user can view or manage.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                    {selectedPermissions.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {AVAILABLE_PERMISSIONS.map((group) => {
                    const isAllSelected = group.permissions.every((p) =>
                      selectedPermissions.includes(p.id)
                    );

                    return (
                      <div
                        key={group.module}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-700">
                            {group.module}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              toggleModulePermissions(group.permissions)
                            }
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          >
                            {isAllSelected ? "Clear" : "All"}
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {group.permissions.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />
                              {perm.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WELCOME EMAIL TEMPLATE (Only for New Staff) */}
              {!editingUser && (
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Welcome Email Template <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="emailTemplateId"
                    value={form.emailTemplateId}
                    onChange={handleChange}
                    required={templates.length > 0}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition bg-white"
                  >
                    <option value="">Select Welcome Template</option>
                    {templates.map((tpl) => (
                      <option key={tpl._id} value={tpl._id}>
                        {tpl.name} — {tpl.subject}
                      </option>
                    ))}
                  </select>

                  {templates.length === 0 ? (
                    <p className="text-xs text-amber-600 mt-1.5">
                      No active templates found. A default invitation email will be dispatched.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Sends the generated temporary password using this template.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {submitting
                    ? "Saving..."
                    : editingUser
                    ? "Update User"
                    : "Create & Send Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CHANGE POPUP */}
      {showStatusPopup && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">
              Confirm Status Change
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Are you sure you want to{" "}
              <strong className="text-slate-800">
                {selectedUser.status === "active" ? "deactivate" : "activate"}
              </strong>{" "}
              <strong>
                {selectedUser.firstName} {selectedUser.lastName}
              </strong>
              ?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusPopup(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP */}
      {showDeletePopup && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-rose-600">
              Delete User Account
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Are you sure you want to permanently delete{" "}
              <strong>
                {selectedUser.firstName} {selectedUser.lastName}
              </strong>
              ? This action will also remove their linked delivery partner fleet record.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default User;