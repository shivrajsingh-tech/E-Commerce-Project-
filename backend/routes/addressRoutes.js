
const express = require("express");
const router = express.Router();

const authentication = require("../middleware/authentication");
const addressController = require("../controllers/addressController");

// All customer address routes require login
router.use(authentication);

// Customer Address Routes
router.get("/getAddress", addressController.getAddresses);

router.post("/addAddress", addressController.addAddress);

router.put("/updateAddress/:id", addressController.updateAddress);

router.patch("/:id/select", addressController.setDefaultAddress);

router.delete("/delete/:id", addressController.deleteAddress);

module.exports = router;
