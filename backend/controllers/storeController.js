
const mongoose = require("mongoose");
const Store = require("../model/storeSchema");
const StoreInventory = require("../model/storeInventarySchema");
const User = require("../model/userSchema");
const Role = require("../model/roleSchema");

// ================= HELPERS =================
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidPincode = (pincode) =>
  /^[1-9]\d{5}$/.test(String(pincode || "").trim());

const isValidServiceRadius = (radius) =>
  Number.isFinite(radius) && radius >= 0.1;

const verifyStoreManager = async (managerId) => {
  if (!mongoose.isValidObjectId(managerId)) {
    return false;
  }

  const managerRole = await Role.findOne({
    name: "store_manager",
  });

  if (!managerRole) {
    return false;
  }

  const manager = await User.findOne({
    _id: managerId,
    role: managerRole._id,
    status: "active",
  });

  return Boolean(manager);
};

// Coordinates format: [longitude, latitude]
const getCoordinates = (location, latitude, longitude) => {
  let geoLocation = location;

  if (typeof geoLocation === "string") {
    try {
      geoLocation = JSON.parse(geoLocation);
    } catch {
      return null;
    }
  }

  let coordinates = geoLocation?.coordinates;

  if (
    !Array.isArray(coordinates) &&
    latitude !== undefined &&
    longitude !== undefined
  ) {
    coordinates = [Number(longitude), Number(latitude)];
  }

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null;
  }

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90 ||
    (lng === 0 && lat === 0)
  ) {
    return null;
  }

  return [lng, lat];
};

// Serviceable PIN codes validate karna
const getServiceablePincodes = (pincodes, mainPincode) => {
  let list = [];

  if (Array.isArray(pincodes)) {
    list = pincodes;
  } else if (typeof pincodes === "string" && pincodes.trim()) {
    try {
      const parsed = JSON.parse(pincodes);
      list = Array.isArray(parsed) ? parsed : pincodes.split(",");
    } catch {
      list = pincodes.split(",");
    }
  }

  const cleanList = list.map((pin) => String(pin).trim());

  if (cleanList.some((pin) => !isValidPincode(pin))) {
    return null;
  }

  if (mainPincode && !isValidPincode(mainPincode)) {
    return null;
  }

  if (mainPincode) {
    cleanList.push(String(mainPincode).trim());
  }

  return [...new Set(cleanList)];
};

const sendValidationError = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });


// ================= NEARBY STORES =================
const getNearbyStores = async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    console.log(lat);
    console.log(lng);
    
    

    if (
      req.query.lat === undefined ||
      req.query.lng === undefined ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      (lat === 0 && lng === 0)
    ) {
      return sendValidationError(
        res,
        "Valid latitude and longitude are required"
      );
    }

    const stores = await Store.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          key: "location",
          distanceField: "distanceInMeters",
          spherical: true,
          query: {
            status: "active",
            serviceRadius: { $exists: true, $gte: 0.1 ,$lte:8000 },
          },
        },
      },

      // Check each store's own configured service radius
      {
        $match: {
          $expr: {
            $lte: [
              "$distanceInMeters",
              { $multiply: ["$serviceRadius", 1000] },
            ],
          },
        },
      },

      { $sort: { distanceInMeters: 1 } },
      { $limit: 20 },

      {
        $lookup: {
          from: "users",
          localField: "manager",
          foreignField: "_id",
          as: "manager",
        },
      },

      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          name: 1,
          code: 1,
          address: 1,
          area: 1,
          postOffice: 1,
          city: 1,
          district: 1,
          state: 1,
          country: 1,
          pincode: 1,
          serviceablePincodes: 1,
          location: 1,
          serviceRadius: 1,
          status: 1,
          distanceInMeters: 1,
          "manager.firstName": 1,
          "manager.lastName": 1,
        },
      },
    ]);

    console.log(stores);
    

    return res.status(200).json({
      success: true,
      count: stores.length,
      stores: stores.map((store) => ({
        ...store,
        distanceInKm: Number(
          (store.distanceInMeters / 1000).toFixed(2)
        ),
      })),
      message:
        stores.length > 0
          ? "Nearby stores found"
          : "Delivery is not available at your location",
    });
  } catch (error) {
    next(error);
  }
};

