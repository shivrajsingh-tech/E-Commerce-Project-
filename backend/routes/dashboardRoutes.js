const express = require("express");

const { getDashboard } = require("../controllers/dashboardController");
const authentication = require("../middleware/authentication");
const authorizeRoles = require("../middleware/authorization");
const authorizePermissions = require("../middleware/authorizePermissions"); // Ensure filename matches exactly

const router = express.Router();

// 1. Unified Dashboard: Opens for anyone with 'dashboard.view' (super_admin bypasses automatically)
router.get(
  "/",
  authentication,
  authorizePermissions("dashboard.view"),
  getDashboard
);

// 2. Legacy Super Admin endpoint: Keep untouched for backwards compatibility
router.get(
  "/super-admin",
  authentication,
  authorizeRoles("super_admin"),
  getDashboard
);

module.exports = router;