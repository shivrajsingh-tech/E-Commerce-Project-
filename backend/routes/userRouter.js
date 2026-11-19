
const express = require("express");

const {
  createUser,
  login,
  getUsers,
  getUser,
  updateUser,
  changeUserStatus,
  deleteUser,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  customerLogout,
  getThemePreference,
  updateThemePreference,
} = require("../controllers/userController");

const {
  signup,
  getMe,
  updateProfile,
} = require("../controllers/authController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");

const router = express.Router();

// ================= PUBLIC AUTH ROUTES =================
router.post("/signup", signup);
router.post("/login", login);

// ================= AUTHENTICATED USER ROUTES =================
router.get("/profile", authentication, getMe);
router.get("/me", authentication, getMe);
router.put("/profile", authentication, updateProfile);

router.post("/logout", authentication, (req, res) => {
  res.clearCookie("customer_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// ================= ADMIN / STAFF USER MANAGEMENT =================
router.get(
  "/get-users",
  authentication,
  authorizePermissions("users.view"),
  getUsers
);

router.post(
  "/create-user",
  authentication,
  authorizePermissions("users.create"),
  createUser
);

router.get(
  "/get-user/:id",
  authentication,
  authorizePermissions("users.view"),
  getUser
);

router.put(
  "/update-user/:id",
  authentication,
  authorizePermissions("users.update"),
  updateUser
);

router.patch(
  "/update-user-status/:id",
  authentication,
  authorizePermissions("users.status_change"),
  changeUserStatus
);

router.delete(
  "/delete-user/:id",
  authentication,
  authorizePermissions("users.delete"),
  deleteUser
);

// ================= CUSTOMER PROFILE ROUTES =================
router.get(
  "/getCustomerProfile",
  authentication,
  getCustomerProfile
);

router.put(
  "/updateCustomerProfile",
  authentication,
  updateCustomerProfile
);

router.put(
  "/changeCustomerPassword",
  authentication,
  changeCustomerPassword
);

router.post(
  "/customerlogout",
  authentication,
  customerLogout
);

// ================= THEME PREFERENCE =================
router.get(
  "/theme",
  authentication,
  getThemePreference
);

router.patch(
  "/theme",
  authentication,
  updateThemePreference
);

module.exports = router;
