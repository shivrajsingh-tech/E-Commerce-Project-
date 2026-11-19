const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");
const Role = require("../model/roleSchema");
const { sendemail } = require("../utils/mailer");


const admin_signup = async (req, res, next) => {
  try {
    const { firstName, lastName, name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const check = await User.findOne({ email: normalizedEmail });
    if (check) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Only one super_admin allowed
    const superAdminRole = await Role.findOne({ name: "super_admin" });
    if (!superAdminRole) {
      return res.status(500).json({ success: false, message: "super_admin role not seeded. Run role seeder first." });
    }

    const existingSuper = await User.findOne({ role: superAdminRole._id });
    if (existingSuper) {
      return res.status(400).json({ success: false, message: "Super admin already exists" });
    }

    let fName = (firstName || "").trim();
    let lName = (lastName || "").trim();
    if (!fName && name) {
      const parts = String(name).trim().split(/\s+/);
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName: fName || "Super",
      lastName: lName || "Admin",
      email: normalizedEmail,
      password: hashedPassword,
      role: superAdminRole._id,
      status: "active",
      mustChangePassword: false,
    });

    return res.status(201).json({
      success: true,
      message: "Super admin created successfully",
      user: { id: user._id, email: user.email, role: "super_admin" }
    });

  } catch (err) {
    next(err);
  }
};

// 1. SIGNUP (Customer)
const signup = async (req, res, next) => {
  try {
    const { name, firstName, lastName, email, password, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    let fName = typeof firstName === "string" ? firstName.trim() : "";
    let lName = typeof lastName === "string" ? lastName.trim() : "";

    if (!fName && typeof name === "string" && name.trim()) {
      const parts = name.trim().split(/\s+/);
      fName = parts[0] || "";
      lName = lName || parts.slice(1).join(" ");
    }

    const roleDoc = await Role.findOne({
      name: "customer",
      status: "active",
    });

    if (!roleDoc) {
      return res.status(500).json({
        success: false,
        message: "Customer role is not configured",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName: fName,
      lastName: lName,
      email: normalizedEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      password: hashedPassword,
      role: roleDoc._id,
      status: "active",
      mustChangePassword: false,
      isEmailVerified: true,
    });

    const populatedUser = await User.findById(newUser._id)
      .select("-password")
      .populate("role");

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      user: {
        id: populatedUser._id,
        firstName: populatedUser.firstName,
        lastName: populatedUser.lastName,
        email: populatedUser.email,
        role: populatedUser.role?.name || "customer",
        permissions: populatedUser.role?.permissions || [],
        status: populatedUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. LOGIN (Staff & Admins)
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).populate("role", "name permissions status");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact an administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const roleName = (user.role?.name || "").toLowerCase().trim().replace(/[\s-]+/g, "_");

    if (!roleName) {
      return res.status(403).json({
        success: false,
        message: "No valid role assigned to this account. Contact an administrator.",
      });
    }

    if (user.role?.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your assigned role is inactive. Contact an administrator.",
      });
    }

    if (roleName === "customer") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Customer accounts cannot log in to the operations portal.",
      });
    }

    // Auto-activate ONLY if password change is not pending
    if (user.status === "pending" && !user.mustChangePassword) {
      user.status = "active";
    }

    user.lastLoginAt = new Date();
    await user.save();

    const effectivePermissions =
      Array.isArray(user.permissions) && user.permissions.length > 0
        ? user.permissions
        : Array.isArray(user.role?.permissions) ? user.role.permissions : [];

    const token = jwt.sign(
      {
        id: user._id,
        role: roleName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
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
        phone: user.phone || "",
        role: roleName,
        permissions: effectivePermissions,
        status: user.status,
        mustChangePassword: Boolean(user.mustChangePassword),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET CURRENT USER (me)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id)
      .select("-password")
      .populate({
        path: "role",
        select: "name permissions",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const roleName = (
      user.role?.name ||
      (typeof user.role === "string" ? user.role : "") ||
      ""
    )
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    // Customer cannot access admin portal
    if (roleName === "customer") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Always fetch latest permissions from assigned Role
    const effectivePermissions = Array.isArray(user.role?.permissions)
      ? user.role.permissions
      : [];

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,

        firstName: user.firstName,
        lastName: user.lastName,

        email: user.email,
        phone: user.phone || "",

        role: roleName,

        // Latest role permissions
        permissions: effectivePermissions,

        status: user.status,
        mustChangePassword: Boolean(user.mustChangePassword),

        isOnline: Boolean(user.isOnline),
        isAvailable: Boolean(user.isAvailable),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 4. FIRST TIME MANDATORY PASSWORD CHANGE
const firstTimeChangePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.status = "active";
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully! Welcome to your dashboard.",
    });
  } catch (error) {
    next(error);
  }
};

// 5. LOGOUT
const logout = async (req, res, next) => {
  try {
    res.clearCookie("admin_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

// 6. FORGOT PASSWORD (OTP)
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await sendemail({
        to: user.email,
        subject: "Password Reset OTP",
        text: `Your OTP is: ${otp}`,
        html: `<h2>OTP: ${otp}</h2>`,
      });
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "6-digit OTP sent to your registered email.",
    });
  } catch (error) {
    next(error);
  }
};

// 7. VERIFY OTP
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetOtp: otp.toString().trim(),
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

// 8. RESET PASSWORD
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetOtp: otp.toString().trim(),
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Session expired or invalid OTP.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful.",
    });
  } catch (error) {
    next(error);
  }
};

// 9. UPDATE PROFILE
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, email, lastName, phone } = req.body;
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId).populate("role");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (phone !== undefined) user.phone = phone.trim();
    if (email) user.email = email.trim().toLowerCase();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// 10. CHANGE PASSWORD (Regular Settings Page)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user.id || req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  getAdmin: getMe,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updateProfile,
  changePassword,
  firstTimeChangePassword,
  admin_signup
};