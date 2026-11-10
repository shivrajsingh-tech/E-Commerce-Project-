const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../model/orderSchema");
const Payment = require("../model/paymentSchema");
const Address = require("../model/addressSchema");
const StoreInventory = require("../model/storeInventarySchema");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_placeholder",
});

const generateUniqueOrderCode = () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  const timeSlice = Date.now().toString().slice(-4);
  return `ORD-${dateStr}-${timeSlice}-${randomHex}`;
};

// ----------------------------------------------------
// 1. CREATE RAZORPAY ORDER
// ----------------------------------------------------
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount." });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order: razorpayOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate online payment",
    });
  }
};

// ----------------------------------------------------
// 2. VERIFY SIGNATURE, ATOMIC STOCK VALIDATION & ORDER CREATION
// ----------------------------------------------------
exports.verifyAndCreateOrder = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user." });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderDetails,
    } = req.body;

    // 1. Cryptographic Signature Verification
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_placeholder")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
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
    } = orderDetails;

    const assignedStore = storeId || store;
    if (!assignedStore || !mongoose.Types.ObjectId.isValid(assignedStore)) {
      return res.status(400).json({ success: false, message: "Valid Store ID is required." });
    }

    const selectedAddress = await Address.findOne({ _id: addressId, user: userId });
    if (!selectedAddress) {
      return res.status(404).json({ success: false, message: "Delivery address not found for your account." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order items cannot be empty." });
    }

    // -----------------------------------------------------------------
    // STEP A: STRICT LIVE INVENTORY CHECK (200 items stock bypass blocked)
    // -----------------------------------------------------------------
    for (const it of items) {
      const prodId = it.product || it._id;
      const varId = it.variant || it.variantId || null;
      const requestedQty = Number(it.quantity || 1);

      if (requestedQty <= 0) {
        return res.status(400).json({ success: false, message: "Invalid quantity specified." });
      }

      const invQuery = {
        store: assignedStore,
        product: prodId,
        status: "active",
      };
      if (varId && mongoose.Types.ObjectId.isValid(varId)) {
        invQuery.variant = varId;
      }

      const invRecord = await StoreInventory.findOne(invQuery);

      if (!invRecord) {
        return res.status(400).json({
          success: false,
          message: `Product "${it.name || "Item"}" is out of stock in this store.`,
        });
      }

      const availableToSell = Math.max(
        0,
        Number(invRecord.quantity || 0) - Number(invRecord.reservedQuantity || 0)
      );

      if (availableToSell < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${it.name || "Item"}". Available: ${availableToSell}, requested: ${requestedQty}.`,
        });
      }
    }

    // -----------------------------------------------------------------
    // STEP B: ATOMIC STOCK DECREMENT
    // -----------------------------------------------------------------
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

      // Quantity se exact requested units minus karo
      await StoreInventory.findOneAndUpdate(invQuery, {
        $inc: { quantity: -requestedQty },
      });
    }

    // -----------------------------------------------------------------
    // STEP C: ORDER DOCUMENT CREATION
    // -----------------------------------------------------------------
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
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      orderStatus: "placed",
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      deliveryOtp: otpCode,
      statusHistory: [
        {
          status: "placed",
          changedAt: new Date(),
          reason: `Online payment verified (${razorpay_payment_id}) & inventory stock deducted.`,
          changedBy: userId,
        },
      ],
      placedAt: new Date(),
      estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000),
    });

    // -----------------------------------------------------------------
    // STEP D: AUDIT RECORD IN PAYMENT COLLECTION
    // -----------------------------------------------------------------
    await Payment.create({
      order: newOrder._id,
      user: userId,
      paymentGateway: "Razorpay",
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      amount: Number(totalAmount),
      currency: "INR",
      method: "ONLINE",
      status: "SUCCESS",
      gatewayResponse: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      paidAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Payment verified & Order placed successfully! Stock deducted.",
      order: newOrder,
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save verified order",
    });
  }
};