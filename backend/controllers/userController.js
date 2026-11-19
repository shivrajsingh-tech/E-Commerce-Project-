const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../model/userSchema");
const Role = require("../model/roleSchema");
const DeliveryPartner = require("../model/deliveryPartnerSchema");
const EmailTemplate = require("../model/emailTemplate");
const { sendemail } = require("../utils/mailer");

const isValidId = (id) => mongoose.isValidObjectId(id);
const allowedStatuses = ["active", "inactive", "pending"];

const getSafeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};

const wrapEmailUI = (body) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #334155;">
                  ${body}
                </td>
              </tr>
              <tr>
                <td style="padding: 14px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                  This is an automated notification from ElibCart. Please do not reply directly.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

// ==========================================
// CREATE USER (Super Admin / Admin Portal)
// ==========================================
const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      permissions = [],
      emailTemplateId,
      vehicleType = "bike",
      vehicleNumber = "",
      drivingLicenseNumber = "",
    } = req.body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !role) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and role are required",
      });
    }

    if (!isValidId(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const roleDoc = await Role.findOne({
      _id: role,
      status: "active",
    });

    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: "Selected role does not exist or is inactive",
      });
    }

    const targetRoleName = roleDoc.name.toLowerCase();
    if (
      (targetRoleName === "super_admin" || targetRoleName === "superadmin") &&
      req.user?.role !== "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can assign the Super Admin role",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const temporaryPassword = crypto.randomBytes(4).toString("hex") + "!Aa1";
 const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const assignedPermissions =
      Array.isArray(permissions) && permissions.length > 0
        ? permissions
        : roleDoc.permissions || [];

    // 1. Create Core User Account
    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || "",
      role: roleDoc._id,
      permissions: assignedPermissions,
      password:  hashedPassword ,
      status: "pending",
      mustChangePassword: true,
    });

    // 2. If Role is Delivery Partner -> Auto-create DeliveryPartner Profile
    if (targetRoleName === "delivery_partner") {
      try {
        await DeliveryPartner.create({
          user: newUser._id,
          vehicleType: String(vehicleType).toLowerCase().trim() || "bike",
          vehicleNumber: String(vehicleNumber).toUpperCase().trim() || "",
          drivingLicenseNumber: String(drivingLicenseNumber).toUpperCase().trim() || "",
          isOnline: false,
          isAvailable: true,
          status: "active",
          totalDeliveries: 0,
          totalEarnings: 0,
          currentLocation: {
            type: "Point",
            coordinates: [0, 0],
          },
        });
      } catch (dpError) {
        await User.findByIdAndDelete(newUser._id);
        console.error("DeliveryPartner profile creation error:", dpError);
        return res.status(500).json({
          success: false,
          message: "Failed to initialize delivery partner profile record",
        });
      }
    }

    // 3. Optional Onboarding Email Dispatch
    if (emailTemplateId) {
      if (!isValidId(emailTemplateId)) {
        await User.findByIdAndDelete(newUser._id);
        if (targetRoleName === "delivery_partner") {
          await DeliveryPartner.findOneAndDelete({ user: newUser._id });
        }
        return res.status(400).json({
          success: false,
          message: "Invalid email template ID",
        });
      }

      const template = await EmailTemplate.findOne({
        _id: emailTemplateId,
        status: "active",
      });

      if (!template) {
        await User.findByIdAndDelete(newUser._id);
        if (targetRoleName === "delivery_partner") {
          await DeliveryPartner.findOneAndDelete({ user: newUser._id });
        }
        return res.status(400).json({
          success: false,
          message: "Selected email template is unavailable",
        });
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const resetLink = process.env.CLIENT_URL || "http://localhost:5173";

      const replacePlaceholders = (value) =>
        value
          .replace(/{{\s*name\s*}}/g, fullName)
          .replace(/{{\s*firstName\s*}}/g, firstName.trim())
          .replace(/{{\s*lastName\s*}}/g, lastName.trim())
          .replace(/{{\s*email\s*}}/g, normalizedEmail)
          .replace(/{{\s*password\s*}}/g, temporaryPassword)
          .replace(/{{\s*role\s*}}/g, roleDoc.name)
          .replace(/{{\s*resetLink\s*}}/g, resetLink);

      try {
        await sendemail({
          to: normalizedEmail,
          subject: replacePlaceholders(template.subject),
          html: wrapEmailUI(replacePlaceholders(template.body)),
        });
      } catch (mailError) {
        console.error("Failed to dispatch welcome email:", mailError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: emailTemplateId
        ? "User created and credentials emailed successfully"
        : "User created successfully",
      user: getSafeUser(newUser),
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

// ==========================================
// SIGNUP (Customer Public)
// ==========================================
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const customerRole = await Role.findOne({
      name: "customer",
      status: "active",
    });

    if (!customerRole) {
      return res.status(500).json({
        success: false,
        message: "Customer role is not configured",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      email: normalizedEmail,
      phone: phone?.trim() || "",
      password: hashedPassword,
      role: customerRole._id,
      status: "active",
      mustChangePassword: false,
    });

    return res.status(201).json({
      success: true,
      message: "Signup successful. You can now log in.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: "customer",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

// ==========================================
// LOGIN (Customer & Operations Staff)
// ==========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).populate("role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact the administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const roleName = user.role?.name?.toLowerCase();
    if (!roleName) {
      return res.status(403).json({
        success: false,
        message: "No valid role is assigned to this account",
      });
    }

    if (user.role.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your assigned role is inactive.",
      });
    }

    if (user.status === "pending" && !user.mustChangePassword) {
      user.status = "active";
    }
    user.lastLoginAt = new Date();
    await user.save();

    const effectivePermissions =
      Array.isArray(user.permissions) && user.permissions.length > 0
        ? user.permissions
        : user.role?.permissions || [];

    const token = jwt.sign(
      {
        id: user._id,
        role: roleName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: roleName,
        status: user.status,
        mustChangePassword: Boolean(user.mustChangePassword),
        permissions: effectivePermissions,
      },
    });
  } catch (error) {
    console.error("User login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
};

// ==========================================
// GET ALL USERS (Paginated & Filterable)
// ==========================================
const getUsers = async (req, res) => {
  try {
    const {
      search = "",
      role = "",
      status = "",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const filter = {};

    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }

    if (role) filter.role = role;
    if (status) filter.status = status;

    // Exclude super_admin users from listing
    const superAdminRole = await Role.findOne({ name: "super_admin" }).select("_id");
    if (superAdminRole) {
      filter.role = filter.role
        ? { $eq: filter.role, $ne: superAdminRole._id }
        : { $ne: superAdminRole._id };
    }

    const allowedSort = ["firstName", "lastName", "email", "status", "createdAt"];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : "createdAt";

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password -__v")
      .populate("role", "name permissions")
      .sort({ [safeSort]: order === "asc" ? 1 : -1, _id: -1 })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage,
        limit: pageLimit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / pageLimit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ==========================================
// GET SINGLE USER
// ==========================================
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id)
      .select("-password -__v")
      .populate("role", "name status permissions");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let partnerProfile = null;
    if (user.role?.name?.toLowerCase() === "delivery_partner") {
      partnerProfile = await DeliveryPartner.findOne({ user: user._id }).lean();
    }

    return res.status(200).json({
      success: true,
      user: {
        ...getSafeUser(user),
        partnerProfile: partnerProfile || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

// ==========================================
// UPDATE USER DETAILS
// ==========================================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      permissions,
      vehicleType,
      vehicleNumber,
      drivingLicenseNumber,
    } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const targetUser = await User.findById(id).populate("role");
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      String(req.user?.id) === String(targetUser._id) &&
      role &&
      String(role) !== String(targetUser.role?._id || targetUser.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use",
        });
      }
      targetUser.email = normalizedEmail;
    }

    if (role !== undefined) {
      if (!isValidId(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID",
        });
      }

      const roleDoc = await Role.findOne({
        _id: role,
        status: "active",
      });

      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: "Selected role does not exist or is inactive",
        });
      }

      targetUser.role = roleDoc._id;
    }

    if (permissions !== undefined && Array.isArray(permissions)) {
      targetUser.permissions = permissions;
    }

    if (firstName !== undefined) targetUser.firstName = firstName.trim();
    if (lastName !== undefined) targetUser.lastName = lastName.trim();
    if (phone !== undefined) targetUser.phone = phone.trim();

    await targetUser.save();

    const roleName = targetUser.role?.name?.toLowerCase();
    if (roleName === "delivery_partner") {
      const partnerUpdate = {};
      if (vehicleType !== undefined) partnerUpdate.vehicleType = String(vehicleType).toLowerCase().trim();
      if (vehicleNumber !== undefined) partnerUpdate.vehicleNumber = String(vehicleNumber).toUpperCase().trim();
      if (drivingLicenseNumber !== undefined) partnerUpdate.drivingLicenseNumber = String(drivingLicenseNumber).toUpperCase().trim();

      if (Object.keys(partnerUpdate).length > 0) {
        await DeliveryPartner.findOneAndUpdate(
          { user: targetUser._id },
          { $set: partnerUpdate },
          { upsert: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: getSafeUser(targetUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already in use",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

// ==========================================
// CHANGE USER STATUS
// ==========================================
const changeUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active, inactive, or pending",
      });
    }

    const targetUser = await User.findById(id).populate("role");
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    targetUser.status = status;
    await targetUser.save();

    await DeliveryPartner.findOneAndUpdate(
      { user: targetUser._id },
      { $set: { status: status === "inactive" ? "inactive" : "active" } }
    );

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: getSafeUser(targetUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

// ==========================================
// DELETE USER
// ==========================================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    await User.findByIdAndDelete(id);
    await DeliveryPartner.findOneAndDelete({ user: id });

    return res.status(200).json({
      success: true,
      message: "User and linked delivery partner profile deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

// ==========================================
// ==========================================
// CUSTOMER PROFILE
// ==========================================
const getCustomerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id)
      .select("-password -resetOtp -resetOtpExpires -__v")
      .populate("role", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Read role from the DB-populated role document (always accurate)
    const roleName = (user.role?.name || "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    if (roleName !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This endpoint is for customers only.",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.email,
        phone: user.phone || "",
        role: "customer",
      },
    });
  } catch (error) {
    console.error("Get customer profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// ==========================================
// UPDATE CUSTOMER PROFILE
// ==========================================
const updateCustomerProfile = async (req, res) => {
  try {
    const { name, firstName, lastName, email, phone } = req.body;

    const user = await User.findById(req.user.id || req.user._id)
      .populate("role", "name");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Guard: only the logged-in customer can update their own profile
    const roleName = (user.role?.name || "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    if (roleName !== "customer") {
      return res.status(403).json({ success: false, message: "Access denied. This endpoint is for customers only." });
    }

    if (name !== undefined) {
      const parts = name.trim().split(/\s+/);
      user.firstName = parts[0] || "";
      user.lastName = parts.slice(1).join(" ");
    }

    if (firstName !== undefined) {
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      user.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use",
        });
      }

      user.email = normalizedEmail;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.email,
        phone: user.phone || "",
        role: "customer",
      },
    });
  } catch (error) {
    console.error("Update customer profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// ==========================================
// CHANGE CUSTOMER PASSWORD
// ==========================================
const changeCustomerPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id || req.user._id)
      .populate("role", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Guard: only customers can use this endpoint
    const roleName = (user.role?.name || "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    if (roleName !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This endpoint is for customers only.",
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change customer password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// ==========================================
// CUSTOMER LOGOUT
// ==========================================
const customerLogout = async (req, res) => {
  res.clearCookie("customer_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// ==========================================
// GET / UPDATE THEME PREFERENCE (Customer)
// ==========================================
const getThemePreference = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select("theme");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, theme: user.theme || "light" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch theme" });
  }
};

const updateThemePreference = async (req, res) => {
  try {
    const { theme } = req.body;
    if (!["light", "dark"].includes(theme)) {
      return res.status(400).json({ success: false, message: "Invalid theme value" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id || req.user._id,
      { $set: { theme } },
      { new: true, select: "theme" }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, theme: user.theme });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update theme" });
  }
};

module.exports = {
  createUser,
  signup,
  login,
  getUsers,
  getUser,
  updateUser,
  changeUserStatus,
  deleteUser,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  customerLogout,
  getThemePreference,
  updateThemePreference,
};