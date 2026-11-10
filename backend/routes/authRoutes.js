const express = require("express");
const {
  signup,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updateProfile,
  changePassword,
  firstTimeChangePassword,
} = require("../controllers/authController");

const authentication = require("../middleware/authentication");
const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// ================= PROTECTED AUTH ROUTES =================
router.get("/me", authentication, getMe);
router.post("/logout", authentication, logout);
router.put("/profile", authentication, updateProfile);
router.put("/change-password", authentication, changePassword);

// First time mandatory password change route
router.post(
  "/first-time-change-password",
  authentication,
  firstTimeChangePassword
);

module.exports = router;