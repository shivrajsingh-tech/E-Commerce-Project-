
const mongoose = require("mongoose");
const Address = require("../model/addressSchema");

const getUserId = (req) => req.user?._id || req.user?.id;

const normalizeText = (value = "") =>
  String(value).trim().toLowerCase().replace(/\s+/g, " ");

const createAddressKey = ({
  streetAddress,
  landmark,
  city,
  state,
  pincode,
}) => {
  return [
    streetAddress,
    landmark,
    city,
    state,
    pincode,
  ]
    .map(normalizeText)
    .join("|");
};

// Check logged-in user
const checkUser = (req, res) => {
  const userId = getUserId(req);

  if (!userId || !mongoose.isValidObjectId(userId)) {
    res.status(401).json({
      success: false,
      message: "Please login to continue",
    });
    return null;
  }

  return userId;
};

// Duplicate key error
const handleDuplicateError = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This address is already saved in your account",
    });
  }

  return null;
};

// GET ALL ADDRESSES
const getAddresses = async (req, res, next) => {
  try {
    const userId = checkUser(req, res);
    if (!userId) return;

    const addresses = await Address.find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

// ADD ADDRESS
const addAddress = async (req, res, next) => {
  try {
    const userId = checkUser(req, res);
    if (!userId) return;

    const {
      label = "Home",
      receiverName,
      receiverPhone,
      phone,
      streetAddress,
      street,
      landmark = "",
      city,
      state,
      pincode,
      postalCode,
      isDefault = false,
    } = req.body;

    const finalReceiverName = String(
      receiverName || req.user?.name || "Customer"
    ).trim();

    const finalReceiverPhone = String(
      receiverPhone || phone || req.user?.phone || ""
    ).trim();

    const finalStreet = String(streetAddress || street || "").trim();
    const finalLandmark = String(landmark || "").trim();
    const finalCity = String(city || "").trim();
    const finalState = String(state || "").trim();
    const finalPincode = String(pincode || postalCode || "").trim();

    if (
      !finalReceiverName ||
      !finalReceiverPhone ||
      !finalStreet ||
      !finalCity ||
      !finalState ||
      !finalPincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required address fields",
      });
    }

    if (!/^[1-9][0-9]{5}$/.test(finalPincode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit pincode",
      });
    }

    const allowedLabels = ["Home", "Work", "Office", "Other"];

    if (!allowedLabels.includes(label)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address label",
      });
    }

    const addressKey = createAddressKey({
      streetAddress: finalStreet,
      landmark: finalLandmark,
      city: finalCity,
      state: finalState,
      pincode: finalPincode,
    });

    const existingAddress = await Address.findOne({
      user: userId,
      addressKey,
    }).select("+addressKey");

    if (existingAddress) {
      return res.status(409).json({
        success: false,
        message: "This address is already saved in your account",
      });
    }

    const existingCount = await Address.countDocuments({
      user: userId,
    });

    // First address automatically becomes default.
    // Otherwise only explicitly selected address becomes default.
    const shouldBeDefault =
      existingCount === 0 || isDefault === true;

    if (shouldBeDefault) {
      await Address.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = await Address.create({
      user: userId,
      label,
      receiverName: finalReceiverName,
      receiverPhone: finalReceiverPhone,
      streetAddress: finalStreet,
      landmark: finalLandmark,
      city: finalCity,
      state: finalState,
      pincode: finalPincode,
      isDefault: shouldBeDefault,
      addressKey,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    const duplicateResponse = handleDuplicateError(error, res);
    if (duplicateResponse) return;

    next(error);
  }
};

// UPDATE ADDRESS
const updateAddress = async (req, res, next) => {
  try {
    const userId = checkUser(req, res);
    if (!userId) return;

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: userId,
    }).select("+addressKey");

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      label,
      receiverName,
      receiverPhone,
      phone,
      streetAddress,
      street,
      landmark,
      city,
      state,
      pincode,
      postalCode,
      isDefault,
    } = req.body;

    if (label !== undefined) {
      const allowedLabels = ["Home", "Work", "Office", "Other"];

      if (!allowedLabels.includes(label)) {
        return res.status(400).json({
          success: false,
          message: "Invalid address label",
        });
      }

      address.label = label;
    }

    if (receiverName !== undefined) {
      address.receiverName = String(receiverName).trim();
    }

    if (receiverPhone !== undefined || phone !== undefined) {
      address.receiverPhone = String(
        receiverPhone || phone || ""
      ).trim();
    }

    if (streetAddress !== undefined || street !== undefined) {
      address.streetAddress = String(
        streetAddress || street || ""
      ).trim();
    }

    if (landmark !== undefined) {
      address.landmark = String(landmark || "").trim();
    }

    if (city !== undefined) {
      address.city = String(city).trim();
    }

    if (state !== undefined) {
      address.state = String(state).trim();
    }

    if (pincode !== undefined || postalCode !== undefined) {
      address.pincode = String(
        pincode || postalCode || ""
      ).trim();
    }

    if (
      !address.receiverName ||
      !address.receiverPhone ||
      !address.streetAddress ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required address fields",
      });
    }

    if (!/^[1-9][0-9]{5}$/.test(address.pincode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit pincode",
      });
    }

    const addressKey = createAddressKey({
      streetAddress: address.streetAddress,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });

    const duplicateAddress = await Address.findOne({
      user: userId,
      addressKey,
      _id: { $ne: id },
    }).select("+addressKey");

    if (duplicateAddress) {
      return res.status(409).json({
        success: false,
        message: "Another saved address already has these details",
      });
    }

    address.addressKey = addressKey;

    // Make this address default only when explicitly requested.
    if (isDefault === true) {
      await Address.updateMany(
        { user: userId, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );

      address.isDefault = true;
    }

    await address.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    const duplicateResponse = handleDuplicateError(error, res);
    if (duplicateResponse) return;

    next(error);
  }
};

// SET DEFAULT ADDRESS
const setDefaultAddress = async (req, res, next) => {
  try {
    const userId = checkUser(req, res);
    if (!userId) return;

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // If already default, no unnecessary database update.
    if (address.isDefault) {
      return res.status(200).json({
        success: true,
        message: "This address is already your default address",
        address,
      });
    }

    // Remove default from all other addresses of this customer.
    await Address.updateMany(
      { user: userId },
      { $set: { isDefault: false } }
    );

    // Set selected address as default.
    address.isDefault = true;
    await address.save();

    return res.status(200).json({
      success: true,
      message: "Default delivery address updated successfully",
      address,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE ADDRESS
const deleteAddress = async (req, res, next) => {
  try {
    const userId = checkUser(req, res);
    if (!userId) return;

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const addressToDelete = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!addressToDelete) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefault = addressToDelete.isDefault;

    await Address.deleteOne({
      _id: id,
      user: userId,
    });

    // If default address is deleted, select latest remaining address.
    if (wasDefault) {
      const remainingAddress = await Address.findOne({
        user: userId,
      }).sort({ createdAt: -1 });

      if (remainingAddress) {
        await Address.updateMany(
          { user: userId },
          { $set: { isDefault: false } }
        );

        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};
