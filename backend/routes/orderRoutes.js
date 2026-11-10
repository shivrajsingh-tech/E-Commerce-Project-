const express = require("express");
const router = express.Router();
const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");
const orderController = require("../controllers/orderController");

router.use(authentication);

// 1. SPECIFIC GET ROUTES
router.get("/", authorizePermissions("orders.view"), orderController.getAllOrders);
router.get("/my-orders", orderController.getMyOrders);
router.get("/my-delivery-task", orderController.getMyDeliveryTask);

// 2. DYNAMIC PARAM ROUTES
router.get("/:id", authorizePermissions("orders.view"), orderController.getOrderById);

// 3. POST & PATCH
router.post("/", orderController.createOrder);
router.post("/create", orderController.createOrder);

// Status change endpoint
router.patch(
  "/:id/status",
  authorizePermissions("orders.status_change"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const Order = require("../model/orderSchema");

      const updateData = { orderStatus: status };
      if (status === "delivered") updateData.deliveredAt = new Date();
      if (status === "cancelled") {
        updateData.cancelledAt = new Date();
        updateData.cancelledReason = req.body.reason || "Updated by Admin";
      }

      const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
        returnDocument: "after",
      });

      return res.status(200).json({
        success: true,
        message: `Order status changed to ${status}`,
        order,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.patch("/:id/cancel", orderController.cancelOrder);
router.post("/:id/cancel", orderController.cancelOrder);

// Delete order
router.delete("/:id", authorizePermissions("orders.delete"), orderController.deleteOrder);


router.put(
  "/:id",
  authorizePermissions("orders.update"),
  orderController.updateOrder
);

module.exports = router;