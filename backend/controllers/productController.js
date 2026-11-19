const crypto = require("crypto");
const mongoose = require("mongoose");
const streamifier = require("streamifier");

const Product = require("../model/productModel");
const ProductVariant = require("../model/productVarientSchema");
const Category = require("../model/CategorySchema");
const SubCategory = require("../model/SubCategorySchema");
const Brand = require("../model/brandSchema");
const StoreInventory = require("../model/storeInventarySchema");
const cloudinary = require("../config/CloudinaryConfig");

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const generateUniqueSlug = async (name) => {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const randomHash = crypto.randomBytes(3).toString("hex");
  return `${baseSlug || "product"}_${Date.now()}_${randomHash}`;
};

const generateUniqueSKU = () => {
  const time = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SKU-${time}-${rand}`;
};

const parseJSON = (value, defaultValue = []) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("Invalid JSON data received.");
  }
};

const validateReference = async (Model, id, fieldName) => {
  if (!id || !isValidId(id)) {
    throw new Error(`Valid ${fieldName} is required.`);
  }

  const document = await Model.findById(id);
  if (!document) {
    throw new Error(`${fieldName} not found.`);
  }

  if (document.isDeleted === true) {
    throw new Error(`${fieldName} is deleted.`);
  }

  return document;
};

const uploadImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return reject(
        new Error("Only JPG, JPEG, PNG and WEBP images are allowed.")
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return reject(new Error("Each image must be smaller than 5 MB."));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "elibcart/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

const uploadImages = async (files = []) => {
  if (!Array.isArray(files)) {
    throw new Error("Invalid product images.");
  }

  if (files.length > MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} product images are allowed.`);
  }

  // Upload all images in parallel — much faster than sequential for-loop
  let uploadedImages = [];
  try {
    uploadedImages = await Promise.all(files.map((file) => uploadImage(file)));
    return uploadedImages;
  } catch (error) {
    // Clean up any that did succeed before the failure
    await Promise.allSettled(
      uploadedImages.map((image) =>
        image?.publicId ? cloudinary.uploader.destroy(image.publicId) : Promise.resolve()
      )
    );
    throw error;
  }
};

const deleteCloudinaryImages = async (images = []) => {
  const publicIds = images.map((image) => image.publicId).filter(Boolean);
  if (!publicIds.length) return;

  await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
  );
};

const validateProductData = async (data) => {
  const { name, category, subCategory, brand } = data;

  if (!name || !name.trim()) {
    throw new Error("Product name is required.");
  }

  if (name.trim().length > 200) {
    throw new Error("Product name cannot exceed 200 characters.");
  }

  // Run all three reference checks in parallel
  const [categoryDoc, subCategoryDoc] = await Promise.all([
    validateReference(Category, category, "Category"),
    validateReference(SubCategory, subCategory, "Subcategory"),
    validateReference(Brand, brand, "Brand"),
  ]);

  const subCategoryCategoryId =
    subCategoryDoc.category?._id || subCategoryDoc.category;

  if (
    subCategoryCategoryId &&
    subCategoryCategoryId.toString() !== categoryDoc._id.toString()
  ) {
    throw new Error(
      "Selected subcategory does not belong to the selected category."
    );
  }
};

const validateVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error("At least one variant is required.");
  }

  const allowedUnits = ["g", "kg", "ml", "l", "piece", "pack", "dozen"];

  for (const [index, variant] of variants.entries()) {
    const row = index + 1;
    if (!variant.name || !variant.name.trim()) {
      throw new Error(`Variant ${row}: name is required.`);
    }

    if (
      variant.unitValue === undefined ||
      variant.unitValue === "" ||
      !Number.isFinite(Number(variant.unitValue)) ||
      Number(variant.unitValue) <= 0
    ) {
      throw new Error(`Variant ${row}: valid unit value (> 0) is required.`);
    }

    if (variant.unit && !allowedUnits.includes(variant.unit)) {
      throw new Error(`Variant ${row}: invalid unit.`);
    }

    if (
      variant.mrp === undefined ||
      variant.mrp === "" ||
      !Number.isFinite(Number(variant.mrp)) ||
      Number(variant.mrp) <= 0
    ) {
      throw new Error(`Variant ${row}: valid MRP (> 0) is required.`);
    }

    if (
      variant.sellingPrice === undefined ||
      variant.sellingPrice === "" ||
      !Number.isFinite(Number(variant.sellingPrice)) ||
      Number(variant.sellingPrice) < 0
    ) {
      throw new Error(`Variant ${row}: valid selling price is required.`);
    }

    if (Number(variant.sellingPrice) > Number(variant.mrp)) {
      throw new Error(`Variant ${row}: selling price cannot exceed MRP.`);
    }
  }
};

