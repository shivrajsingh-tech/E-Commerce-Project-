const path = require("path");
const mongoose = require("mongoose");
const Role = require("../model/roleSchema");
const permissions = require("../constants/permission");
const User = require("../model/userSchema");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoUri =
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("❌ Error: MongoDB connection string not found.");
  process.exit(1);
}

const rolesWithPermissions = [
  {
    name: "super_admin",
    permissions: Object.values(permissions),
  },
  {
    name: "admin",
    permissions: [
      permissions.DASHBOARD_VIEW,
      permissions.USERS_VIEW,
      permissions.USERS_CREATE,
      permissions.USERS_UPDATE,
      permissions.USERS_STATUS_CHANGE,
      permissions.CUSTOMERS_VIEW,
      permissions.CUSTOMERS_CREATE,
      permissions.CUSTOMERS_UPDATE,
      permissions.CUSTOMERS_DELETE,
      permissions.CUSTOMERS_STATUS_CHANGE,
      permissions.PRODUCTS_VIEW,
      permissions.PRODUCTS_CREATE,
      permissions.PRODUCTS_UPDATE,
      permissions.PRODUCTS_DELETE,
      permissions.CATEGORIES_VIEW,
      permissions.CATEGORIES_CREATE,
      permissions.CATEGORIES_UPDATE,
      permissions.CATEGORIES_DELETE,
      permissions.SUBCATEGORIES_VIEW,
      permissions.SUBCATEGORIES_CREATE,
      permissions.SUBCATEGORIES_UPDATE,
      permissions.SUBCATEGORIES_DELETE,
      permissions.BRANDS_VIEW,
      permissions.BRANDS_CREATE,
      permissions.BRANDS_UPDATE,
      permissions.BRANDS_DELETE,
      permissions.VARIANTS_VIEW,
      permissions.VARIANTS_CREATE,
      permissions.VARIANTS_UPDATE,
      permissions.VARIANTS_DELETE,
      permissions.STORES_VIEW,
      permissions.STORES_CREATE,
      permissions.STORES_UPDATE,
      permissions.INVENTORY_VIEW,
      permissions.INVENTORY_CREATE,
      permissions.INVENTORY_UPDATE,
      permissions.ORDERS_VIEW,
      permissions.ORDERS_CREATE,
      permissions.ORDERS_UPDATE,
      permissions.ORDERS_DELETE,
      permissions.ORDERS_STATUS_CHANGE,
      permissions.DELIVERIES_VIEW,
      permissions.DELIVERIES_ASSIGN,
      permissions.SETTINGS_VIEW,
      permissions.SETTINGS_UPDATE,
      permissions.BANNERS_VIEW,
      permissions.EMAIL_TEMPLATES_VIEW,
    ],
  },
  {
    name: "store_manager",
    permissions: [
      permissions.DASHBOARD_VIEW,
      permissions.CUSTOMERS_VIEW,
      permissions.ORDERS_VIEW,
      permissions.ORDERS_UPDATE,
      permissions.ORDERS_STATUS_CHANGE,
      permissions.STORES_VIEW,
      permissions.STORES_UPDATE,
      permissions.INVENTORY_VIEW,
      permissions.INVENTORY_UPDATE,
      permissions.PRODUCTS_VIEW,
      permissions.CATEGORIES_VIEW,
      permissions.SUBCATEGORIES_VIEW,
      permissions.BRANDS_VIEW,
      permissions.VARIANTS_VIEW,
      permissions.DELIVERIES_VIEW,
      permissions.DELIVERIES_ASSIGN,
      permissions.SETTINGS_VIEW,
    ],
  },
  {
    name: "inventory_manager",
    permissions: [
      permissions.DASHBOARD_VIEW,
      permissions.INVENTORY_VIEW,
      permissions.INVENTORY_CREATE,
      permissions.INVENTORY_UPDATE,
      permissions.PRODUCTS_VIEW,
      permissions.CATEGORIES_VIEW,
      permissions.SUBCATEGORIES_VIEW,
      permissions.BRANDS_VIEW,
      permissions.VARIANTS_VIEW,
      permissions.STORES_VIEW,
      permissions.SETTINGS_VIEW,
    ],
  },
  {
    name: "delivery_manager",
    permissions: [
      permissions.DASHBOARD_VIEW,
      permissions.CUSTOMERS_VIEW,
      permissions.ORDERS_VIEW,
      permissions.ORDERS_STATUS_CHANGE,
      permissions.DELIVERIES_VIEW,
      permissions.DELIVERIES_ASSIGN,
      permissions.DELIVERIES_UPDATE,
      permissions.SETTINGS_VIEW,
    ],
  },
  {
    name: "delivery_partner",
    permissions: [
      permissions.DASHBOARD_VIEW,
      permissions.DELIVERIES_VIEW,
      permissions.DELIVERIES_UPDATE,
      permissions.ORDERS_VIEW,
      permissions.ORDERS_STATUS_CHANGE,
      permissions.SETTINGS_VIEW,
    ],
  },
  {
    name: "customer",
    permissions: [],
  },
];

const seedRoles = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);

    for (const item of rolesWithPermissions) {
      const savedRole = await Role.findOneAndUpdate(
        { name: item.name },
        {
          name: item.name,
          permissions: item.permissions,
          status: "active",
        },
        { upsert: true, returnDocument: "after" }
      );

      if (User && savedRole?._id) {
        const updateResult = await User.updateMany(
          { role: savedRole._id },
          { $set: { permissions: item.permissions } }
        );
        console.log(
          `Role [${item.name}] synced with ${updateResult.modifiedCount} users.`
        );
      }
    }

    console.log("All roles and users updated successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding roles:", error.message);
    process.exit(1);
  }
};

seedRoles();