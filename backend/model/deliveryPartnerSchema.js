const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ["bike", "scooter", "bicycle", "ev", "van", "other"],
      default: "bike",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    drivingLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

deliveryPartnerSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);