const express = require("express");
const router = express.Router();

// 1. Controller functions import (Make sure controller file name matches your project)
const {
  addInventory,
  getInventories,
  getInventory,
  updateInventory,
  changeInventoryStatus,
  deleteInventory,
} = require("../controllers/inventaryController");

// 2. Middlewares import (Check spelling: authorizePermission vs authorizePermissions)
const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");

// All inventory operations require authentication
router.use(authentication);

// Line 20: GET all inventories
router.get(
  "/",
  authorizePermissions("inventory.view"),
  getInventories
);

// GET single inventory
router.get(
  "/:id",
  authorizePermissions("inventory.view"),
  getInventory
);

// POST create inventory
router.post(
  "/",
  authorizePermissions("inventory.create"),
  addInventory
);

// PUT update inventory
router.put(
  "/:id",
  authorizePermissions("inventory.update"),
  updateInventory
);

// PATCH status
router.patch(
  "/status/:id",
  authorizePermissions("inventory.status_change"),
  changeInventoryStatus
);

// DELETE inventory
router.delete(
  "/:id",
  authorizePermissions("inventory.delete"),
  deleteInventory
);

module.exports = router;