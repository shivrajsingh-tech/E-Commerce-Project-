
const mongoose = require("mongoose");

const StoreInventory = require("../model/storeInventarySchema");
const Store = require("../model/storeSchema");
const Product = require("../model/productModel");
const ProductVariant = require("../model/productVarientSchema");

// ==========================================
// HELPER: GET STORE ID
// ==========================================
const resolveStoreId = async (req) => {
  const roleName = String(
    req.user?.role?.name ||
    req.user?.role ||
    req.userRole?.name ||
    ""
  ).toLowerCase();

  if (roleName === "store_manager") {
    if (
      req.user?.storeId &&
      mongoose.isValidObjectId(req.user.storeId)
    ) {
      return req.user.storeId;
    }

    const userId = req.user?._id || req.user?.id;

    if (!userId) return null;

    const managedStore = await Store.findOne({
      manager: userId,
    });

    return managedStore?._id || null;
  }

  const target = req.body?.store || req.query?.store;

  return mongoose.isValidObjectId(target) ? target : null;
};

// ==========================================
// HELPER: GET ROLE NAME
// ==========================================
const getRoleName = (req) =>
  String(
    req.user?.role?.name ||
    req.user?.role ||
    req.userRole?.name ||
    ""
  ).toLowerCase();

// ==========================================
// HELPER: CHECK VALID NUMBER
// ==========================================
const isValidStockNumber = (value) =>
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

// ==========================================
// HELPER: POPULATE INVENTORY
// ==========================================
const populateInventory = (query) =>
  query
    .populate("store", "name code address area city pincode")
    .populate("product", "name sku images")
    .populate(
      "variant",
      "name sku barcode mrp sellingPrice unitValue unit stock status images"
    );

// ==========================================
// 1. ADD INVENTORY
// ==========================================
const addInventory = async (req, res, next) => {
  try {
    const roleName = getRoleName(req);

    let targetStore = req.body.store;

    // Store manager can only add stock to their own store
    if (roleName === "store_manager") {
      targetStore = await resolveStoreId(req);

      if (!targetStore) {
        return res.status(403).json({
          success: false,
          message: "No store assigned to this store manager",
        });
      }
    }

    const {
      product,
      variant,
      quantity = 0,
      reorderLevel = 0,
      maxStockLevel = 0,
      status = "active",
      mrp = null,
      sellingPrice = null,
    } = req.body;

    if (
      !mongoose.isValidObjectId(targetStore) ||
      !mongoose.isValidObjectId(product) ||
      !mongoose.isValidObjectId(variant)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid store, product, and variant IDs are required",
      });
    }

    if (
      !isValidStockNumber(quantity) ||
      !isValidStockNumber(reorderLevel) ||
      !isValidStockNumber(maxStockLevel)
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock values cannot be negative or invalid",
      });
    }

    const totalQuantity = Number(quantity);
    // Auto-calculate 20% safety stock reserve — override any manually sent reservedQuantity
    const reserved = Math.ceil(totalQuantity * 0.20);

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory status",
      });
    }

    // Validate store, product and variant
    const [storeExists, productExists, variantExists] =
      await Promise.all([
        Store.findById(targetStore),
        Product.findById(product),
        ProductVariant.findById(variant),
      ]);

    if (!storeExists) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    if (storeExists.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot add inventory to an inactive store",
      });
    }

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!variantExists) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    // Variant must belong to the selected product
    if (String(variantExists.product) !== String(product)) {
      return res.status(400).json({
        success: false,
        message: "This variant does not belong to the selected product",
      });
    }

    if (variantExists.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot add inactive product variant to inventory",
      });
    }

    // Prevent duplicate inventory for same store + product + variant
    const existingInventory = await StoreInventory.findOne({
      store: targetStore,
      product,
      variant,
    });

    if (existingInventory) {
      return res.status(409).json({
        success: false,
        message:
          "Inventory already exists for this product variant in this store. Update the existing inventory instead.",
      });
    }

    const inventory = await StoreInventory.create({
      store: targetStore,
      product,
      variant,
      quantity: totalQuantity,
      reservedQuantity: reserved,
      reorderLevel: Number(reorderLevel),
      maxStockLevel: Number(maxStockLevel),
      status,
      mrp: mrp !== null ? Number(mrp) : null,
      sellingPrice: sellingPrice !== null ? Number(sellingPrice) : null,
      lastRestockedAt: totalQuantity > 0 ? new Date() : null,
    });

    const populated = await populateInventory(
      StoreInventory.findById(inventory._id)
    );

    return res.status(201).json({
      success: true,
      message: "Inventory added successfully",
      inventory: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Inventory already exists for this store and variant",
      });
    }

    next(error);
  }
};

