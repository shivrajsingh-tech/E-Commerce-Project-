const express = require("express");
const router = express.Router();
const authentication = require("../middleware/authentication");
const paymentController = require("../controllers/paymentController");

router.use(authentication);

router.post("/razorpay/create-order", paymentController.createRazorpayOrder);
router.post("/razorpay/verify", paymentController.verifyAndCreateOrder);

module.exports = router;