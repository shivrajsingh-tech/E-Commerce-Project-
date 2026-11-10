const express = require("express");

const {
  addCategory,
  getCategories,
  getCategory,
  updateCategory,
  changeCategoryStatus,
  deleteCategory,
} = require("../controllers/categoryController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");
const upload = require("../middleware/multerMiddleware");

const router = express.Router();

// Public read-only catalog endpoint
router.get("/active", getCategories);

// All remaining routes require authentication
router.use(authentication);

// Get all categories for authorized dashboard users
router.get(
  "/",
  authorizePermissions("categories.view"),
  getCategories
);

// Add category
router.post(
  "/",
  authorizePermissions("categories.create"),
  upload.single("image"),
  addCategory
);

// Get single category
router.get(
  "/:id",
  authorizePermissions("categories.view"),
  getCategory
);

// Update category
router.put(
  "/:id",
  authorizePermissions("categories.update"),
  upload.single("image"),
  updateCategory
);

// Change category status (Fixed to match permission constants)
router.patch(
  "/:id/status",
  authorizePermissions("categories.status_change"),
  changeCategoryStatus
);

// Delete category
router.delete(
  "/:id",
  authorizePermissions("categories.delete"),
  deleteCategory
);

module.exports = router;