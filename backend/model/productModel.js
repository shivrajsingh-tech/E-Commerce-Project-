const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
    publicId: {
      type: String,
      required: [true, "Cloudinary publicId is required"],
      trim: true,
    },
  },
  { _id: false }
);

const specificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Specification key is required"],
      trim: true,
    },
    value: {
      type: String,
      required: [true, "Specification value is required"],
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: [true, "SubCategory is required"],
      index: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "Maximum 5 images are allowed",
      },
    },
    specifications: {
      type: [specificationSchema],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual Populate for child variants
productSchema.virtual("variants", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "product",
});

productSchema.index({ category: 1, subCategory: 1, status: 1 });

module.exports = mongoose.model("Product", productSchema);