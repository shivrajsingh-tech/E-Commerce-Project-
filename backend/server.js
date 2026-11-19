const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();

const connectdb = require("./config/db");
connectdb();

// 1. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Cookie Parser (Sabhi routes se pehle hona zaroori hai)
app.use(cookieParser());

// 3. CORS Configuration (Next.js aur Vite dono ke liye)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// 4. Logger Middleware
const logger = require("./middleware/loggerMiddleware");
app.use(logger);

// ================= ROUTES IMPORT ============
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRouter");
const categoryRouter = require("./routes/categoryRoutes");
const brandRouter = require("./routes/brandRoutes");
const productRouter = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const roleRouter = require("./routes/roleRoutes");
const inventoryRouter = require("./routes/inventaryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const subCategoryRouter = require("./routes/subCategoryRoutes");
const productVariantRoutes = require("./routes/productVarientRoutes");
const customerRoutes = require("./routes/customerRoutes");
const dashboardRouter = require("./routes/dashboardRoutes");
const emailTemplateRouter = require("./routes/emailTemplateRouter");
const storeRoutes = require("./routes/storeRoutes");
const bannerRouter = require("./routes/bannerRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const wishlistRouter = require("./routes/wishlistRoutes"); // 🛠️ Wishlist router yahan import kiya
const addressRoutes = require("./routes/addressRoutes");
const cartRoutes = require("./routes/cartRoutes"); 

// ================= ROUTES MOUNT ============
app.use("/api/auth", authRouter);
app.use("/api/payment", paymentRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/deliveries", deliveryRoutes);


app.use("/api/users", userRouter);
app.use("/api/user", userRouter);

app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);

app.use("/api/dashboard", dashboardRouter);
app.use("/api/wishlist", wishlistRouter); // 🛠️ Clean mount

app.use("/api/roles", roleRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/customers", customerRoutes);
app.use("/api/product-variants", productVariantRoutes);
app.use("/api/brands", brandRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/subcategories", subCategoryRouter);
app.use("/api/products", productRouter);
app.use("/api/email-templates", emailTemplateRouter);
app.use("/api/banners", bannerRouter);
// Apne route file ka sahi path dein

// Cart routes ko mount karein (ensure karein ki prefix wahi ho jo aapki axios base instance mein set hai)
app.use("/api/cart", cartRoutes);

// 5. Error Middleware (Hamesha sabse aakhir mein aana chahiye)
const errorMiddleware = require("./middleware/errorMiddleware");
app.use(errorMiddleware);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});