const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Parent Product reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Variant name is required"],
      trim: true,
      maxlength: [100, "Variant name cannot exceed 100 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
      trim: true,
      index: true,
    },
    // Barcode par se strict unique hata diya taaki null conflict na kare
    barcode: {
      type: String,
      trim: true,
      default: undefined,
    },
    unitValue: {
      type: Number,
      required: [true, "Unit value is required"],
      min: [0.001, "Unit value must be greater than zero"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: {
        values: ["g", "kg", "ml", "l", "piece", "pack", "dozen"],
        message: "{VALUE} is not a valid unit",
      },
    },
    mrp: {
      type: Number,
      required: [true, "MRP is required"],
      min: [0.01, "MRP must be greater than zero"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    shippingWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    dimensions: {
      length: { type: Number, default: 0, min: 0 },
      width: { type: Number, default: 0, min: 0 },
      height: { type: Number, default: 0, min: 0 },
      unit: {
        type: String,
        enum: ["cm", "inch"],
        default: "cm",
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productVariantSchema.pre("validate", function () {
  if (
    Number.isFinite(this.mrp) &&
    Number.isFinite(this.sellingPrice) &&
    this.sellingPrice > this.mrp
  ) {
    this.invalidate("sellingPrice", "Selling price cannot exceed MRP");
  }
});

productVariantSchema.virtual("discountPercentage").get(function () {
  if (!this.mrp || this.mrp <= 0) return 0;
  return Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100);
});

productVariantSchema.virtual("discountAmount").get(function () {
  if (this.mrp == null || this.sellingPrice == null) return 0;
  return Number((this.mrp - this.sellingPrice).toFixed(2));
});

module.exports = mongoose.model("ProductVariant", productVariantSchema);