
const mongoose = require("mongoose");
const Role = require("../model/roleSchema");

const normalizeRoleName = (name) => {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
};

const isSuperAdmin = (role) => {
  const roleName = typeof role === "object" ? role?.name : role;

  const normalized = normalizeRoleName(roleName);

  return normalized === "super_admin" || normalized === "superadmin";
};

const authorizePermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const rawRole = req.user.role;

      if (!rawRole) {
        return res.status(403).json({
          success: false,
          message: "User role not assigned",
        });
      }

      let roleDoc = null;

      // Find role from database
      if (typeof rawRole === "object" && rawRole.name) {
        roleDoc = rawRole;
      } else {
        const roleId =
          typeof rawRole === "string"
            ? rawRole
            : rawRole.toString();

        if (mongoose.isValidObjectId(roleId)) {
          roleDoc = await Role.findOne({
            _id: roleId,
            status: "active",
          });
        } else {
          roleDoc = await Role.findOne({
            name: normalizeRoleName(roleId),
            status: "active",
          });
        }
      }

      if (!roleDoc) {
        return res.status(403).json({
          success: false,
          message: "Invalid or inactive role",
        });
      }

      const roleName = normalizeRoleName(roleDoc.name);

      // Super Admin bypass
      if (isSuperAdmin(roleDoc)) {
        req.userRole = roleDoc;
        req.userPermissions = ["*"];
        req.user.role = roleName;

        return next();
      }

      const userPermissions = [
        ...(req.user.permissions || []),
        ...(roleDoc.permissions || []),
      ];

      console.log("Current Role:", roleName);
      console.log("User Permissions:", userPermissions);
      console.log("Required Permissions:", requiredPermissions);

      const hasAllRequired = requiredPermissions.every(
        (permission) => userPermissions.includes(permission)
      );

      if (!hasAllRequired) {
        return res.status(403).json({
          success: false,
          message: `Permission denied. Required: ${requiredPermissions.join(", ")}`,
        });
      }

      req.userRole = roleDoc;
      req.userPermissions = userPermissions;
      req.user.role = roleName;

      return next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorizePermissions;
