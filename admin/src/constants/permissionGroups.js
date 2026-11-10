// src/constants/permissionGroups.js
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShieldCheck,
  ShoppingBag,
  Folder,
  Image as BannerIcon,
  Store,
  ClipboardList,
  Truck,
  HelpCircle,
  Settings,
} from "lucide-react";

export const permissionGroups = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    permissions: [
      { value: "dashboard.view", label: "View Dashboard & Metrics" },
    ],
  },
  {
    title: "Customer Management",
    icon: UserCheck,
    permissions: [
      { value: "customers.view", label: "View Customers" },
      { value: "customers.create", label: "Create Customers" },
      { value: "customers.update", label: "Update Customers" },
      { value: "customers.delete", label: "Delete Customers" },
      { value: "customers.status_change", label: "Change Customer Status" },
    ],
  },
  {
    title: "User Management",
    icon: Users,
    permissions: [
      { value: "users.view", label: "View Staff Users" },
      { value: "users.create", label: "Create Users" },
      { value: "users.update", label: "Update Users" },
      { value: "users.delete", label: "Delete Users" },
      { value: "users.status_change", label: "Change User Status" },
      { value: "users.assign_roles", label: "Assign Roles to Users" },
    ],
  },
  {
    title: "Role Management",
    icon: ShieldCheck,
    permissions: [
      { value: "roles.view", label: "View Roles" },
      { value: "roles.create", label: "Create Roles" },
      { value: "roles.update", label: "Update Roles" },
      { value: "roles.delete", label: "Delete Roles" },
    ],
  },
  {
    title: "Catalog - Products & Variants",
    icon: ShoppingBag,
    permissions: [
      { value: "products.view", label: "View Products" },
      { value: "products.create", label: "Create Products" },
      { value: "products.update", label: "Update Products" },
      { value: "products.delete", label: "Delete Products" },
      { value: "products.status_change", label: "Change Product Status" },
      { value: "variants.view", label: "View Variants" },
      { value: "variants.create", label: "Create Variants" },
      { value: "variants.update", label: "Update Variants" },
      { value: "variants.delete", label: "Delete Variants" },
    ],
  },
  {
    title: "Catalog - Categories & Brands",
    icon: Folder,
    permissions: [
      { value: "categories.view", label: "View Categories" },
      { value: "categories.create", label: "Create Categories" },
      { value: "categories.update", label: "Update Categories" },
      { value: "categories.delete", label: "Delete Categories" },
      { value: "subcategories.view", label: "View Subcategories" },
      { value: "subcategories.create", label: "Create Subcategories" },
      { value: "subcategories.update", label: "Update Subcategories" },
      { value: "subcategories.delete", label: "Delete Subcategories" },
      { value: "brands.view", label: "View Brands" },
      { value: "brands.create", label: "Create Brands" },
      { value: "brands.update", label: "Update Brands" },
      { value: "brands.delete", label: "Delete Brands" },
    ],
  },
  {
    title: "Banner & Promotions",
    icon: BannerIcon,
    permissions: [
      { value: "banners.view", label: "View Banners" },
      { value: "banners.create", label: "Create Banners" },
      { value: "banners.update", label: "Update Banners" },
      { value: "banners.delete", label: "Delete Banners" },
      { value: "banners.status_change", label: "Change Banner Status" },
    ],
  },
  {
    title: "Stores & Stock Inventory",
    icon: Store,
    permissions: [
      { value: "stores.view", label: "View Stores" },
      { value: "stores.create", label: "Create Stores" },
      { value: "stores.update", label: "Update Stores" },
      { value: "stores.delete", label: "Delete Stores" },
      { value: "stores.status_change", label: "Change Store Status" },
      { value: "inventory.view", label: "View Inventory" },
      { value: "inventory.create", label: "Add Stock" },
      { value: "inventory.update", label: "Update Stock Levels" },
      { value: "inventory.delete", label: "Remove Inventory" },
      { value: "inventory.adjust", label: "Reconcile / Adjust Stock" },
    ],
  },
  {
    title: "Order Operations",
    icon: ClipboardList,
    permissions: [
      { value: "orders.view", label: "View Orders" },
      { value: "orders.create", label: "Create Orders" },
      { value: "orders.update", label: "Update Order Details" },
      { value: "orders.delete", label: "Delete Orders" },
      { value: "orders.status_change", label: "Update Order Status" },
      { value: "orders.export", label: "Export Orders Report" },
    ],
  },
  {
    title: "Deliveries & Logistics",
    icon: Truck,
    permissions: [
      { value: "deliveries.view", label: "View Deliveries" },
      { value: "deliveries.assign", label: "Assign Deliveries" },
      { value: "deliveries.update", label: "Update Deliveries" },
      { value: "deliveries.status_change", label: "Update Delivery Status" },
    ],
  },
  {
    title: "Support & Customer Resolution",
    icon: HelpCircle,
    permissions: [
      { value: "support.view", label: "View Support Tickets" },
      { value: "support.update", label: "Update Tickets" },
      { value: "support.status_change", label: "Resolve / Close Tickets" },
    ],
  },
  {
    title: "System & Templates",
    icon: Settings,
    permissions: [
      { value: "email_templates.view", label: "View Email Templates" },
      { value: "email_templates.update", label: "Update Email Templates" },
      { value: "settings.view", label: "View Settings" },
      { value: "settings.update", label: "Update Settings" },
    ],
  },
];

export const allPermissions = permissionGroups.flatMap((group) =>
  group.permissions.map((permission) => permission.value)
);