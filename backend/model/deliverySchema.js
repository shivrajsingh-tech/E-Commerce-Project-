const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    pickupTime: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    outForDeliveryAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    deliveryStatus: {
      type: String,
      enum: ["assigned", "picked_up", "out_for_delivery", "delivered", "failed"],
      default: "assigned",
    },
    deliveryOtp: { type: String, required: true },
    deliveryAddress: { type: Object, required: true },
    customerLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);