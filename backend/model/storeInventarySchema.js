
const mongoose = require("mongoose");

const storeInventorySchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Stock must be a whole number",
      },
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Reserved stock must be a whole number",
      },
    },

    // 20% protected stock policy.
    safetyStockPercentage: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },

    reorderLevel: { type: Number, default: 5, min: 0 },
    maxStockLevel: { type: Number, default: 0, min: 0 },

    // Null means use the variant's default price.
    mrp: { type: Number, default: null, min: 0 },
    sellingPrice: { type: Number, default: null, min: 0 },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastRestockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

storeInventorySchema.pre("validate", function () {
  if (this.reservedQuantity > this.quantity) {
    this.invalidate(
      "reservedQuantity",
      "Reserved stock cannot exceed physical stock"
    );
  }

  if (
    this.mrp != null &&
    this.sellingPrice != null &&
    this.sellingPrice > this.mrp
  ) {
    this.invalidate(
      "sellingPrice",
      "Store selling price cannot exceed store MRP"
    );
  }
});

storeInventorySchema.virtual("safetyStockQuantity").get(function () {
  return Math.ceil(
    this.quantity * (this.safetyStockPercentage / 100)
  );
});

storeInventorySchema.virtual("availableQuantity").get(function () {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

storeInventorySchema.virtual("availableToSell").get(function () {
  return Math.max(
    0,
    this.quantity -
      this.reservedQuantity -
      this.safetyStockQuantity
  );
});

storeInventorySchema.virtual("stockStatus").get(function () {
  if (this.status !== "active") return "inactive";

  const available = Math.max(
    0,
    this.quantity -
      this.reservedQuantity -
      this.safetyStockQuantity
  );

  if (available === 0) return "out_of_stock";
  if (available <= this.reorderLevel) return "low_stock";

  return "in_stock";
});

storeInventorySchema.set("toJSON", { virtuals: true });
storeInventorySchema.set("toObject", { virtuals: true });

storeInventorySchema.index(
  { store: 1, variant: 1 },
  { unique: true }
);

module.exports = mongoose.model("StoreInventory", storeInventorySchema);
