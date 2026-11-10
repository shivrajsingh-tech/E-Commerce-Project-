const mongoose = require("mongoose");
const Banner = require("../model/banner");

const getBannerImage = (body = {}) => {
  const image = body.image || {};
  return {
    url: String(image.url || body.imageUrl || "").trim(),
    public_id: String(image.public_id || "").trim(),
  };
};

// GET ACTIVE BANNERS — Public customer endpoint
exports.getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({
      status: "active",
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedBanners = (banners || []).map((banner) => ({
      ...banner,
      category: banner.category ? String(banner.category._id || banner.category) : null,
      imageUrl: banner.imageUrl || banner.image?.url || "",
      image: {
        url: banner.image?.url || banner.imageUrl || "",
        public_id: banner.image?.public_id || "",
      },
    }));

    return res.status(200).json({
      success: true,
      banners: formattedBanners,
    });
  } catch (error) {
    console.error("getActiveBanners Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active banners",
    });
  }
};

// GET ALL BANNERS — Admin Dashboard
exports.getBanners = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = { isDeleted: false };

    if (String(search).trim()) {
      const searchRegex = {
        $regex: String(search).trim(),$options: "i",
      };

      query.$or = [
        { title: searchRegex },
        { badge: searchRegex },
        { subtitle: searchRegex },
      ];
    }

    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === "asc" ? 1 : -1;

    const [banners, totalBanners] = await Promise.all([
      Banner.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Banner.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      banners,
      pagination: {
        totalBanners,
        totalPages: Math.ceil(totalBanners / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("getBanners Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
    });
  }
};

// CREATE BANNER — Admin
exports.addBanner = async (req, res) => {
  try {
    const { title, badge, subtitle, category, link, content, status } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner title is required",
      });
    }

    const image = getBannerImage(req.body);

    const banner = await Banner.create({
      title: String(title).trim(),
      badge: badge || "LIMITED OFFER",
      subtitle: subtitle || "",
      category: category ? String(category) : null,
      imageUrl: image.url,
      image,
      link: link || "",
      content: content || "",
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
    console.error("addBanner Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add banner",
    });
  }
};

// UPDATE BANNER — Admin
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findOne({ _id: id, isDeleted: false });
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    const {
      title,
      badge,
      subtitle,
      category,
      imageUrl,
      image,
      link,
      content,
      status,
    } = req.body;

    if (title !== undefined) banner.title = title;
    if (badge !== undefined) banner.badge = badge;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (link !== undefined) banner.link = link;
    if (content !== undefined) banner.content = content;
    if (category !== undefined) banner.category = category ? String(category) : null;

    if (status !== undefined) {
      banner.status = status === "inactive" ? "inactive" : "active";
    }

    if (imageUrl !== undefined || image !== undefined) {
      const newImage = getBannerImage({ imageUrl, image });
      banner.imageUrl = newImage.url;
      banner.image = newImage;
    }

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    console.error("updateBanner Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update banner",
    });
  }
};

// UPDATE STATUS
exports.updateBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const banner = await Banner.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { status } },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Banner status updated to ${status}`,
      banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update banner status",
    });
  }
};

// DELETE BANNER
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete banner",
    });
  }
};