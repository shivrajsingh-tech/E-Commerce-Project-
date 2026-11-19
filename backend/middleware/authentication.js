const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");

const authentication = async (req, res, next) => {
  try {
    let token = null;

    // 1. Authorization header (works for both apps and API clients)
    if (req.headers?.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      } else {
        token = parts[1] || req.headers.authorization;
      }
    }

    // 2. Custom token header
    if (!token && req.headers?.token) {
      token = req.headers.token;
    }

    // 3. Named cookies — admin_token (admin panel, port 5173)
    //    and customer_token (customer frontend, port 3000) are separate
    //    cookies so they never collide even though both run on localhost.
    if (!token) {
      token = req.cookies?.admin_token || req.cookies?.customer_token || null;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required - No token provided",
      });
    }

    const secret = process.env.JWT_SECRET || "defaultsecret";

    const decoded = jwt.verify(token, secret);

    // Get user ID from token
    const userId = decoded.id || decoded.userId || decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token structure - User ID missing",
      });
    }

    // Fetch user with latest role and role permissions
    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "role",
        select: "name permissions",
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User session is invalid. Account not found.",
      });
    }

    // Check inactive account
    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    // Get latest role name
    const roleName = (
      user.role?.name ||
      (typeof user.role === "string" ? user.role : "") ||
      decoded.role ||
      ""
    )
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    // Get latest permissions from Role document
    const rolePermissions = Array.isArray(user.role?.permissions)
      ? user.role.permissions
      : [];

    // Attach authenticated user to request
    req.user = {
      id: user._id,
      _id: user._id,

      name: user.name,
      email: user.email,

      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,

      // Keep role as string for existing controllers
      role: roleName,

      // Latest permissions from assigned Role
      permissions: rolePermissions,

      mustChangePassword: user.mustChangePassword,
      status: user.status,
    };

    // Continue
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
    });
  }
};

module.exports = authentication;