const Role = require("../model/roleSchema");
const User = require("../model/userSchema");
const permissions = require("../constants/permission");

const AVAILABLE_PERMISSIONS = Object.values(permissions);

// Delete aur Rename ke liye reserved roles
const PROTECTED_ROLES = ["super_admin", "super-admin", "customer"];

// ========================
// 1. CREATE ROLE
// ========================
const createRole = async (req, res, next) => {
  try {
    const { name, permissions: requestedPermissions = [], status = "active" } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    if (!Array.isArray(requestedPermissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    const normalizedName = name.trim().toLowerCase().replace(/[\s-]+/g, "_");

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Role name cannot be empty",
      });
    }

    if (PROTECTED_ROLES.includes(normalizedName)) {
      return res.status(400).json({
        success: false,
        message: `The role name "${normalizedName}" is reserved by the system`,
      });
    }

    const existingRole = await Role.findOne({ name: normalizedName });
    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: "A role with this name already exists",
      });
    }

    const invalidPermissions = requestedPermissions.filter(
      (perm) => typeof perm !== "string" || !AVAILABLE_PERMISSIONS.includes(perm)
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more permissions are invalid",
        invalidPermissions,
      });
    }

    const role = await Role.create({
      name: normalizedName,
      permissions: [...new Set(requestedPermissions)],
      status: ["active", "inactive"].includes(status) ? status : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      role,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Role already exists",
      });
    }
    
    next(error);
  }
};

// ========================
// 2. GET ALL ROLES
// ========================
const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: roles.length,
      roles,
    });
  } catch (error) {
    next(error);
  }
};

// ========================
// 3. GET SINGLE ROLE
// ========================
const getRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      role,
    });
  } catch (error) {
    next(error);
  }
};

// ========================
// 4. UPDATE ROLE
// ========================
const updateRole = async (req, res, next) => {
  try {
    const { name, permissions: requestedPermissions, status } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Super Admin role ko change nahi kar sakte
    if (["super_admin", "super-admin"].includes(role.name)) {
      return res.status(403).json({
        success: false,
        message: "Super admin role configuration is fixed and cannot be modified",
      });
    }

if (name !== undefined) {
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Valid role name is required",
    });
  }

  const normalizedName = name.trim().toLowerCase().replace(/[\s-]+/g, "_");

      // Agar customer role hai, to uska naam badalna mana hai
      if (role.name === "customer" && normalizedName !== "customer") {
        return res.status(400).json({
          success: false,
          message: "System role 'customer' name cannot be renamed",
        });
      }

      if (normalizedName !== role.name) {
        if (PROTECTED_ROLES.includes(normalizedName)) {
          return res.status(400).json({
            success: false,
            message: `The role name "${normalizedName}" is reserved`,
          });
        }

        const duplicate = await Role.findOne({
          name: normalizedName,
          _id: { $ne: role._id },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "Another role already uses this name",
          });
        }

        role.name = normalizedName;
      }
    }

    // Permissions update handling (Ab Customer ko allow karega)
    if (requestedPermissions !== undefined) {
      if (!Array.isArray(requestedPermissions)) {
        return res.status(400).json({
          success: false,
          message: "Permissions must be an array",
        });
      }

      const invalidPermissions = requestedPermissions.filter(
        (perm) => typeof perm !== "string" || !AVAILABLE_PERMISSIONS.includes(perm)
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: "One or more permissions are invalid",
          invalidPermissions,
        });
      }

      role.permissions = [...new Set(requestedPermissions)];
    }

    // Status update handling
    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be active or inactive",
        });
      }
      role.status = status;
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      role,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Role name already exists",
      });
    }
    next(error);
  }
};

// ========================
// 5. DELETE ROLE
// ========================
const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Customer ya Super Admin ko delete nahi karne dega
    if (PROTECTED_ROLES.includes(role.name)) {
      return res.status(403).json({
        success: false,
        message: `The reserved role "${role.name}" cannot be deleted`,
      });
    }

    const assignedUsers = await User.exists({ role: role._id });
    if (assignedUsers) {
      return res.status(409).json({
        success: false,
        message: "This role is currently assigned to users and cannot be deleted. Reassign those users first.",
      });
    }

    await Role.findByIdAndDelete(role._id);

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  AVAILABLE_PERMISSIONS,
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
};