const express = require("express");

const {
  addProduct,
  getProducts,
  getProduct,
  updateProduct,
  changeProductStatus,
  deleteProduct,
  getProductBySlug
} = require("../controllers/productController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");
const upload = require("../middleware/multerMiddleware");

const router = express.Router();

// ==========================================
// 1. PUBLIC ROUTES (Storefront & Portal View)
// ==========================================
router.get("/", getProducts);
router.get("/:id", getProduct);

// ==========================================
// 2. PROTECTED STAFF ROUTES
// ==========================================
router.use(authentication);

router.post(
  "/",
  authorizePermissions("products.create"),
  upload.array("images", 5),
  addProduct
);

router.put(
  "/:id",
  authorizePermissions("products.update"),
  upload.array("images", 5),
  updateProduct
);
router.get("/slug/:slug", getProductBySlug);

router.patch(
  "/:id/status",
  authorizePermissions("products.status_change"),
  changeProductStatus
);

router.delete(
  "/:id",
  authorizePermissions("products.delete"),
  deleteProduct
);

module.exports = router;