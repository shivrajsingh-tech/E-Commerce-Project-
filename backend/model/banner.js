const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
    },
    badge: {
      type: String,
      default: "LIMITED OFFER",
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    // Safe ObjectId string bina crash hone wale ref ke
    category: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      url: {
        type: String,
        default: "",
        trim: true,
      },
      public_id: {
        type: String,
        default: "",
        trim: true,
      },
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);