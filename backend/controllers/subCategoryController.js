
const mongoose = require("mongoose");
const SubCategory = require("../model/SubCategorySchema");
const Category = require("../model/CategorySchema");
const cloudinary = require("../config/CloudinaryConfig");
const streamifier = require("streamifier");

// GENERATE SLUG
const generateSlug = (name) =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

const isValidId = (id) =>
    mongoose.isValidObjectId(id);

// UPLOAD IMAGE TO CLOUDINARY
const uploadToCloudinary = (file) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "subcategories" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier
            .createReadStream(file.buffer)
            .pipe(stream);
    });

// DELETE IMAGE FROM CLOUDINARY
const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(
            "Cloudinary cleanup failed:",
            error.message
        );
    }
};

// VALIDATE IMAGE
const validateImage = (file) => {
    if (!file) return null;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return "Image must be JPG, PNG, or WEBP";
    }

    if (file.size > 5 * 1024 * 1024) {
        return "Image size must not exceed 5 MB";
    }

    return null;
};

// ESCAPE REGEX
const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ADD SUBCATEGORY
const addSubCategory = async (req, res, next) => {
    let uploadedPublicId = "";

    try {
        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

        const category = req.body.category;

        const description =
            typeof req.body.description === "string"
                ? req.body.description.trim()
                : "";

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Subcategory name is required",
            });
        }

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 2 and 100 characters",
            });
        }

        if (!category || !isValidId(category)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid category",
            });
        }

        if (description.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Description cannot exceed 1000 characters",
            });
        }

        const imageError = validateImage(req.file);

        if (imageError) {
            return res.status(400).json({
                success: false,
                message: imageError,
            });
        }

        const categoryExists = await Category.findOne({
            _id: category,
            isDeleted: { $ne: true },
        });

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const slug = generateSlug(name);

        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid subcategory name",
            });
        }

        const duplicate = await SubCategory.findOne({
            category,
            isDeleted: { $ne: true },
            $or: [
                {
                    name: {
                        $regex: `^${escapeRegex(name)}$`,
                        $options: "i",
                    },
                },
                { slug },
            ],
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message:
                    "This subcategory already exists in this category",
            });
        }

        let image = {
            url: "",
            publicId: "",
        };

        if (req.file) {
            const uploadedImage =
                await uploadToCloudinary(req.file);

            uploadedPublicId = uploadedImage.public_id;

            image = {
                url: uploadedImage.secure_url,
                publicId: uploadedImage.public_id,
            };
        }

        const subCategory = await SubCategory.create({
            name,
            slug,
            category,
            description,
            image,
        });

        return res.status(201).json({
            success: true,
            message: "Subcategory added successfully",
            subCategory,
        });
    } catch (error) {
        if (uploadedPublicId) {
            await deleteFromCloudinary(uploadedPublicId);
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "This subcategory already exists in this category",
            });
        }

        next(error);
    }
};

