const express = require("express");
const router = express.Router();

const {
  createStore,
  getAllStores,
  getStoreManagers,
  getStoreById,
  updateStore,
  updateStoreStatus,
  deleteStore,
  getNearbyStores,
} = require("../controllers/storeController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");

router.get("/nearby", getNearbyStores);

// All store endpoints require authenticated staff
router.use(authentication);

// Get available store managers
router.get(
  "/managers",
  authorizePermissions(
    "stores.view",
    "stores.create",
    "stores.update"
  ),
  getStoreManagers
);

// Get all stores
router.get(
  "/getAll",
  authorizePermissions("stores.view"),
  getAllStores
);

// Get one store
router.get(
  "/getOne/:id",
  authorizePermissions("stores.view"),
  getStoreById
);

// Create store
router.post(
  "/create",
  authorizePermissions("stores.create"),
  createStore
);

// Update store
router.put(
  "/update/:id",
  authorizePermissions("stores.update"),
  updateStore
);

// Update status
router.patch(
  "/updateStatus/:id/status",
  authorizePermissions("stores.status_change"),
  updateStoreStatus
);

// Delete store
router.delete(
  "/delete/:id",
  authorizePermissions("stores.delete"),
  deleteStore
);

module.exports = router;