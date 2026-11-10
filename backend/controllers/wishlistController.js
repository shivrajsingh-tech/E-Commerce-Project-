const mongoose = require("mongoose");
const Wishlist = require("../model/wishListSchema");

// 1. GET LOGGED-IN USER WISHLIST
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: "products",
      select: "name title brand price discountPrice variants image images status isActive isDeleted",
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [] });
    }

    // Filter out deleted/inactive products automatically
    const validProducts = (wishlist.products || []).filter(
      (prod) => prod && !prod.isDeleted && prod.status !== "inactive"
    );

    return res.status(200).json({
      success: true,
      wishlist: validProducts,
    });
  } catch (error) {
    console.error("getWishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Wishlist fetch karne me error aayi",
    });
  }
};

// 2. TOGGLE PRODUCT (Add ya Remove directly from heart icon)
exports.toggleWishlist = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [productId] });
      return res.status(200).json({
        success: true,
        action: "added",
        message: "Item wishlist me add ho gaya",
        wishlist: wishlist.products,
      });
    }

    const index = wishlist.products.findIndex(
      (id) => String(id) === String(productId)
    );

    let action = "";
    if (index > -1) {
      // Pehle se tha -> Hata do
      wishlist.products.splice(index, 1);
      action = "removed";
    } else {
      // Nahi tha -> Add kar do
      wishlist.products.push(productId);
      action = "added";
    }

    await wishlist.save();

    return res.status(200).json({
      success: true,
      action,
      message: action === "added" ? "Wishlist me add hua" : "Wishlist se remove hua",
      wishlist: wishlist.products,
    });
  } catch (error) {
    console.error("toggleWishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Wishlist update nahi ho paya",
    });
  }
};

// 3. REMOVE PRODUCT FROM WISHLIST PAGE
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { products: productId } },
      { new: true }
    ).populate({
      path: "products",
      select: "name title brand price discountPrice variants image images status isActive isDeleted",
    });

    return res.status(200).json({
      success: true,
      message: "Item wishlist se hata diya gaya",
      wishlist: wishlist ? wishlist.products : [],
    });
  } catch (error) {
    console.error("removeFromWishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove item from wishlist",
    });
  }
};