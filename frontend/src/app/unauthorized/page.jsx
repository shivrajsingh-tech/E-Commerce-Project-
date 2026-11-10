
"use client";

import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  CheckCircle2,
  Mail,
  Package,
  Tags,
  Boxes,
  Store,
  ShoppingCart,
  ArrowUpRight,
} from "lucide-react";
import Image from "next/image";

import Link from "next/link";
import { useAuth } from "@/context/authContext";

const dashboardModules = [
  {
    title: "Products",
    description: "View and manage product records.",
    permission: "products.view",
    href: "/portal/products",
    icon: Package,
  },
  {
    title: "Categories",
    description: "View product categories.",
    permission: "categories.view",
    href: "/portal/catalog",
    icon: Tags,
  },
  {
    title: "Subcategories",
    description: "View and manage subcategories.",
    permission: "subcategories.view",
    href: "/subcategories",
    icon: Boxes,
  },
  {
    title: "Brands",
    description: "Access brand management.",
    permission: "brands.view",
    href: "/brands",
    icon: Store,
  },
  {
    title: "Inventory",
    description: "Access inventory management.",
    permission: "inventory.view",
    href: "/inventory",
    icon: Boxes,
  },
  {
    title: "Orders",
    description: "View order records.",
    permission: "orders.view",
    href: "/portal/orders",
    icon: ShoppingCart,
  },
  {
    title: "Role Management",
    description: "View roles and their permissions.",
    permission: "roles.view",
    href: "/portal/roles",
    icon: ShieldCheck,
  },
  {
    title: "Email Templates",
    description: "Access email template management.",
    permission: "email-templates.view",
    href: "/email-templates",
    icon: Mail,
  },
];

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();

  const roleName =
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || "Not assigned";

  const permissions = Array.isArray(user?.permissions)
    ? user.permissions
    : [];

  // Show only modules the user has permission to view.
  const allowedModules = dashboardModules.filter((module) =>
    hasPermission(module.permission)
  );

  const cards = [
    {
      title: "My Dashboard",
      description: "Your personalized workspace.",
      icon: LayoutDashboard,
      value: "Overview",
    },
    {
      title: "My Role",
      description: "Your assigned role and access.",
      icon: ShieldCheck,
      value: roleName.replaceAll("_", " "),
    },
    {
      title: "My Permissions",
      description: "Features available to your account.",
      icon: Users,
      value: permissions.length,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* WELCOME */}
      <section>
        <p className="text-sm font-medium text-indigo-600">
          Overview
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Welcome, {user?.firstName || user?.name || "User"}!
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Here is your workspace overview based on your
          assigned role and permissions.
        </p>
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon size={23} />
              </div>

              <h2 className="mt-5 font-semibold text-slate-900">
                {card.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {card.description}
              </p>

              <p className="mt-4 font-semibold capitalize text-slate-800">
                {card.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* PERMISSION-WISE MODULES */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Available Modules
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Modules available according to your permissions.
          </p>
        </div>

        {allowedModules.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {allowedModules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.permission}
                  href={module.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon size={23} />
                    </div>

                    <ArrowUpRight
                      size={20}
                      className="text-slate-400 transition group-hover:text-indigo-600"
                    />
                  </div>

                  <h3 className="mt-5 font-semibold text-slate-900">
                    {module.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {module.description}
                  </p>

                  <p className="mt-4 text-xs font-medium text-indigo-600">
                    Access granted
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ShieldCheck
              size={32}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-3 font-semibold text-slate-800">
              No modules available
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your account does not have view permissions
              for the available modules.
            </p>
          </div>
        )}
      </section>

      {/* ACCOUNT INFORMATION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Account Information
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Users size={20} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Full Name
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {[user?.firstName, user?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                  user?.name ||
                  "Not available"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Mail size={20} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Email Address
              </p>

              <p className="mt-1 break-all font-medium text-slate-800">
                {user?.email || "Not available"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <ShieldCheck size={20} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Assigned Role
              </p>

              <p className="mt-1 font-medium capitalize text-slate-800">
                {roleName.replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MY PERMISSIONS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-indigo-600" size={22} />

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              My Permissions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Permissions assigned to your account.
            </p>
          </div>
        </div>

        {permissions.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700"
              >
                {permission}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            No permissions were returned for this account.
          </p>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Dashboard access:{" "}
            <span
              className={
                hasPermission("dashboard.view")
                  ? "font-medium text-emerald-600"
                  : "font-medium text-red-600"
              }
            >
              {hasPermission("dashboard.view")
                ? "Granted"
                : "Not granted"}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
