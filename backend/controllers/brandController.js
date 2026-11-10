
const mongoose = require("mongoose");
const Brand = require("../model/brandSchema");
const Product = require("../model/productModel");
const cloudinary = require("../config/CloudinaryConfig");
const streamifier = require("streamifier");

// Generate slug from brand name
const generateSlug = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

// Upload image to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "brands" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId);
};

// Validate MongoDB ID
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Check duplicate name or slug
const findDuplicateBrand = async (name, slug, excludeId = null) => {
  const query = {
    $or: [
      { name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      { slug },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Brand.findOne(query);
};

// Add Brand
const addBrand = async (req, res, next) => {
  let uploadedPublicId = "";

  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const cleanName = name.trim();
    const slug = generateSlug(cleanName);

    const existingBrand = await findDuplicateBrand(cleanName, slug);

    if (existingBrand) {
      return res.status(409).json({
        success: false,
        message: "Brand name or slug already exists",
      });
    }

    let logo = { url: "", publicId: "" };

    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      uploadedPublicId = result.public_id;

      logo = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const brand = await Brand.create({
      name: cleanName,
      slug,
      description: description?.trim() || "",
      logo,
    });

    return res.status(201).json({
      success: true,
      message: "Brand added successfully",
      brand,
    });
  } catch (error) {
    // Remove newly uploaded image if saving the brand failed
    if (uploadedPublicId) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError.message);
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Brand name or slug already exists",
      });
    }

    next(error);
  }
};

// Get All Brands: Search, Filter, Sort, Pagination
const getBrands = async (req, res, next) => {
  try {
    const {
      search = "",
      status = "",
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      query.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { slug: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (status) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 10)
    );

    const skip = (pageNum - 1) * limitNum;

    const allowedSortFields = [
      "name",
      "slug",
      "status",
      "createdAt",
    ];

    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const sortDirection = order === "asc" ? 1 : -1;

    const [brands, totalBrands] = await Promise.all([
      Brand.find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Brand.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalBrands / limitNum);

    return res.status(200).json({
      success: true,
      brands,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalBrands,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Brand
const getBrand = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      brand,
    });
  } catch (error) {
    next(error);
  }
};

// Update Brand
const updateBrand = async (req, res, next) => {
  let uploadedPublicId = "";

  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Brand name cannot be empty",
        });
      }

      const cleanName = name.trim();
      const slug = generateSlug(cleanName);

      const existingBrand = await findDuplicateBrand(
        cleanName,
        slug,
        brand._id
      );

      if (existingBrand) {
        return res.status(409).json({
          success: false,
          message: "Brand name or slug already exists",
        });
      }

      brand.name = cleanName;
      brand.slug = slug;
    }

    if (description !== undefined) {
      brand.description = description.trim();
    }

    // Upload the new logo first, then save the brand
    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      uploadedPublicId = result.public_id;

      const oldPublicId = brand.logo?.publicId;

      brand.logo = {
        url: result.secure_url,
        publicId: result.public_id,
      };

      try {
        await brand.save();
      } catch (saveError) {
        try {
          await deleteFromCloudinary(uploadedPublicId);
        } catch (cleanupError) {
          console.error("Cloudinary cleanup failed:", cleanupError.message);
        }

        throw saveError;
      }

      // Delete old logo only after the new logo is saved
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (imageError) {
          console.error("Old logo deletion failed:", imageError.message);
        }
      }
    } else {
      await brand.save();
    }

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Brand name or slug already exists",
      });
    }

    next(error);
  }
};

// Change Brand Status
const changeBrandStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    let newStatus = status;

    if (newStatus === undefined) {
      newStatus = brand.status === "active" ? "inactive" : "active";
    }

    if (!["active", "inactive"].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    brand.status = newStatus;
    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Brand status updated successfully",
      brand,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Brand
const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Prevent deletion if products use this brand
    const linkedProduct = await Product.findOne({ brand: brand._id })
      .select("_id")
      .lean();

    if (linkedProduct) {
      return res.status(409).json({
        success: false,
        message: "This brand is linked to products. Remove or reassign those products first.",
      });
    }

    // Delete the database record first
    await Brand.findByIdAndDelete(id);

    // Then attempt to delete the logo
    if (brand.logo?.publicId) {
      try {
        await deleteFromCloudinary(brand.logo.publicId);
      } catch (imageError) {
        console.error("Cloudinary logo deletion failed:", imageError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBrand,
  getBrands,
  getBrand,
  updateBrand,
  changeBrandStatus,
  deleteBrand,
};
