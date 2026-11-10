const mongoose = require("mongoose");
const Role = require("../model/roleSchema");

const authorization = (...allowedRoles) => {
  // Normalize allowed role names to lowercase
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase().trim()
  );

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // 1. Resolve role name from req.user (already populated in authentication.js)
      let roleName = "";
      if (typeof req.user.role === "string") {
        roleName = req.user.role.toLowerCase().trim();
      } else if (req.user.role && req.user.role.name) {
        roleName = String(req.user.role.name).toLowerCase().trim();
      }

      if (!roleName) {
        return res.status(403).json({
          success: false,
          message: "User role not found or not assigned",
        });
      }

      // 2. MASTER BYPASS: super_admin always has access to all operational routes
      if (roleName === "super_admin") {
        req.userRole = { name: "super_admin" };
        req.userPermissions = req.user.permissions || [];
        return next();
      }

      // 3. Reject customers outright from any staff/admin restricted endpoint
      if (roleName === "customer") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Customer accounts cannot access administrative resources.",
        });
      }

      // 4. Verify if user's role is in allowedRoles
      // If allowedRoles is empty, it just requires any valid staff role (not customer)
      if (
        normalizedAllowedRoles.length > 0 &&
        !normalizedAllowedRoles.includes(roleName)
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have the required role to access this resource",
        });
      }

      // 5. Ensure permissions and userRole are readily available to controllers
      // If authentication middleware already attached permissions, reuse them directly
      if (req.user.permissions && Array.isArray(req.user.permissions)) {
        req.userPermissions = req.user.permissions;
        req.userRole = { name: roleName, permissions: req.user.permissions };
        return next();
      }

      // Fallback: If for some reason permissions were not populated in req.user
      const roleDoc = await Role.findOne({ name: roleName, status: "active" });
      if (!roleDoc) {
        return res.status(403).json({
          success: false,
          message: "Role is inactive, missing, or invalid",
        });
      }

      req.userRole = roleDoc;
      req.userPermissions = Array.isArray(roleDoc.permissions) ? roleDoc.permissions : [];

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorization;