const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");

router.use(authentication);

// Get All Customers
router.get(
  "/",
  authorizePermissions("customers.view"),
  customerController.getAllCustomers
);

// Get Specific Customer Orders
router.get(
  "/:id/orders",
  authorizePermissions("customers.view"),
  customerController.getCustomerOrders
);

// Update Status (active/inactive)
router.patch(
  "/:id/status",
  authorizePermissions("customers.status_change"),
  customerController.toggleCustomerStatus
);

// Update Customer Info
router.put(
  "/:id",
  authorizePermissions("customers.update"),
  customerController.updateCustomer
);

// Delete Customer
router.delete(
  "/:id",
  authorizePermissions("customers.delete"),
  customerController.deleteCustomer
);

module.exports = router;