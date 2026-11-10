const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    logo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Brand", brandSchema);