// ----------------------------------------------------
// 1. ADD PRODUCT
// ----------------------------------------------------
const addProduct = async (req, res) => {
  let uploadedImages = [];
  let createdProduct = null;
  let createdVariants = [];

  try {
    const { name, category, subCategory, brand, description = "", status = "active" } = req.body;

    await validateProductData({ name, category, subCategory, brand });

    const specifications = parseJSON(req.body.specifications, []);
    const variants = parseJSON(req.body.variants, []);

    if (!Array.isArray(specifications)) {
      return sendError(res, 400, "Specifications must be an array.");
    }

    for (const item of specifications) {
      if (!item.key?.trim() || !String(item.value ?? "").trim()) {
        return sendError(res, 400, "Each specification must have a key and value.");
      }
    }

    validateVariants(variants);

    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, "At least one product image is required.");
    }

    const safeSlug = await generateUniqueSlug(name);
    uploadedImages = await uploadImages(req.files || []);

    createdProduct = await Product.create({
      name: name.trim(),
      slug: safeSlug,
      category,
      subCategory,
      brand,
      description: String(description).trim(),
      images: uploadedImages,
      specifications: specifications.map((item) => ({
        key: item.key.trim(),
        value: String(item.value).trim(),
      })),
      status: ["active", "inactive"].includes(status) ? status : "active",
    });

    const variantDocuments = variants.map((variant) => ({
      product: createdProduct._id,
      name: variant.name.trim(),
      sku: generateUniqueSKU(),
      unitValue: Number(variant.unitValue),
      unit: variant.unit || "piece",
      mrp: Number(variant.mrp),
      sellingPrice: Number(variant.sellingPrice),
      status: variant.status || "active",
    }));

    createdVariants = await ProductVariant.insertMany(variantDocuments, {
      ordered: true,
    });

    const product = await Product.findById(createdProduct._id)
      .populate("category")
      .populate("subCategory")
      .populate("brand")
      .populate("variants")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    if (createdVariants.length > 0) {
      await ProductVariant.deleteMany({
        _id: { $in: createdVariants.map((item) => item._id) },
      }).catch(() => {});
    }

    if (createdProduct?._id) {
      await Product.findByIdAndDelete(createdProduct._id).catch(() => {});
    }

    if (uploadedImages.length > 0) {
      await deleteCloudinaryImages(uploadedImages);
    }

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || "field";
      const duplicateValue = error.keyValue ? error.keyValue[duplicateField] : "";

      return sendError(
        res,
        409,
        `Duplicate field error on '${duplicateField}' with value '${duplicateValue}'.`
      );
    }

    if (error.name === "ValidationError" || error.message) {
      return sendError(res, 400, error.message);
    }

    console.error("Add product error:", error);
    return sendError(res, 500, "Failed to create product.");
  }
};

