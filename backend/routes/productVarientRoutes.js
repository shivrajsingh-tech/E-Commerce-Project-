
const express = require("express");

const {
  addProductVariant,
  getProductVariants,
  getProductVariant,
  updateProductVariant,
  changeProductVariantStatus,
  deleteProductVariant,
  getProductVariantsByProduct
} = require("../controllers/productVarientController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");
const upload = require("../middleware/multerMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authentication);

// Get all variants
router.get(
  "/",
  authorizePermissions("variants.view"),
  getProductVariants
);

// Add variant
router.post(
  "/",
  authorizePermissions("variants.create"),
  upload.array("images", 5),
  addProductVariant
);

// Get single variant
router.get(
  "/:id",
  authorizePermissions("variants.view"),
  getProductVariant
);

// Update variant
router.put(
  "/:id",
  authorizePermissions("variants.update"),
  upload.array("images", 5),
  updateProductVariant
);

// Change variant status
router.patch(
  "/:id/status",
  authorizePermissions("variants.status_change"),
  changeProductVariantStatus
);

router.get(
  "/product/:productId",
  getProductVariantsByProduct
);
// Delete variant
router.delete(
  "/:id",
  authorizePermissions("variants.delete"),
  deleteProductVariant
);

module.exports = router;
