
const express = require("express");

const {
    getBanners,
    getActiveBanners,
    addBanner,
    updateBanner,
    deleteBanner,
    updateBannerStatus,
} = require("../controllers/bannerController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");

const router = express.Router();

// Public: customers can view active banners without admin permissions.
router.get("/get-active-banners", getActiveBanners);

// All routes below this line require authentication.
router.use(authentication);

// Admin banner listing
router.get(
    "/get-banners",
    authorizePermissions("banners.view"),
    getBanners
);

// Create banner
router.post(
    "/add-banner",
    authorizePermissions("banners.create"),
    addBanner
);

// Update banner
router.put(
    "/update-banner/:id",
    authorizePermissions("banners.update"),
    updateBanner
);

// Soft-delete banner
router.delete(
    "/delete-banner/:id",
    authorizePermissions("banners.delete"),
    deleteBanner
);

// Activate/deactivate banner
router.patch(
    "/update-banner-status/:id",
    authorizePermissions("banners.status_change"),
    updateBannerStatus
);

module.exports = router;