// ----------------------------------------------------
// 2. GET ALL PRODUCTS (STRICT STORE INVENTORY INTEGRATION)
// ----------------------------------------------------
const getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    const rawStoreId = req.query.store || req.query.storeId;

    if (req.query.status) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return sendError(res, 400, "Invalid product status.");
      }
      filter.status = req.query.status;
    } else {
      filter.status = "active";
    }

    if (req.query.category && req.query.category !== "all") {
      if (!isValidId(req.query.category)) return sendError(res, 400, "Invalid category ID.");
      filter.category = req.query.category;
    }

    if (req.query.subCategory && req.query.subCategory !== "all") {
      if (!isValidId(req.query.subCategory)) return sendError(res, 400, "Invalid subcategory ID.");
      filter.subCategory = req.query.subCategory;
    }

    if (req.query.brand && req.query.brand !== "all") {
      if (!isValidId(req.query.brand)) return sendError(res, 400, "Invalid brand ID.");
      filter.brand = req.query.brand;
    }

    if (req.query.search) {
      filter.name = {
        $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const storeInventoryMap = new Map();

    if (rawStoreId && isValidId(rawStoreId)) {
      const storeObjId = new mongoose.Types.ObjectId(rawStoreId);

      const storeInventories = await StoreInventory.find({
        $or: [{ store: storeObjId }, { store: String(rawStoreId) }],
        status: { $ne: "inactive" },
        quantity: { $gt: 0 },
      }).lean();

      if (!storeInventories || storeInventories.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No products available in this store.",
          products: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }

      const validProductIds = new Set();

      for (const inv of storeInventories) {
        const prodId = inv.product ? String(inv.product._id || inv.product) : "";
        if (!prodId) continue;

        const realStock = Math.max(0, Number(inv.quantity || 0) - Number(inv.reservedQuantity || 0));
        if (realStock <= 0) continue;

        validProductIds.add(prodId);
        const varId = inv.variant ? String(inv.variant._id || inv.variant) : "base";

        storeInventoryMap.set(`${prodId}_${varId}`, {
          sellingPrice: inv.sellingPrice,
          mrp: inv.mrp,
          availableQuantity: realStock,
          rawQuantity: Number(inv.quantity || 0),
        });
      }

      if (validProductIds.size === 0) {
        return res.status(200).json({
          success: true,
          message: "All items in this store are out of stock.",
          products: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }

      filter._id = { $in: Array.from(validProductIds).map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category")
        .populate("subCategory")
        .populate("brand")
        .populate("variants")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    const result = products.map((product) => {
      if (rawStoreId) {
        const prodIdStr = product._id.toString();
        const baseInv = storeInventoryMap.get(`${prodIdStr}_base`);

        const updatedVariants = (product.variants || []).map((v) => {
          const varIdStr = v._id.toString();
          const invData = storeInventoryMap.get(`${prodIdStr}_${varIdStr}`) || baseInv;

          const finalStock = Number(invData?.availableQuantity || 0);
          return {
            ...v,
            sellingPrice: invData?.sellingPrice != null ? invData.sellingPrice : v.sellingPrice,
            mrp: invData?.mrp != null ? invData.mrp : v.mrp,
            availableQuantity: finalStock,
            stockStatus: finalStock > 0 ? "in_stock" : "out_of_stock",
          };
        });

        const firstVar = updatedVariants.length > 0 ? updatedVariants[0] : null;
        const mainAvailableStock = firstVar
          ? firstVar.availableQuantity
          : Number(baseInv?.availableQuantity || 0);

        return {
          ...product,
          variants: updatedVariants,
          sellingPrice: firstVar ? firstVar.sellingPrice : (baseInv?.sellingPrice ?? product.sellingPrice),
          mrp: firstVar ? firstVar.mrp : (baseInv?.mrp ?? product.mrp),
          availableQuantity: mainAvailableStock,
          inventory: {
            availableQuantity: mainAvailableStock,
          },
        };
      }

      return product;
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully.",
      products: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return sendError(res, 500, "Failed to fetch products.");
  }
};

// ----------------------------------------------------
// 3. GET PRODUCT BY SLUG (STORE AWARE FOR PDP)
// ----------------------------------------------------
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const rawStoreId = req.query.store || req.query.storeId;

    if (!slug) return sendError(res, 400, "Product slug is required.");

    const product = await Product.findOne({ slug: slug.trim(), isDeleted: false })
      .populate("category")
      .populate("subCategory")
      .populate("brand")
      .populate("variants")
      .lean({ virtuals: true });

    if (!product) return sendError(res, 404, "Product not found.");

    let totalStoreStock = 0;
    const invMap = new Map();

    const invFilter = {
      product: product._id,
      status: { $ne: "inactive" },
    };

    if (rawStoreId && isValidId(rawStoreId)) {
      const storeObjId = new mongoose.Types.ObjectId(rawStoreId);
      invFilter.$or = [{ store: storeObjId }, { store: String(rawStoreId) }];
    }

    const storeInventories = await StoreInventory.find(invFilter).lean();

    storeInventories.forEach((inv) => {
      const rawQty = Number(inv.quantity || 0);
      const reserved = Number(inv.reservedQuantity || 0);
      const realStock = Math.max(0, rawQty - reserved);

      totalStoreStock += realStock;

      if (inv.variant) {
        invMap.set(String(inv.variant), {
          sellingPrice: inv.sellingPrice,
          mrp: inv.mrp,
          availableQuantity: realStock,
        });
      }

      invMap.set("base", {
        sellingPrice: inv.sellingPrice,
        mrp: inv.mrp,
        availableQuantity: realStock,
      });
    });

    const baseInv = invMap.get("base");

    product.variants = (product.variants || []).map((v) => {
      const varIdStr = String(v._id);
      const inv = invMap.get(varIdStr) || baseInv;

      const finalStock = inv ? Number(inv.availableQuantity || 0) : totalStoreStock;

      return {
        ...v,
        sellingPrice: inv?.sellingPrice != null ? inv.sellingPrice : v.sellingPrice,
        mrp: inv?.mrp != null ? inv.mrp : v.mrp,
        availableQuantity: finalStock,
        stockStatus: finalStock > 0 ? "in_stock" : "out_of_stock",
      };
    });

    const firstVar = product.variants.length > 0 ? product.variants[0] : null;
    const mainAvailable = firstVar
      ? firstVar.availableQuantity
      : (baseInv ? Number(baseInv.availableQuantity || 0) : totalStoreStock);

    product.availableQuantity = mainAvailable;
    product.inventory = {
      availableQuantity: mainAvailable,
    };

    return res.status(200).json({
      success: true,
      message: "Product details fetched successfully.",
      product,
    });
  } catch (error) {
    console.error("Get product by slug error:", error);
    return sendError(res, 500, "Failed to fetch product details.");
  }
};

// ----------------------------------------------------
// 4. GET SINGLE PRODUCT BY ID
// ----------------------------------------------------
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.query.store || req.query.storeId;

    if (!isValidId(id)) return sendError(res, 400, "Invalid product ID.");

    const product = await Product.findOne({ _id: id, isDeleted: false })
      .populate("category")
      .populate("subCategory")
      .populate("brand")
      .populate("variants")
      .lean({ virtuals: true });

    if (!product) return sendError(res, 404, "Product not found.");

    let totalStoreAvailable = 0;
    const invMap = new Map();

    if (storeId && isValidId(storeId)) {
      const storeObjId = new mongoose.Types.ObjectId(storeId);
      const storeInventories = await StoreInventory.find({
        $or: [{ store: storeObjId }, { store: String(storeId) }],
        product: product._id,
        status: { $ne: "inactive" },
      }).lean();

      storeInventories.forEach((inv) => {
        const varId = inv.variant ? String(inv.variant) : "base";
        const realStock = Math.max(0, Number(inv.quantity || 0) - Number(inv.reservedQuantity || 0));
        totalStoreAvailable += realStock;

        invMap.set(varId, {
          sellingPrice: inv.sellingPrice,
          mrp: inv.mrp,
          availableQuantity: realStock,
        });
      });
    }

    const baseInv = invMap.get("base");

    product.variants = (product.variants || []).map((v) => {
      const inv = invMap.get(v._id.toString()) || baseInv;
      const stock = Number(inv?.availableQuantity || 0);
      return {
        ...v,
        sellingPrice: inv?.sellingPrice != null ? inv.sellingPrice : v.sellingPrice,
        mrp: inv?.mrp != null ? inv.mrp : v.mrp,
        availableQuantity: stock,
        stockStatus: stock > 0 ? "in_stock" : "out_of_stock",
      };
    });

    const firstVar = product.variants.length > 0 ? product.variants[0] : null;
    product.availableQuantity = firstVar ? firstVar.availableQuantity : totalStoreAvailable;
    product.inventory = {
      availableQuantity: product.availableQuantity,
    };

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return sendError(res, 500, "Failed to fetch product.");
  }
};

// ----------------------------------------------------
// 5. UPDATE PRODUCT
// ----------------------------------------------------
const updateProduct = async (req, res) => {
  let newlyUploadedImages = [];

  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid product ID.");

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return sendError(res, 404, "Product not found.");

    const { name, category, subCategory, brand, description, status } = req.body;

    const updatedName = name !== undefined ? name : product.name;
    const updatedCategory = category !== undefined ? category : product.category;
    const updatedSubCategory = subCategory !== undefined ? subCategory : product.subCategory;
    const updatedBrand = brand !== undefined ? brand : product.brand;

    await validateProductData({
      name: updatedName,
      category: updatedCategory,
      subCategory: updatedSubCategory,
      brand: updatedBrand,
    });

    const specifications =
      req.body.specifications !== undefined
        ? parseJSON(req.body.specifications, [])
        : product.specifications;

    const variants =
      req.body.variants !== undefined
        ? parseJSON(req.body.variants, null)
        : null;

    if (variants !== null) {
      validateVariants(variants);
    }

    const existingImages = parseJSON(req.body.existingImages, product.images);
    const newFiles = req.files || [];

    if (existingImages.length + newFiles.length > MAX_IMAGES) {
      return sendError(res, 400, `Maximum ${MAX_IMAGES} product images are allowed.`);
    }

    if (existingImages.length + newFiles.length === 0) {
      return sendError(res, 400, "At least one product image is required.");
    }

    newlyUploadedImages = await uploadImages(newFiles);

    product.name = updatedName.trim();
    product.category = updatedCategory;
    product.subCategory = updatedSubCategory;
    product.brand = updatedBrand;

    if (description !== undefined) {
      product.description = String(description).trim();
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return sendError(res, 400, "Invalid product status.");
      }
      product.status = status;
    }

    product.specifications = specifications.map((item) => ({
      key: item.key.trim(),
      value: String(item.value).trim(),
    }));

    product.images = [...existingImages, ...newlyUploadedImages];
    await product.save();

    if (variants !== null) {
      for (const variant of variants) {
        if (variant._id && isValidId(variant._id)) {
          const variantData = {
            name: variant.name.trim(),
            unitValue: Number(variant.unitValue),
            unit: variant.unit || "piece",
            mrp: Number(variant.mrp),
            sellingPrice: Number(variant.sellingPrice),
            status: variant.status || "active",
          };
          await ProductVariant.findByIdAndUpdate(variant._id, variantData);
        } else {
          const newVariantData = {
            name: variant.name.trim(),
            sku: generateUniqueSKU(),
            unitValue: Number(variant.unitValue),
            unit: variant.unit || "piece",
            mrp: Number(variant.mrp),
            sellingPrice: Number(variant.sellingPrice),
            status: variant.status || "active",
            product: product._id,
          };
          await ProductVariant.create(newVariantData);
        }
      }
    }

    const updatedProduct = await Product.findById(product._id)
      .populate("category")
      .populate("subCategory")
      .populate("brand")
      .populate("variants")
      .lean({ virtuals: true });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    await deleteCloudinaryImages(newlyUploadedImages);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || "field";
      return sendError(res, 409, `Duplicate entry for '${duplicateField}'.`);
    }

    if (error.name === "ValidationError" || error.message) {
      return sendError(res, 400, error.message);
    }

    console.error("Update product error:", error);
    return sendError(res, 500, "Failed to update product.");
  }
};

