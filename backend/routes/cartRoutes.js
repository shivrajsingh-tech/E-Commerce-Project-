// backend/routes/cartRoutes.js
const express = require("express");
const router = express.Router();
const { getCart, addToCart, removeFromCart, updateQuantity, syncCart } = require("../controllers/cartController");
const auth = require("../middleware/authentication");

router.get("/my-cart", auth, getCart);
router.post("/add", auth, addToCart);
router.put("/quantity", auth, updateQuantity);
router.delete("/remove/:itemId", auth, removeFromCart);
router.post("/sync", auth, syncCart);

module.exports = router;