// ==========================================
// 2. GET ALL INVENTORIES
// ==========================================
const getInventories = async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const roleName = getRoleName(req);

    const allowedSortFields = [
      "quantity",
      "reservedQuantity",
      "availableQuantity",
      "reorderLevel",
      "maxStockLevel",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortBy = allowedSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";

    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {};

    // Restrict store managers to their own store
    if (roleName === "store_manager") {
      const storeId = await resolveStoreId(req);

      if (!storeId) {
        return res.status(403).json({
          success: false,
          message: "No store assigned to this store manager",
        });
      }

      filter.store = storeId;
    } else if (req.query.store) {
      if (!mongoose.isValidObjectId(req.query.store)) {
        return res.status(400).json({
          success: false,
          message: "Invalid store ID",
        });
      }

      filter.store = req.query.store;
    }

    if (req.query.status) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid inventory status",
        });
      }

      filter.status = req.query.status;
    }

    // Search products, variants and stores
    if (search) {
      const escaped = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escaped, "i");

      const [matchingProducts, matchingVariants] =
        await Promise.all([
          Product.find({
            $or: [
              { name: regex },
              { sku: regex },
            ],
          }).distinct("_id"),

          ProductVariant.find({
            $or: [
              { name: regex },
              { sku: regex },
              { barcode: regex },
            ],
          }).distinct("_id"),
        ]);

      const searchConditions = [
        { product: { $in: matchingProducts } },
        { variant: { $in: matchingVariants } },
      ];

      if (roleName !== "store_manager") {
        const matchingStores = await Store.find({
          $or: [
            { name: regex },
            { code: regex },
            { pincode: regex },
            { city: regex },
          ],
        }).distinct("_id");

        searchConditions.push({
          store: { $in: matchingStores },
        });
      }

      filter.$and = [
        {
          $or: searchConditions,
        },
      ];
    }

    const totalInventories =
      await StoreInventory.countDocuments(filter);

    const inventories = await populateInventory(
      StoreInventory.find(filter)
    )
      .sort({
        [sortBy]: sortOrder,
        _id: 1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      inventories,
      pagination: {
        totalInventories,
        currentPage: page,
        totalPages: Math.ceil(totalInventories / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. GET SINGLE INVENTORY
// ==========================================
const getInventory = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
    }

    const inventory = await populateInventory(
      StoreInventory.findById(req.params.id)
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    if (getRoleName(req) === "store_manager") {
      const storeId = await resolveStoreId(req);

      if (
        !storeId ||
        String(inventory.store?._id) !== String(storeId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot access another store's inventory",
        });
      }
    }

    return res.status(200).json({
      success: true,
      inventory,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. UPDATE INVENTORY
// ==========================================
const updateInventory = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
    }

    const inventory = await StoreInventory.findById(
      req.params.id
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    if (getRoleName(req) === "store_manager") {
      const storeId = await resolveStoreId(req);

      if (
        !storeId ||
        String(inventory.store) !== String(storeId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot update another store's inventory",
        });
      }
    }

    const {
      quantity,
      reservedQuantity,
      reorderLevel,
      maxStockLevel,
      status,
    } = req.body;

    const newQuantity =
      quantity === undefined
        ? inventory.quantity
        : Number(quantity);

    // If quantity changed, recalculate 20% reserve automatically
    // If reservedQuantity was explicitly sent in the request, use it (allows manual override)
    const newReserved =
      reservedQuantity !== undefined
        ? Number(reservedQuantity)
        : quantity !== undefined
        ? Math.ceil(newQuantity * 0.20)
        : inventory.reservedQuantity;

    const newReorderLevel =
      reorderLevel === undefined
        ? inventory.reorderLevel
        : Number(reorderLevel);

    const newMaxStockLevel =
      maxStockLevel === undefined
        ? inventory.maxStockLevel
        : Number(maxStockLevel);

    if (
      !isValidStockNumber(newQuantity) ||
      !isValidStockNumber(newReserved) ||
      !isValidStockNumber(newReorderLevel) ||
      !isValidStockNumber(newMaxStockLevel)
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock values cannot be negative or invalid",
      });
    }

    if (newReserved > newQuantity) {
      return res.status(400).json({
        success: false,
        message: "Reserved quantity cannot exceed total quantity",
      });
    }

    if (
      status !== undefined &&
      !["active", "inactive"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory status",
      });
    }

    const stockChanged =
      quantity !== undefined &&
      newQuantity > inventory.quantity;

    inventory.quantity = newQuantity;
    inventory.reservedQuantity = newReserved;
    inventory.reorderLevel = newReorderLevel;
    inventory.maxStockLevel = newMaxStockLevel;

    if (status !== undefined) {
      inventory.status = status;
    }

    if (stockChanged) {
      inventory.lastRestockedAt = new Date();
    }

    await inventory.save();

    const updatedInventory = await populateInventory(
      StoreInventory.findById(inventory._id)
    );

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      inventory: updatedInventory,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. CHANGE INVENTORY STATUS
// ==========================================
const changeInventoryStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
    }

    const inventory = await StoreInventory.findById(
      req.params.id
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    if (getRoleName(req) === "store_manager") {
      const storeId = await resolveStoreId(req);

      if (
        !storeId ||
        String(inventory.store) !== String(storeId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot change another store's inventory status",
        });
      }
    }

    inventory.status =
      inventory.status === "active"
        ? "inactive"
        : "active";

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: `Inventory status changed to ${inventory.status}`,
      inventory,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. DELETE INVENTORY
// ==========================================
const deleteInventory = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
    }

    const inventory = await StoreInventory.findById(
      req.params.id
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    if (getRoleName(req) === "store_manager") {
      const storeId = await resolveStoreId(req);

      if (
        !storeId ||
        String(inventory.store) !== String(storeId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot delete another store's inventory",
        });
      }
    }

    if (inventory.reservedQuantity > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete inventory while stock is reserved for orders",
      });
    }

    await inventory.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Inventory deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addInventory,
  getInventories,
  getInventory,
  updateInventory,
  changeInventoryStatus,
  deleteInventory,
};