// ----------------------------------------------------
// 6. CHANGE PRODUCT STATUS
// ----------------------------------------------------
const changeProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) return sendError(res, 400, "Invalid product ID.");

    if (!["active", "inactive"].includes(status)) {
      return sendError(res, 400, "Status must be active or inactive.");
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { status },
      { new: true, runValidators: true }
    );

    if (!product) return sendError(res, 404, "Product not found.");

    await ProductVariant.updateMany({ product: id }, { status });

    return res.status(200).json({
      success: true,
      message: "Product status updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Change product status error:", error);
    return sendError(res, 500, "Failed to update product status.");
  }
};

// ----------------------------------------------------
// 7. DELETE PRODUCT (SOFT DELETE)
// ----------------------------------------------------
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid product ID.");

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return sendError(res, 404, "Product not found.");

    const variants = await ProductVariant.find({ product: product._id }).select("_id");
    const variantIds = variants.map((variant) => variant._id);

    const inventoryExists = await StoreInventory.exists({
      $or: [{ product: product._id }, { variant: { $in: variantIds } }],
    });

    if (inventoryExists) {
      return sendError(
        res,
        409,
        "This product has store inventory. Remove its inventory first."
      );
    }

    product.isDeleted = true;
    product.status = "inactive";
    await product.save();

    await ProductVariant.updateMany(
      { product: product._id },
      { status: "inactive" }
    );

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return sendError(res, 500, "Failed to delete product.");
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProduct,
  getProductBySlug,
  updateProduct,
  changeProductStatus,
  deleteProduct,
};