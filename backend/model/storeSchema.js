
const mongoose = require("mongoose");

const isValidPincode = (value) =>
  /^[1-9]\d{5}$/.test(String(value || "").trim());

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },

    code: {
      type: String,
      required: [true, "Store code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, "Store code cannot exceed 30 characters"],
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Store manager is required"],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (value) =>
          !value || /^\+?[0-9]{10,15}$/.test(value),
        message: "Enter a valid phone number",
      },
    },

    address: {
      type: String,
      required: [true, "Store address is required"],
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },

    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
      maxlength: [100, "Area cannot exceed 100 characters"],
    },

    postOffice: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    district: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    pincode: {
      type: String,
      required: [true, "PIN code is required"],
      trim: true,
      validate: {
        validator: isValidPincode,
        message: "Enter a valid 6-digit Indian PIN code",
      },
    },

    serviceablePincodes: {
      type: [
        {
          type: String,
          trim: true,
          validate: {
            validator: isValidPincode,
            message: "Enter a valid 6-digit PIN code",
          },
        },
      ],
      default: function () {
        return this.pincode ? [this.pincode] : [];
      },
      validate: {
        validator: function (pincodes) {
          return pincodes.length === new Set(pincodes).size;
        },
        message: "Duplicate serviceable PIN codes are not allowed",
      },
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },

      coordinates: {
        type: [Number],
        required: [true, "Store coordinates are required"],
        validate: {
          validator: (coordinates) =>
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            Number.isFinite(coordinates[0]) &&
            Number.isFinite(coordinates[1]) &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90 &&
            !(coordinates[0] === 0 && coordinates[1] === 0),
          message:
            "Coordinates must be valid [longitude, latitude] values",
        },
      },
    },

    serviceRadius: {
      type: Number,
      required: true,
      default: 8,
      min: [0.1, "Service radius must be at least 0.1 km"],
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
  }
);

storeSchema.index({ location: "2dsphere" });

storeSchema.index({
  serviceablePincodes: 1,
  status: 1,
});

module.exports = mongoose.model("Store", storeSchema);
