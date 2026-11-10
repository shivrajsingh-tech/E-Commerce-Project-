const express = require("express");

const {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

const authentication = require("../middleware/authentication");
// Match exact filename in your backend/middleware directory
const authorizePermissions = require("../middleware/authorizePermissions");

const router = express.Router();

// All role routes require authenticated staff
router.use(authentication);

// Get all roles
router.get(
  "/",
  authorizePermissions("roles.view"),
  getRoles
);

// Create a new role
router.post(
  "/",
  authorizePermissions("roles.create"),
  createRole
);

// Get one role by ID
router.get(
  "/:id",
  authorizePermissions("roles.view"),
  getRole
);

// Update a role and its permissions
router.put(
  "/:id",
  authorizePermissions("roles.update"),
  updateRole
);

// Delete a role
router.delete(
  "/:id",
  authorizePermissions("roles.delete"),
  deleteRole
);

module.exports = router;