// GET SUBCATEGORIES
// SEARCH + CATEGORY FILTER + STATUS FILTER + SORTING + PAGINATION
const getSubCategories = async (req, res, next) => {
    try {
        const {
            search = "",
            category = "",
            status = "",
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 10,
        } = req.query;

        const query = {
            isDeleted: { $ne: true },
        };

        // ACTIVE ROUTE: ONLY ACTIVE SUBCATEGORIES
        if (req.path === "/active") {
            query.status = "active";
        } else if (status) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status",
                });
            }

            query.status = status;
        }

        // CATEGORY FILTER
        if (category) {
            if (!isValidId(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category ID",
                });
            }

            query.category = category;
        }

        // SEARCH BY NAME, SLUG OR DESCRIPTION
        if (search.trim()) {
            const safeSearch = escapeRegex(search.trim());

            query.$or = [
                {
                    name: {
                        $regex: safeSearch,
                        $options: "i",
                    },
                },
                {
                    slug: {
                        $regex: safeSearch,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: safeSearch,
                        $options: "i",
                    },
                },
            ];
        }

        // PAGINATION VALUES
        const pageNum = Math.max(
            1,
            parseInt(page, 10) || 1
        );

        const limitNum = Math.min(
            100,
            Math.max(1, parseInt(limit, 10) || 10)
        );

        // ALLOWED SORT FIELDS
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

        const [subCategories, totalSubCategories] =
            await Promise.all([
                SubCategory.find(query)
                    .populate("category", "name")
                    .sort({
                        [sortField]: sortDirection,
                    })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum),

                SubCategory.countDocuments(query),
            ]);

        return res.status(200).json({
            success: true,
            subCategories,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(
                    totalSubCategories / limitNum
                ),
                totalSubCategories,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET SINGLE SUBCATEGORY
const getSubCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid subcategory ID",
            });
        }

        const subCategory = await SubCategory.findOne({
            _id: id,
            isDeleted: { $ne: true },
        }).populate("category", "name");

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found",
            });
        }

        return res.status(200).json({
            success: true,
            subCategory,
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE SUBCATEGORY
const updateSubCategory = async (req, res, next) => {
    let uploadedPublicId = "";

    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid subcategory ID",
            });
        }

        const subCategory = await SubCategory.findOne({
            _id: id,
            isDeleted: { $ne: true },
        });

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found",
            });
        }

        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : subCategory.name;

        const category =
            req.body.category || String(subCategory.category);

        const description =
            typeof req.body.description === "string"
                ? req.body.description.trim()
                : subCategory.description || "";

        if (!name || name.length < 2 || name.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 2 and 100 characters",
            });
        }

        if (!isValidId(category)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid category",
            });
        }

        if (description.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Description cannot exceed 1000 characters",
            });
        }

        const imageError = validateImage(req.file);

        if (imageError) {
            return res.status(400).json({
                success: false,
                message: imageError,
            });
        }

        const categoryExists = await Category.findOne({
            _id: category,
            isDeleted: { $ne: true },
        });

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const slug = generateSlug(name);

        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid subcategory name",
            });
        }

        const duplicate = await SubCategory.findOne({
            _id: { $ne: id },
            category,
            isDeleted: { $ne: true },
            $or: [
                {
                    name: {
                        $regex: `^${escapeRegex(name)}$`,
                        $options: "i",
                    },
                },
                { slug },
            ],
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message:
                    "This subcategory already exists in this category",
            });
        }

        const oldImagePublicId =
            subCategory.image?.publicId;

        subCategory.name = name;
        subCategory.slug = slug;
        subCategory.category = category;
        subCategory.description = description;

        if (req.file) {
            const uploadedImage =
                await uploadToCloudinary(req.file);

            uploadedPublicId = uploadedImage.public_id;

            subCategory.image = {
                url: uploadedImage.secure_url,
                publicId: uploadedImage.public_id,
            };
        }

        await subCategory.save();

        if (req.file && oldImagePublicId) {
            await deleteFromCloudinary(oldImagePublicId);
        }

        return res.status(200).json({
            success: true,
            message: "Subcategory updated successfully",
            subCategory,
        });
    } catch (error) {
        if (uploadedPublicId) {
            await deleteFromCloudinary(uploadedPublicId);
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "This subcategory already exists in this category",
            });
        }

        next(error);
    }
};

// CHANGE ACTIVE / INACTIVE STATUS
const changeSubCategoryStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid subcategory ID",
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be active or inactive",
            });
        }

        const subCategory = await SubCategory.findOne({
            _id: id,
            isDeleted: { $ne: true },
        });

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found",
            });
        }

        subCategory.status = status;

        await subCategory.save();

        return res.status(200).json({
            success: true,
            message: "Subcategory status updated successfully",
            subCategory,
        });
    } catch (error) {
        next(error);
    }
};

// SOFT DELETE SUBCATEGORY
const deleteSubCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid subcategory ID",
            });
        }

        const subCategory = await SubCategory.findOne({
            _id: id,
            isDeleted: { $ne: true },
        });

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found",
            });
        }

        const imagePublicId =
            subCategory.image?.publicId;

        subCategory.isDeleted = true;

        await subCategory.save();

        if (imagePublicId) {
            await deleteFromCloudinary(imagePublicId);
        }

        return res.status(200).json({
            success: true,
            message: "Subcategory deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addSubCategory,
    getSubCategories,
    getSubCategory,
    updateSubCategory,
    changeSubCategoryStatus,
    deleteSubCategory,
};
