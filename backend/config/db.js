const mongoose = require("mongoose");

// Node.js on Windows cannot resolve MongoDB SRV DNS records (querySrv ECONNREFUSED).
// This function converts a mongodb+srv:// URI into a direct mongodb:// URI
// using the shard hostnames resolved by the Windows DNS stack (which works fine).
const toDirectUri = (uri) => {
  if (!uri.startsWith("mongodb+srv://")) return uri;

  // Parse:  mongodb+srv://user:pass@cluster0.kwchugo.mongodb.net/dbName
  const m = uri.match(
    /^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/
  );
  if (!m) throw new Error("Invalid mongodb+srv URI in MONGO_URL");

  const [, user, pass, , db] = m;

  // Shard hosts for cluster0.kwchugo.mongodb.net
  // (resolved once via PowerShell Resolve-DnsName — update if cluster changes)
  const hosts = [
    "ac-ch4d7cb-shard-00-00.kwchugo.mongodb.net:27017",
    "ac-ch4d7cb-shard-00-01.kwchugo.mongodb.net:27017",
    "ac-ch4d7cb-shard-00-02.kwchugo.mongodb.net:27017",
  ].join(",");

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);

  return (
    `mongodb://${u}:${p}@${hosts}/${db}` +
    `?ssl=true&replicaSet=atlas-b5i5tn-shard-0&authSource=admin&retryWrites=true&w=majority`
  );
};

const connectDB = async () => {
  const raw = process.env.MONGO_URL;

  if (!raw) {
    console.error("MongoDB Error: MONGO_URL is not set in .env");
    process.exit(1);
  }

  let uri;
  try {
    uri = toDirectUri(raw);
  } catch (e) {
    console.error("MongoDB URI error:", e.message);
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      family: 4,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.log("Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
