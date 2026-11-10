
const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    description: { type: String, default: "", trim: true },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subCategorySchema.index(
  { category: 1, slug: 1 },
  { unique: true }
);

module.exports = mongoose.model("SubCategory", subCategorySchema);
