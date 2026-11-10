const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minimumOrderAmount: { type: Number, default: 0 },
    maximumDiscount: { type: Number, default: null },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);