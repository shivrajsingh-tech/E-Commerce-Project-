const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URL;

  if (!uri) {
    console.error("❌ MongoDB Error: MONGO_URL is not set in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // Force IPv4 — fixes Node.js DNS SRV lookup failures on Windows
      family: 4,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
