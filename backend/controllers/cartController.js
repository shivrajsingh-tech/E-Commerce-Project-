// backend/controllers/cartController.js
const Cart = require("../model/cartSchema");
const Product = require("../model/productModel");
const ProductVariant = require("../model/productVarientSchema");
const Store = require("../model/storeSchema");
const mongoose = require("mongoose");

const calculateCartTotals = (cart) => {
  cart.subtotal = (cart.items || []).reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  cart.totalAmount = Math.max(
    0,
    cart.subtotal - (cart.discount || 0) + (cart.deliveryFee || 0) + (cart.tax || 0)
  );
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name title brand price discountPrice variants image images status isActive isDeleted availableQuantity",
    });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Filter out items where the referenced product no longer exists
    const validItems = (cart.items || []).filter(
      (item) => item && item.product && !item.product.isDeleted
    );

    return res.status(200).json({
      success: true,
      cart: {
        items: validItems,
        subtotal: cart.subtotal || 0,
        totalAmount: cart.totalAmount || 0,
        store: cart.store,
      },
    });
  } catch (error) {
    console.error("getCart Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { productId, variantId, quantity, price, unit, image, storeId } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ success: false, message: "Invalid Product ID" });

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], store: storeId || null });
    }

    const targetVariantId = variantId && mongoose.isValidObjectId(variantId) ? String(variantId) : null;
    const incomingQty = Number(quantity || 1);

    const itemIndex = cart.items.findIndex(
      (item) =>
        String(item.product) === String(productId) &&
        String(item.variantId || "") === String(targetVariantId || "")
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += incomingQty;
      if (price) cart.items[itemIndex].price = Number(price);
    } else {
      cart.items.push({
        product: productId,
        variantId: targetVariantId,
        quantity: incomingQty,
        price: Number(price || 0),
        unit: unit || "1 item",
        image: image || "",
        storeId: storeId || null,
      });
    }

    calculateCartTotals(cart);
    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("addToCart Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// REMOVE OR DELETE ITEM COMPLETELY FROM CART
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { itemId } = req.params; // Can be item subdocument _id or product/variant ID

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) =>
        String(item._id) !== String(itemId) &&
        String(item.variantId || "") !== String(itemId) &&
        String(item.product?._id || item.product) !== String(itemId)
    );

    calculateCartTotals(cart);
    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("removeFromCart Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// UPDATE ITEM QUANTITY (OR REMOVE IF QUANTITY <= 0)
exports.updateQuantity = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { productId, variantId, quantity } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!productId) return res.status(400).json({ success: false, message: "Product ID is required" });

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const targetVariantId = variantId && mongoose.isValidObjectId(variantId) ? String(variantId) : null;
    const newQty = Number(quantity);

    const itemIndex = cart.items.findIndex((item) => {
      const prodMatch =
        String(item.product?._id || item.product) === String(productId) ||
        String(item._id) === String(productId);
      const varMatch = String(item.variantId || "") === String(targetVariantId || "");
      return prodMatch && varMatch;
    });

    if (itemIndex > -1) {
      if (newQty <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = newQty;
      }
      calculateCartTotals(cart);
      await cart.save();
    }

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("updateQuantity Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

exports.syncCart = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { localItems } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    if (Array.isArray(localItems)) {
      for (const localItem of localItems) {
        const prodId = localItem._id || localItem.id || localItem.product;
        if (!mongoose.isValidObjectId(prodId)) continue;

        const vId = localItem.variantId && mongoose.isValidObjectId(localItem.variantId) ? String(localItem.variantId) : null;
        const qty = Number(localItem.quantity || 1);

        const existingIdx = cart.items.findIndex(
          (i) =>
            String(i.product) === String(prodId) &&
            String(i.variantId || "") === String(vId || "")
        );

        if (existingIdx > -1) {
          cart.items[existingIdx].quantity += qty;
        } else {
          cart.items.push({
            product: prodId,
            variantId: vId,
            quantity: qty,
            price: Number(localItem.price || 0),
            unit: localItem.unit || "1 item",
            image: localItem.image || "",
            storeId: localItem.storeId || null,
          });
        }
      }
    }

    calculateCartTotals(cart);
    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("syncCart Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};