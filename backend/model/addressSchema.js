const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      enum: ["Home", "Work", "Office", "Other"],
      default: "Home",
    },
    receiverName: {
      type: String,
      required: true,
      trim: true,
    },
    receiverPhone: {
      type: String,
      required: true,
      trim: true,
    },
    streetAddress: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Normalized address used only for duplicate detection
    addressKey: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Same customer cannot save the same physical address twice.
// Different customers can save the same address.
addressSchema.index(
  { user: 1, addressKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      addressKey: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Address", addressSchema);