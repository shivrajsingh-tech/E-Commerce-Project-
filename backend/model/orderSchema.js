const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    variantId: { type: String, default: "" },
    name: { type: String, required: true },
    unit: { type: String, default: "" },
    price: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    subtotal: { type: Number, required: true, default: 0 },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      default: null,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      default: null,
    },
    deliveryAddress: {
      receiverName: { type: String, default: "" },
      receiverPhone: { type: String, default: "" },
      streetAddress: { type: String, default: "" },
      landmark: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    itemTotal: { type: Number, required: true, default: 0 },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    handlingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    
    // Payment IDs Tracking
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE", "WALLET"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    transactionId: {
      type: String,
      default: null,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },

    // Order Lifecycle & History
    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "packing",
        "ready_for_pickup",
        "assigned",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    deliveryOtp: { type: String, default: null },
    placedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
    estimatedDeliveryTime: {
      type: Date,
      default: () => new Date(Date.now() + 25 * 60 * 1000),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);