// ================= CREATE STORE =================
const createStore = async (req, res, next) => {
  try {
    const {
      name,
      code,
      manager,
      phone,
      address,
      area,
      postOffice,
      city,
      district,
      state,
      country,
      pincode,
      serviceablePincodes,
      location,
      latitude,
      longitude,
      serviceRadius,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim() ||
      !manager
    ) {
      return sendValidationError(
        res,
        "Store name, code, and manager are required"
      );
    }

    if (name.trim().length > 100 || code.trim().length > 30) {
      return sendValidationError(
        res,
        "Store name or code exceeds the allowed length"
      );
    }

    if (
      typeof address !== "string" ||
      !address.trim() ||
      address.trim().length > 500 ||
      typeof area !== "string" ||
      !area.trim() ||
      area.trim().length > 100
    ) {
      return sendValidationError(
        res,
        "A valid address and area are required"
      );
    }

    const cleanPincode = String(pincode || "").trim();

    if (!isValidPincode(cleanPincode)) {
      return sendValidationError(
        res,
        "Enter a valid 6-digit Indian PIN code"
      );
    }

    if (phone && !/^\+?[0-9]{10,15}$/.test(String(phone).trim())) {
      return sendValidationError(res, "Enter a valid phone number");
    }

    if (!(await verifyStoreManager(manager))) {
      return sendValidationError(
        res,
        "Assigned user is not an active store manager"
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const existingStore = await Store.findOne({
      code: normalizedCode,
    });

    if (existingStore) {
      return res.status(409).json({
        success: false,
        message: "Store code already exists",
      });
    }

    const radius =
      serviceRadius === "" || serviceRadius === undefined
        ? 8
        : Number(serviceRadius);

    if (!isValidServiceRadius(radius)) {
      return sendValidationError(
        res,
        "Service radius must be a valid number of at least 0.1 km"
      );
    }

    const coordinates = getCoordinates(
      location,
      latitude,
      longitude
    );

    if (!coordinates) {
      return sendValidationError(
        res,
        "Valid location coordinates are required as [longitude, latitude]"
      );
    }

    const cleanServiceablePincodes = getServiceablePincodes(
      serviceablePincodes,
      cleanPincode
    );

    if (!cleanServiceablePincodes) {
      return sendValidationError(
        res,
        "All serviceable PIN codes must be valid 6-digit Indian PIN codes"
      );
    }

    const store = await Store.create({
      name: name.trim(),
      code: normalizedCode,
      manager,
      phone: String(phone || "").trim(),
      address: address.trim(),
      area: area.trim(),
      postOffice: String(postOffice || "").trim(),
      city: String(city || "").trim(),
      district: String(district || "").trim(),
      state: String(state || "").trim(),
      country: String(country || "India").trim(),
      pincode: cleanPincode,
      serviceablePincodes: cleanServiceablePincodes,
      location: {
        type: "Point",
        coordinates,
      },
      serviceRadius: radius,
      status: "active",
    });

    const createdStore = await Store.findById(store._id)
      .populate("manager", "firstName lastName email phone")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Store created successfully",
      store: createdStore,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Store code already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return sendValidationError(res, error.message);
    }

    next(error);
  }
};

// ================= GET STORE MANAGERS =================
const getStoreManagers = async (req, res, next) => {
  try {
    const managerRole = await Role.findOne({
      name: "store_manager",
      status: "active",
    });

    if (!managerRole) {
      return res.status(404).json({
        success: false,
        message: "Store manager role not found",
      });
    }

    const managers = await User.find({
      role: managerRole._id,
      status: "active",
    }).select("firstName lastName email phone");

    return res.status(200).json({
      success: true,
      managers,
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET ALL STORES =================
const getAllStores = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const search = String(req.query.search || "").trim();

    const allowedSortFields = [
      "name",
      "code",
      "phone",
      "area",
      "city",
      "district",
      "state",
      "pincode",
      "serviceRadius",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortBy = allowedSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";

    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const filter = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      const matchingManagers = await User.find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { email: regex },
        ],
      }).distinct("_id");

      filter.$or = [
        { name: regex },
        { code: regex },
        { phone: regex },
        { address: regex },
        { area: regex },
        { postOffice: regex },
        { city: regex },
        { district: regex },
        { state: regex },
        { pincode: regex },
        { serviceablePincodes: regex },
        { manager: { $in: matchingManagers } },
      ];
    }

    const totalStores = await Store.countDocuments(filter);

    const stores = await Store.find(filter)
      .populate("manager", "firstName lastName email phone")
      .sort({ [sortBy]: sortOrder, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      stores,
      pagination: {
        totalStores,
        currentPage: page,
        totalPages: Math.ceil(totalStores / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET STORE BY ID =================
const getStoreById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendValidationError(res, "Invalid store ID");
    }

    const store = await Store.findById(id)
      .populate("manager", "firstName lastName email phone")
      .lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    next(error);
  }
};

// ================= UPDATE STORE =================
const updateStore = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendValidationError(res, "Invalid store ID");
    }

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    const {
      name,
      code,
      manager,
      phone,
      address,
      area,
      postOffice,
      city,
      district,
      state,
      country,
      pincode,
      serviceablePincodes,
      location,
      latitude,
      longitude,
      serviceRadius,
    } = req.body;

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100
      ) {
        return sendValidationError(res, "Enter a valid store name");
      }

      store.name = name.trim();
    }

    if (code !== undefined) {
      if (
        typeof code !== "string" ||
        !code.trim() ||
        code.trim().length > 30
      ) {
        return sendValidationError(res, "Enter a valid store code");
      }

      const normalizedCode = code.trim().toUpperCase();

      const duplicate = await Store.findOne({
        code: normalizedCode,
        _id: { $ne: store._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another store already uses this code",
        });
      }

      store.code = normalizedCode;
    }

    if (manager !== undefined) {
      if (!(await verifyStoreManager(manager))) {
        return sendValidationError(
          res,
          "Assigned user is not an active store manager"
        );
      }

      store.manager = manager;
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();

      if (cleanPhone && !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        return sendValidationError(res, "Enter a valid phone number");
      }

      store.phone = cleanPhone;
    }

    if (address !== undefined) {
      if (
        typeof address !== "string" ||
        !address.trim() ||
        address.trim().length > 500
      ) {
        return sendValidationError(res, "Enter a valid store address");
      }

      store.address = address.trim();
    }

    if (area !== undefined) {
      if (
        typeof area !== "string" ||
        !area.trim() ||
        area.trim().length > 100
      ) {
        return sendValidationError(res, "Enter a valid store area");
      }

      store.area = area.trim();
    }

    if (postOffice !== undefined) {
      store.postOffice = String(postOffice).trim();
    }

    if (city !== undefined) store.city = String(city).trim();
    if (district !== undefined) store.district = String(district).trim();
    if (state !== undefined) store.state = String(state).trim();
    if (country !== undefined) store.country = String(country).trim();

    if (pincode !== undefined) {
      const cleanPincode = String(pincode).trim();

      if (!isValidPincode(cleanPincode)) {
        return sendValidationError(
          res,
          "Enter a valid 6-digit Indian PIN code"
        );
      }

      store.pincode = cleanPincode;
    }

    if (serviceablePincodes !== undefined) {
      const cleanServiceablePincodes = getServiceablePincodes(
        serviceablePincodes,
        store.pincode
      );

      if (!cleanServiceablePincodes) {
        return sendValidationError(
          res,
          "All serviceable PIN codes must be valid 6-digit Indian PIN codes"
        );
      }

      store.serviceablePincodes = cleanServiceablePincodes;
    } else {
      const cleanServiceablePincodes = getServiceablePincodes(
        store.serviceablePincodes,
        store.pincode
      );

      if (!cleanServiceablePincodes) {
        return sendValidationError(res, "Invalid serviceable PIN codes");
      }

      store.serviceablePincodes = cleanServiceablePincodes;
    }

    if (
      location !== undefined ||
      latitude !== undefined ||
      longitude !== undefined
    ) {
      const coordinates = getCoordinates(
        location,
        latitude,
        longitude
      );

      if (!coordinates) {
        return sendValidationError(
          res,
          "Valid coordinates are required as [longitude, latitude]"
        );
      }

      store.location = {
        type: "Point",
        coordinates,
      };
    }

    if (serviceRadius !== undefined) {
      const radius = Number(serviceRadius);

      if (!isValidServiceRadius(radius)) {
        return sendValidationError(
          res,
          "Service radius must be a valid number of at least 0.1 km"
        );
      }

      store.serviceRadius = radius;
    }

    await store.save();

    const updatedStore = await Store.findById(store._id)
      .populate("manager", "firstName lastName email phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Store updated successfully",
      store: updatedStore,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Store code already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return sendValidationError(res, error.message);
    }

    next(error);
  }
};

// ================= UPDATE STORE STATUS =================
const updateStoreStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return sendValidationError(res, "Invalid store ID");
    }

    if (!["active", "inactive"].includes(status)) {
      return sendValidationError(
        res,
        "Status must be active or inactive"
      );
    }

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    store.status = status;
    await store.save();

    return res.status(200).json({
      success: true,
      message: `Store ${
        status === "active" ? "activated" : "deactivated"
      } successfully`,
      store,
    });
  } catch (error) {
    next(error);
  }
};

// ================= DELETE STORE =================
const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendValidationError(res, "Invalid store ID");
    }

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    const hasInventory = await StoreInventory.exists({
      store: store._id,
    });

    if (hasInventory) {
      return res.status(409).json({
        success: false,
        message:
          "This store has inventory records. Clear or transfer inventory before deleting.",
      });
    }

    await store.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Store deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStore,
  getAllStores,
  getStoreManagers,
  getStoreById,
  updateStore,
  updateStoreStatus,
  deleteStore,
  getNearbyStores,
};
