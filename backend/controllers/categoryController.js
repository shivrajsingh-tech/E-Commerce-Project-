
const Category = require("../model/CategorySchema");
const SubCategory = require("../model/SubCategorySchema");
const Product = require("../model/productModel");

const cloudinary = require("../config/CloudinaryConfig");
const streamifier = require("streamifier");

// Generate slug on backend
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
      { folder: "categories" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Category image deletion failed:", error.message);
  }
};

// ADD CATEGORY
const addCategory = async (req, res, next) => {
  let uploadedPublicId = "";

  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryName = name.trim();
    const slug = generateSlug(categoryName);

    const existingCategory = await Category.findOne({
      $or: [
        { name: { $regex: `^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { slug },
      ],
      isDeleted: { $ne: true },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    let image = {
      url: "",
      publicId: "",
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file);

      uploadedPublicId = result.public_id;

      image = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const category = await Category.create({
      name: categoryName,
      slug,
      description: description || "",
      image,
      status: "active",
      isDeleted: false,
    });

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      category,
    });
  } catch (error) {
    if (uploadedPublicId) {
      await deleteFromCloudinary(uploadedPublicId);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists",
      });
    }

    next(error);
  }
};

// GET ALL CATEGORIES
const getCategories = async (req, res, next) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
      status = "",
    } = req.query;

    const query = {
      isDeleted: { $ne: true },
    };

    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      query.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { description: searchRegex },
      ];
    }

    if (["active", "inactive"].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
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

    const [categories, totalCategories] = await Promise.all([
      Category.find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum),

      Category.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCategories / limitNum);

    return res.status(200).json({
      success: true,
      categories,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCategories,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE CATEGORY
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CATEGORY
const updateCategory = async (req, res, next) => {
  let uploadedPublicId = "";

  try {
    const { name, description } = req.body;

    const category = await Category.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      const categoryName = name.trim();
      const slug = generateSlug(categoryName);

      const escapedName = categoryName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const existingCategory = await Category.findOne({
        _id: { $ne: category._id },
        isDeleted: { $ne: true },
        $or: [
          {
            name: {
              $regex: `^${escapedName}$`,
              $options: "i",
            },
          },
          { slug },
        ],
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category already exists",
        });
      }

      category.name = categoryName;
      category.slug = slug;
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      uploadedPublicId = result.public_id;

      const oldPublicId = category.image?.publicId;

      category.image = {
        url: result.secure_url,
        publicId: result.public_id,
      };

      await category.save();

      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category,
      });
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    if (uploadedPublicId) {
      await deleteFromCloudinary(uploadedPublicId);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists",
      });
    }

    next(error);
  }
};

// CHANGE CATEGORY STATUS
const changeCategoryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    const category = await Category.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Do not activate a category if its parent-level
    // subcategories or products are intended to remain inactive.
    category.status = status;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category status updated successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE CATEGORY (SOFT DELETE)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check whether subcategories still use this category
    const subCategoryExists = await SubCategory.exists({
      category: category._id,
      isDeleted: { $ne: true },
    });

    if (subCategoryExists) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category. Delete or move its subcategories first.",
      });
    }

    // Check whether products still use this category
    const productExists = await Product.exists({
      category: category._id,
      isDeleted: { $ne: true },
    });

    if (productExists) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category. Move or remove its products first.",
      });
    }

    // Soft delete: keep the document for historical references
    category.isDeleted = true;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addCategory,
  getCategories,
  getCategory,
  updateCategory,
  changeCategoryStatus,
  deleteCategory,
};
