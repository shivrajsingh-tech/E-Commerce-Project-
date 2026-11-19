const mongoose = require("mongoose");
const crypto = require("crypto");

const Order = require("../model/orderSchema");
const Address = require("../model/addressSchema");
const StoreInventory = require("../model/storeInventarySchema");


const generateUniqueOrderCode = () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  const timeSlice = Date.now().toString().slice(-4);
  return `ORD-${dateStr}-${timeSlice}-${randomHex}`;
};

// ========================================================
// 1. CREATE ORDER (With Live Inventory Stock Deduction)
// ========================================================
const createOrder = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user." });
    }

    const {
      storeId,
      store,
      addressId,
      items,
      itemTotal,
      subtotal,
      discount = 0,
      deliveryFee = 0,
      handlingFee = 0,
      tax = 0,
      totalAmount,
      paymentMethod = "COD",
    } = req.body;

    const assignedStore = storeId || store;
    if (!assignedStore || !mongoose.Types.ObjectId.isValid(assignedStore)) {
      return res.status(400).json({ success: false, message: "Valid Store ID is required." });
    }

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: "Valid delivery address is required." });
    }

    const selectedAddress = await Address.findOne({ _id: addressId, user: userId });
    if (!selectedAddress) {
      return res.status(404).json({ success: false, message: "Delivery address does not belong to your account." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order items cannot be empty." });
    }

    // ----------------------------------------------------
    // STEP A: LIVE STOCK CHECK PEHLE KARO (Pre-Order Validation)
    // ----------------------------------------------------
    for (const it of items) {
      const prodId = it.product || it._id;
      const varId = it.variant || it.variantId || null;
      const requestedQty = Number(it.quantity || 1);

      const invQuery = {
        store: assignedStore,
        product: prodId,
      };
      if (varId && mongoose.Types.ObjectId.isValid(varId)) {
        invQuery.variant = varId;
      }

      const invRecord = await StoreInventory.findOne(invQuery);

      if (!invRecord) {
        return res.status(400).json({
          success: false,
          message: `Product "${it.name || "Item"}" is not available in the selected store inventory.`,
        });
      }

      const availableToSell = Math.max(
        0,
        Number(invRecord.quantity || 0) - Number(invRecord.reservedQuantity || 0)
      );

      if (availableToSell < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${it.name || "Item"}". Only ${availableToSell} left in stock.`,
        });
      }
    }

    // ----------------------------------------------------
    // STEP B: DEDUCT STOCK FROM STORE INVENTORY
    // ----------------------------------------------------
    for (const it of items) {
      const prodId = it.product || it._id;
      const varId = it.variant || it.variantId || null;
      const requestedQty = Number(it.quantity || 1);

      const invQuery = {
        store: assignedStore,
        product: prodId,
      };
      if (varId && mongoose.Types.ObjectId.isValid(varId)) {
        invQuery.variant = varId;
      }

      // Quantity ko live minus karo
      await StoreInventory.findOneAndUpdate(invQuery, {
        $inc: { quantity: -requestedQty },
      });
    }

    // ----------------------------------------------------
    // STEP C: CREATE ORDER DOCUMENT
    // ----------------------------------------------------
    const formattedItems = items.map((it) => {
      const price = Number(it.price || it.discountPrice || 0);
      const qty = Number(it.quantity || 1);
      return {
        product: it.product || it._id,
        variant: it.variant || it.variantId || null,
        variantId: String(it.variantId || it._id || ""),
        name: String(it.name || it.title || "Grocery Item"),
        unit: String(it.unit || "1 pack"),
        price,
        quantity: qty,
        subtotal: Number(it.subtotal || price * qty),
      };
    });

    const generatedCode = generateUniqueOrderCode();
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = await Order.create({
      orderId: generatedCode,
      orderNumber: generatedCode,
      customer: userId,
      user: userId,
      store: assignedStore,
      address: selectedAddress._id,
      deliveryAddress: {
        receiverName: selectedAddress.receiverName || req.user?.name || "Customer",
        receiverPhone: selectedAddress.receiverPhone || req.user?.phone || "",
        streetAddress: selectedAddress.streetAddress || "",
        landmark: selectedAddress.landmark || "",
        city: selectedAddress.city || "",
        state: selectedAddress.state || "",
        pincode: selectedAddress.pincode || "",
        coordinates: selectedAddress.coordinates || [0, 0],
      },
      items: formattedItems,
      itemTotal: Number(itemTotal || subtotal || totalAmount),
      subtotal: Number(subtotal || itemTotal || totalAmount),
      discount: Number(discount || 0),
      deliveryFee: Number(deliveryFee || 0),
      handlingFee: Number(handlingFee || 0),
      tax: Number(tax || 0),
      totalAmount: Number(totalAmount),
      paymentMethod: paymentMethod || "COD",
      paymentStatus: paymentMethod === "ONLINE" ? "SUCCESS" : "PENDING",
      orderStatus: "placed",
      deliveryOtp: otpCode,
      statusHistory: [
        {
          status: "placed",
          changedAt: new Date(),
          reason: `Order placed via ${paymentMethod} and stock reserved/deducted`,
          changedBy: userId,
        },
      ],
      placedAt: new Date(),
      estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000),
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully! Inventory updated.",
      order: newOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order.",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { cancellationReason, reason } = req.body;
    const finalReason = cancellationReason || reason || "Cancelled by customer";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findOne({
      _id: id,
      $or: [{ customer: userId }, { user: userId }],
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or unauthorized." });
    }

    if (["out_for_delivery", "delivered", "cancelled"].includes(String(order.orderStatus).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already ${order.orderStatus}.`,
      });
    }

    // ----------------------------------------------------
    // RESTOCK INVENTORY: Stock wapas StoreInventory me jod do
    // ----------------------------------------------------
    if (Array.isArray(order.items) && order.store) {
      for (const it of order.items) {
        const prodId = it.product;
        const varId = it.variant || it.variantId || null;
        const returnQty = Number(it.quantity || 1);

        const invQuery = {
          store: order.store,
          product: prodId,
        };
        if (varId && mongoose.Types.ObjectId.isValid(varId)) {
          invQuery.variant = varId;
        }

        await StoreInventory.findOneAndUpdate(invQuery, {
          $inc: { quantity: returnQty },
        });
      }
    }

    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = finalReason;
    if (order.paymentStatus === "PENDING") {
      order.paymentStatus = "FAILED";
    }

    order.statusHistory.push({
      status: "cancelled",
      changedAt: new Date(),
      reason: `${finalReason} (Stock restocked to inventory)`,
      changedBy: userId,
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled and items successfully restocked to store inventory.",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel order.",
    });
  }
};


// ========================================================
// 2. GET MY ORDERS (Strictly Isolated to Logged-in Customer)
// ========================================================
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    // STRICT FILTER: Doosre kisi user ka order query hi nahi hoga
    const orders = await Order.find({
      $or: [{ customer: userId }, { user: userId }],
    })
      .populate("address")
      .populate("store", "name address phone")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch your orders.",
    });
  }
};


// ========================================================
// 4. GET SINGLE ORDER (With Security Check)
// ========================================================
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id)
      .populate("address")
      .populate("customer", "name email phone")
      .populate("store", "name phone address")
      .populate("deliveryPartner", "vehicleNumber vehicleType status")
      .populate("items.product", "name images");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const isCustomerOwner =
      String(order.customer?._id || order.customer) === String(userId) ||
      String(order.user?._id || order.user) === String(userId);

    const isDeliveryPartner =
      String(order.deliveryPartner?._id || order.deliveryPartner) === String(userId);

    const userRole = req.user?.role?.name || req.user?.role || "";
    const isStaff = ["super_admin", "admin", "store_manager", "delivery_manager"].includes(
      String(userRole).toLowerCase()
    );

    // Agar na owner hai, na delivery boy aur na staff, toh data leak mat hone do
    if (!isCustomerOwner && !isDeliveryPartner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this order.",
      });
    }

    const result = order.toObject();

    // OTP sirf order owner ko dikhega, doosro ko nahi
    if (!isCustomerOwner && !isStaff) {
      delete result.deliveryOtp;
    }

    return res.status(200).json({
      success: true,
      order: result,
    });
  } catch (error) {
    console.error("Get order by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch order details.",
    });
  }
};

// ========================================================
// 5. DELIVERY PARTNER TASKS (Bulletproof ID & Status Match)
// ========================================================
const getMyDeliveryTask = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    // 1. Find if a DeliveryPartner profile exists for this user
    const DeliveryPartner = require("../model/deliveryPartnerSchema");
    const partnerRecord = await DeliveryPartner.findOne({ user: userId });
    const partnerId = partnerRecord ? partnerRecord._id : null;

    // 2. Build flexible query matching either User ID or DeliveryPartner Profile ID
    const queryIdentifiers = [userId];
    if (partnerId) {
      queryIdentifiers.push(partnerId);
    }

    const orders = await Order.find({
      deliveryPartner: { $in: queryIdentifiers },
      orderStatus: { $in: ["assigned", "ready_for_pickup", "out_for_delivery", "confirmed"] },
    })
      .populate("customer", "name email phone")
      .populate("store", "name phone address")
      .populate("address")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get delivery tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch delivery tasks.",
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.orderStatus = req.query.status;
    }
    if (req.query.storeId) {
      filter.store = req.query.storeId;
    }

    const orders = await Order.find(filter)
      .populate("customer", "name email phone firstName lastName")
      .populate("store", "name")
      .populate({
        path: "deliveryPartner",
        select: "firstName lastName phone vehicleNumber vehicleType",
      })
      .populate("items.product", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch orders.",
    });
  }
};

// ========================================================
// 7. DELETE ORDER (Admin Only - Soft or Hard)
// ========================================================
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (!["cancelled", "delivered"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only cancelled or delivered orders can be deleted.",
      });
    }

    await Order.findByIdAndDelete(order._id);

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully.",
    });
  } catch (error) {
    console.error("Delete order error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete order.",
    });
  }
};
// ========================================================
// 8. UPDATE ORDER DETAILS (For Manager/Admin Edit Modal)
// ========================================================
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, deliveryAddress } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const previousStatus = order.orderStatus;

    if (orderStatus && orderStatus !== previousStatus) {
      order.orderStatus = orderStatus;

      order.statusHistory.push({
        status: orderStatus,
        changedAt: new Date(),
        reason: `Order status changed from ${previousStatus} to ${orderStatus}`,
        changedBy: req.user?._id || req.user?.id,
      });

      // Status ke according timestamp update karo
      if (orderStatus === "assigned") {
        order.assignedAt = new Date();
      }

      if (orderStatus === "out_for_delivery") {
        order.pickedUpAt = new Date();
      }

      if (orderStatus === "delivered") {
        order.deliveredAt = new Date();
      }

      if (orderStatus === "cancelled") {
        order.cancelledAt = new Date();
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    if (deliveryAddress) {
      order.deliveryAddress = {
        ...order.deliveryAddress,
        ...deliveryAddress,
      };
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Update order error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update order.",
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  cancelOrder,
  getOrderById,
  getMyDeliveryTask,
  getAllOrders,
  deleteOrder,
  updateOrder
};