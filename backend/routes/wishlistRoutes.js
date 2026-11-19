const express = require("express");
const router = express.Router();

const {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  syncWishlist,
} = require("../controllers/wishlistController");

// Aapka login auth middleware (req.user inject karne ke liye)
const auth = require("../middleware/authentication"); 

router.get("/my-wishlist", auth, getWishlist);
router.post("/toggle", auth, toggleWishlist);
router.delete("/remove/:productId", auth, removeFromWishlist);
router.post("/sync", auth, syncWishlist);

module.exports = router;