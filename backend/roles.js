const mongoose = require("mongoose");
const Role = require("./model/roleSchema");

require("dotenv").config();

const roles = [
  "super_admin",
  "admin",
  "customer",
  "store_manager",
  "inventory_manager",
  "delivery_partner",
  "support_agent",
];

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    for (const roleName of roles) {
      const existingRole = await Role.findOne({ name: roleName });

      if (!existingRole) {
        await Role.create({
          name: roleName,
          permissions: [],
          status: "active",
        });

        console.log(`${roleName} created`);
      } else {
        console.log(`${roleName} already exists`);
      }
    }

    console.log("All roles completed");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.log("Error:", error.message);
    process.exit(1);
  }
};

seedRoles();