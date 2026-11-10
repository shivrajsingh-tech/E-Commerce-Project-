const mongoose = require("mongoose");
const ProductVariant = require("../model/productVarientSchema");
const Product = require("../model/productModel");
const StoreInventory = require("../model/storeInventarySchema");

// ==========================================
// GENERATE SKU
// ==========================================
const generateSKU = () => {
  return `SKU-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

// ==========================================
// ESCAPE SEARCH INPUT
// ==========================================
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ==========================================
// PARSE DIMENSIONS
// ==========================================
const parseDimensions = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error("Dimensions must contain valid JSON");
    }
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Dimensions must be a valid object");
  }

  const result = {};
  const fields = ["length", "width", "height"];

  for (const field of fields) {
    if (value[field] !== undefined && value[field] !== "") {
      const number = Number(value[field]);

      if (!Number.isFinite(number) || number < 0) {
        throw new Error(`${field} must be a valid non-negative number`);
      }

      result[field] = number;
    }
  }

  if (value.unit !== undefined) {
    if (!["cm", "inch"].includes(value.unit)) {
      throw new Error("Dimension unit must be cm or inch");
    }

    result.unit = value.unit;
  }

  return result;
};

// ==========================================
// VALIDATE VARIANT DATA
// ==========================================
const validateVariantData = (data) => {
  const allowedUnits = [
    "g",
    "kg",
    "ml",
    "l",
    "piece",
    "pack",
    "dozen",
  ];

  if (data.name !== undefined) {
    if (!String(data.name).trim()) {
      return "Variant name is required";
    }

    if (String(data.name).trim().length > 100) {
      return "Variant name cannot exceed 100 characters";
    }
  }

  if (data.unit !== undefined && !allowedUnits.includes(data.unit)) {
    return "Invalid unit";
  }

  const numericFields = [
    "unitValue",
    "mrp",
    "sellingPrice",
    "shippingWeight",
  ];

  for (const field of numericFields) {
    if (data[field] === undefined || data[field] === "") {
      continue;
    }

    const number = Number(data[field]);

    if (!Number.isFinite(number)) {
      return `${field} must be a valid number`;
    }
  }

  if (data.unitValue !== undefined && Number(data.unitValue) <= 0) {
    return "Unit value must be greater than zero";
  }

  if (data.mrp !== undefined && Number(data.mrp) <= 0) {
    return "MRP must be greater than zero";
  }

  if (data.sellingPrice !== undefined && Number(data.sellingPrice) < 0) {
    return "Selling price cannot be negative";
  }

  if (
    data.mrp !== undefined &&
    data.sellingPrice !== undefined &&
    Number(data.sellingPrice) > Number(data.mrp)
  ) {
    return "Selling price cannot be greater than MRP";
  }

  if (
    data.shippingWeight !== undefined &&
    data.shippingWeight !== "" &&
    Number(data.shippingWeight) < 0
  ) {
    return "Shipping weight cannot be negative";
  }

  if (
    data.status !== undefined &&
    !["active", "inactive"].includes(data.status)
  ) {
    return "Status must be active or inactive";
  }

  return null;
};

// ==========================================
// VALIDATE UPLOADED IMAGES
// ==========================================
const validateImages = (files) => {
  if (!files || files.length === 0) return null;

  if (files.length > 5) {
    return "Maximum 5 images are allowed";
  }

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return "Only JPG, JPEG, PNG and WEBP images are allowed";
    }

    if (file.size > 5 * 1024 * 1024) {
      return "Each image must be less than or equal to 5MB";
    }

    if (!file.path || !file.filename) {
      return "Image upload failed. Please try again";
    }
  }

  return null;
};

// ==========================================
// POPULATE PRODUCT
// ==========================================
const populateVariant = (query) => {
  return query.populate(
    "product",
    "name slug category subCategory brand images"
  );
};

// ==========================================
// 1. ADD INDEPENDENT PRODUCT VARIANT
// ==========================================
const addProductVariant = async (req, res, next) => {
  try {
    const {
      product,
      name,
      sku,
      unitValue,
      unit,
      mrp,
      sellingPrice,
      barcode,
      shippingWeight,
      dimensions,
      status = "active",
    } = req.body;

    if (!mongoose.isValidObjectId(product)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    const productExists = await Product.findOne({
      _id: product,
      isDeleted: false,
    });

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (sellingPrice === undefined || sellingPrice === "") {
      return res.status(400).json({
        success: false,
        message: "Selling price is required",
      });
    }

    const finalData = {
      name,
      unitValue:
        unitValue === "" || unitValue === undefined
          ? 1
          : Number(unitValue),
      unit: unit || "piece",
      mrp:
        mrp === "" || mrp === undefined
          ? Number(sellingPrice)
          : Number(mrp),
      sellingPrice: Number(sellingPrice),
      shippingWeight:
        shippingWeight === "" || shippingWeight === undefined
          ? 0
          : Number(shippingWeight),
      status,
    };

    const validationError = validateVariantData(finalData);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const imageError = validateImages(req.files);

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    let parsedDimensions;

    try {
      parsedDimensions = parseDimensions(dimensions);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const cleanBarcode = barcode ? String(barcode).trim() : "";

    if (cleanBarcode) {
      const duplicateBarcode = await ProductVariant.exists({
        barcode: cleanBarcode,
      });

      if (duplicateBarcode) {
        return res.status(409).json({
          success: false,
          message: "Barcode already exists",
        });
      }
    }

    const finalSku = (sku && String(sku).trim().toUpperCase()) || generateSKU();

    const duplicateSku = await ProductVariant.exists({ sku: finalSku });
    if (duplicateSku) {
      return res.status(409).json({
        success: false,
        message: `SKU '${finalSku}' already exists`,
      });
    }

    const images = (req.files || []).map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    const variant = await ProductVariant.create({
      product,
      name: String(
        name || `${finalData.unitValue} ${finalData.unit}`
      ).trim(),
      sku: finalSku,
      barcode: cleanBarcode || undefined,
      unitValue: finalData.unitValue,
      unit: finalData.unit,
      mrp: finalData.mrp,
      sellingPrice: finalData.sellingPrice,
      shippingWeight: finalData.shippingWeight,
      dimensions: parsedDimensions,
      images,
      status: finalData.status,
    });

    const populatedVariant = await populateVariant(
      ProductVariant.findById(variant._id)
    );

    return res.status(201).json({
      success: true,
      message: "Product variant created successfully",
      variant: populatedVariant,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate SKU, barcode or pack size for this product",
      });
    }

    next(error);
  }
};

// ==========================================
// 2. GET ALL PRODUCT VARIANTS
// ==========================================
const getProductVariants = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};
    const productId = req.query.productId || req.query.product;

    if (productId) {
      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      filter.product = productId;
    }

    if (req.query.status) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      if (search) {
        const regex = new RegExp(escapeRegex(search), "i");

        const matchingProducts = await Product.find({
          name: regex,
        }).select("_id");

        const searchConditions = [
          { name: regex },
          { sku: regex },
          { barcode: regex },
        ];

        if (matchingProducts.length > 0) {
          searchConditions.push({
            product: {
              $in: matchingProducts.map((item) => item._id),
            },
          });
        }

        filter.$or = searchConditions;
      }
    }

    const allowedSortFields = [
      "createdAt",
      "name",
      "sku",
      "sellingPrice",
      "mrp",
      "status",
    ];

    const sortBy = allowedSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";

    const order = req.query.order === "asc" ? 1 : -1;

    const totalVariants = await ProductVariant.countDocuments(filter);
    const totalPages = Math.ceil(totalVariants / limit);

    const variants = await populateVariant(ProductVariant.find(filter))
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      variants,
      pagination: {
        totalVariants,
        currentPage: page,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. GET SINGLE PRODUCT VARIANT
// ==========================================
const getProductVariant = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID",
      });
    }

    const variant = await populateVariant(
      ProductVariant.findById(req.params.id)
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    return res.status(200).json({
      success: true,
      variant,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. UPDATE PRODUCT VARIANT
// ==========================================
const updateProductVariant = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID",
      });
    }

    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    const updates = {};
    const allowedFields = [
      "name",
      "unitValue",
      "unit",
      "mrp",
      "sellingPrice",
      "barcode",
      "shippingWeight",
      "status",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    for (const field of [
      "unitValue",
      "mrp",
      "sellingPrice",
      "shippingWeight",
    ]) {
      if (updates[field] !== undefined) {
        if (updates[field] === "") {
          return res.status(400).json({
            success: false,
            message: `${field} cannot be empty`,
          });
        }
        updates[field] = Number(updates[field]);
      }
    }

    if (updates.name !== undefined) {
      updates.name = String(updates.name).trim();
    }

    if (updates.barcode !== undefined) {
      updates.barcode = String(updates.barcode).trim();

      if (updates.barcode) {
        const duplicateBarcode = await ProductVariant.exists({
          barcode: updates.barcode,
          _id: { $ne: variant._id },
        });

        if (duplicateBarcode) {
          return res.status(409).json({
            success: false,
            message: "Barcode already belongs to another variant",
          });
        }
      } else {
        updates.barcode = undefined;
      }
    }

    const finalData = {
      name: updates.name ?? variant.name,
      unit: updates.unit ?? variant.unit,
      unitValue: updates.unitValue ?? variant.unitValue,
      mrp: updates.mrp ?? variant.mrp,
      sellingPrice: updates.sellingPrice ?? variant.sellingPrice,
      shippingWeight:
        updates.shippingWeight ?? variant.shippingWeight,
      status: updates.status ?? variant.status,
    };

    const validationError = validateVariantData(finalData);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const imageError = validateImages(req.files);

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    if (req.body.dimensions !== undefined) {
      try {
        updates.dimensions = parseDimensions(req.body.dimensions);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    if (req.files && req.files.length > 0) {
      const existingImages = variant.images || [];
      const newImages = req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));

      if (existingImages.length + newImages.length > 5) {
        return res.status(400).json({
          success: false,
          message: "A variant cannot have more than 5 images in total",
        });
      }

      updates.images = [...existingImages, ...newImages];
    }

    Object.assign(variant, updates);
    await variant.save();

    const updatedVariant = await populateVariant(
      ProductVariant.findById(variant._id)
    );

    return res.status(200).json({
      success: true,
      message: "Product variant updated successfully",
      variant: updatedVariant,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate SKU, barcode or unit specification",
      });
    }

    next(error);
  }
};

// ==========================================
// 5. CHANGE PRODUCT VARIANT STATUS
// ==========================================
const changeProductVariantStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID",
      });
    }

    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    variant.status = status;
    await variant.save();

    return res.status(200).json({
      success: true,
      message: `Variant status changed to ${variant.status}`,
      variant,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. DELETE PRODUCT VARIANT
// ==========================================
const deleteProductVariant = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID",
      });
    }

    const variant = await ProductVariant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    const hasInventory = await StoreInventory.exists({
      variant: variant._id,
    });

    if (hasInventory) {
      return res.status(409).json({
        success: false,
        message:
          "This variant has store inventory records. Clear or transfer inventory before deleting it.",
      });
    }

    // Direct delete child variant (Parent Product document me array update karne ki koi zaroorat nahi)
    await ProductVariant.deleteOne({ _id: variant._id });

    return res.status(200).json({
      success: true,
      message: "Product variant deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


const getProductVariantsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { storeId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (storeId && !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "active",
      isDeleted: false,
    }).select("name slug images");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await ProductVariant.find({
      product: productId,
      status: "active",
    }).lean();

    if (!variants.length) {
      return res.status(200).json({
        success: true,
        product,
        variants: [],
      });
    }

    const variantIds = variants.map((variant) => variant._id);

    const inventoryFilter = {
      variant: { $in: variantIds },
      status: "active",
    };

    if (storeId) {
      inventoryFilter.store = storeId;
    }

    const inventories = await StoreInventory.find(
      inventoryFilter
    ).lean();

    const inventoryMap = new Map(
      inventories.map((inventory) => [
        String(inventory.variant),
        inventory,
      ])
    );

    const result = variants.map((variant) => {
      const inventory = inventoryMap.get(String(variant._id));

      const quantity = inventory?.quantity || 0;
      const reservedQuantity = inventory?.reservedQuantity || 0;
      const safetyStockPercentage =
        inventory?.safetyStockPercentage ?? 20;

      const safetyStockQuantity = Math.ceil(
        quantity * (safetyStockPercentage / 100)
      );

      const availableToSell = Math.max(
        0,
        quantity - reservedQuantity - safetyStockQuantity
      );

      const sellingPrice =
        inventory?.sellingPrice ?? variant.sellingPrice;

      const mrp = inventory?.mrp ?? variant.mrp;

      return {
        _id: variant._id,
        product: variant.product,
        name: variant.name,
        sku: variant.sku,
        unitValue: variant.unitValue,
        unit: variant.unit,
        mrp,
        sellingPrice,
        discountAmount: Number(
          (mrp - sellingPrice).toFixed(2)
        ),
        discountPercentage:
          mrp > 0
            ? Math.round(((mrp - sellingPrice) / mrp) * 100)
            : 0,
        images: variant.images || [],
        storeId: inventory?.store || null,
        inventoryId: inventory?._id || null,
        availableToSell,
        inStock: Boolean(inventory && availableToSell > 0),
      };
    });

    return res.status(200).json({
      success: true,
      product,
      variants: result,
    });
  } catch (error) {
    console.error("Get product variants error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product variants",
    });
  }
};



module.exports = {
  addProductVariant,
  getProductVariants,
  getProductVariant,
    getProductVariantsByProduct,
  updateProductVariant,
  changeProductVariantStatus,
  deleteProductVariant,
};