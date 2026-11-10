const express = require("express");
const router = express.Router();

const {
  getNearbyAvailablePartners,
  assignDeliveryPartner,
  toggleDutyStatus,
  markPickedUp,
  verifyOtpAndDeliver,
} = require("../controllers/deliveryController");

const authentication = require("../middleware/authentication");

const authHandler =
  typeof authentication === "function"
    ? authentication
    : authentication?.auth;

if (authHandler) {
  router.use(authHandler);
}

// 1. Available fleet riders for Admin / Manager
router.get("/available-partners", getNearbyAvailablePartners);

// 2. Assign partner to placed order
router.post("/assign", assignDeliveryPartner);

// 3. Duty status toggle (Online / Offline)
router.patch("/duty-status", toggleDutyStatus);

// 4. Mark order as picked up
router.post("/pickup", markPickedUp);

// 5. Verify delivery OTP
router.post("/verify-deliver", verifyOtpAndDeliver);

module.exports = router;