
const express = require("express");
const router = express.Router();

const {
  addBrand,
  getBrands,
  getBrand,
  updateBrand,
  changeBrandStatus,
  deleteBrand,
} = require("../controllers/brandController");

const upload = require("../middleware/multerMiddleware");

// Add Brand
router.post("/add-brand", upload.single("logo"), addBrand);

// Get All Brands (Search, Filter, Sort, Pagination)
router.get("/get-brands", getBrands);

// Get Single Brand
router.get("/get-brand/:id", getBrand);

// Update Brand
router.put("/update-brand/:id", upload.single("logo"), updateBrand);

// Change Brand Status
router.patch("/change-brand-status/:id", changeBrandStatus);

// Delete Brand
router.delete("/delete-brand/:id", deleteBrand);

module.exports = router;
