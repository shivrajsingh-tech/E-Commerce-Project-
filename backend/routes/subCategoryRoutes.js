const express = require("express");

const {
    addSubCategory,
    getSubCategories,
    getSubCategory,
    updateSubCategory,
    changeSubCategoryStatus,
    deleteSubCategory,
} = require("../controllers/subCategoryController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");
const upload = require("../middleware/multerMiddleware");

const router = express.Router();

// Public read-only catalog endpoint.
// The controller must filter inactive/deleted subcategories.
router.get("/active", getSubCategories);

// All remaining routes require authentication.
router.use(authentication);

// Get all subcategories for authorized dashboard users.
router.get(
    "/",
    authorizePermissions("subcategories.view"),
    getSubCategories
);

// Add subcategory.
router.post(
    "/",
    authorizePermissions("subcategories.create"),
    upload.single("image"),
    addSubCategory
);

// Get single subcategory.
router.get(
    "/:id",
    authorizePermissions("subcategories.view"),
    getSubCategory
);

// Update subcategory.
router.put(
    "/:id",
    authorizePermissions("subcategories.update"),
    upload.single("image"),
    updateSubCategory
);

// Change subcategory status.
router.patch(
    "/:id/status",
    authorizePermissions("subcategories.status"),
    changeSubCategoryStatus
);

// Delete subcategory.
router.delete(
    "/:id",
    authorizePermissions("subcategories.delete"),
    deleteSubCategory
);

module.exports = router;