const bcrypt = require("bcrypt");
const connectdb = require("./config/connet");
const User = require("./model/userSchema");
const Role = require("./model/roleSchema");
require("dotenv").config();

const createSuperAdmin = async () => {
  try {
    await connectdb();

    const role = await Role.findOne({
      name: "super_admin",
    });

    if (!role) {
      console.log("super_admin role not found");
      process.exit(1);
    }

    const existingUser = await User.findOne({
      email: "superadmin@gmail.com",
    });

    if (existingUser) {
      console.log("Super Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Shivadmin1@23", 10);

    const user = await User.create({
      role: role._id,
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@gmail.com",
      phone: "",
      password: hashedPassword,
      profileImage: "",
      isEmailVerified: true,
      isPhoneVerified: false,
      status: "active",
    });

    console.log("Super Admin created successfully");
    console.log("Email:", user.email);
    console.log("Password: Shivadmin1@23");

    process.exit(0);
  } catch (error) {
    console.log("Error:", error.message);
    process.exit(1);
  }
};

createSuperAdmin();