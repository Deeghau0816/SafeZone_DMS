const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// ---- Existing Routes & Controllers ----
const pinRouter = require("./Router/pins");
const contactRoutes = require("./Router/contact");
const shelterRoutes = require("./Router/shelters");
const urlResolverRoutes = require("./Router/urlResolver");

// ---- New Routes & Controllers ----
const victimRoutes = require("./Router/VictimRoutes");
const aidRoutes = require("./Router/AidRoutes");
const damageRoutes = require("./Router/DamageRoutes");
const { listAids } = require("./Controllers/AidController");
const damageCtrl = require("./Controllers/DamageController");

// ---- Additional Routes & Controllers ----
const volunteerRoutes = require("./Router/VolunteerRoutes");
const operationRoutes = require("./Router/OperationRoutes");
const distributionRecordRoutes = require("./Router/DistributionrecordRoutes");
const targetInventoryRoutes = require("./Router/TargetinventoryRoutes");
const centersRoutes = require("./Router/CentersRoutes");
const inventoryRoutes = require("./Router/InventoryRoutes");
const donationRoutes = require("./Router/DonationRoutes");
const activeDisasterRoutes = require("./Router/ActiveDisasterRoutes");
const ngopastRoutes = require("./Router/NgopastRoutes");

// ---- Config ----
const PORT = 5000;
const FRONTEND = "http://localhost:3000";

// **Use the standard MongoDB cluster connection string from Atlas (bypasses SRV DNS issues)**
// If SRV format fails, try the standard format below:
const MONGO_URI_SRV = "mongodb+srv://admin:y59JHr1UwxN8ONkF@cluster0.bch8cu9.mongodb.net/safezone?retryWrites=true&w=majority";
const MONGO_URI_STANDARD = "mongodb://admin:y59JHr1UwxN8ONkF@cluster0-shard-00-00.bch8cu9.mongodb.net:27017,cluster0-shard-00-01.bch8cu9.mongodb.net:27017,cluster0-shard-00-02.bch8cu9.mongodb.net:27017/safezone?ssl=true&replicaSet=atlas-12345678-shard-0&authSource=admin&retryWrites=true&w=majority";

// Start with SRV format, fallback to standard if needed
let MONGO_URI = MONGO_URI_SRV;

// ---- App ----
const app = express();

// ---- Middleware ----
app.use(
  cors({
    origin: [FRONTEND, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---- Static Uploads ----
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const DAMAGE_UPLOAD_DIR = path.join(UPLOAD_DIR, "damage");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DAMAGE_UPLOAD_DIR)) fs.mkdirSync(DAMAGE_UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// ---- Health Check ----
app.get("/health", (_req, res) => {
  const healthStatus = {
    ok: true,
    service: "backend",
    time: new Date().toISOString(),
    mongodb: {
      connected: isConnected,
      state: mongoose.connection.readyState,
      host: mongoose.connection.host || "unknown",
      port: mongoose.connection.port || "unknown"
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  const statusCode = isConnected ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// ---- MongoDB Connection Middleware ----
app.use((req, res, next) => {
  // Skip health check and static files
  if (req.path === '/health' || req.path.startsWith('/uploads')) {
    return next();
  }
  
  if (!isConnected) {
    return res.status(503).json({
      ok: false,
      message: "Database connection unavailable. Please try again later.",
      error: "SERVICE_UNAVAILABLE"
    });
  }
  
  next();
});

// ---- Routes ----
// Existing routes
app.use("/pins", pinRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api", urlResolverRoutes);

// New routes
app.use("/victims", victimRoutes);
app.use("/aid", aidRoutes);
app.use("/damage", damageRoutes);

// Additional routes
app.use("/api", distributionRecordRoutes);
app.use("/api/targetinventories", targetInventoryRoutes);
app.use("/api/volunteer", volunteerRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/operations", operationRoutes);
app.use("/api", centersRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/activedisasters", activeDisasterRoutes);
app.use("/api/ngopast", ngopastRoutes);

// Aliases
app.get("/aids", listAids);
app.get("/damages", damageCtrl.listDamages);

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

// ---- Error Handler ----
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  
  // Handle multer errors
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ 
      ok: false,
      message: "File too large",
      error: "FILE_TOO_LARGE"
    });
  }
  
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Server error",
  });
});

// ---- MongoDB Connection Configuration ----
const mongooseOptions = {
  // Remove deprecated options that are causing warnings
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
  socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
  connectTimeoutMS: 30000, // 30 seconds timeout for initial connection
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 5, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  retryWrites: true,
  retryReads: true,
  // Handle DNS resolution issues
  family: 4, // Force IPv4 to avoid IPv6 DNS issues
};

// ---- MongoDB Connection Function ----
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds

async function connectToMongoDB() {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");

    // Try SRV format first
    console.log("🔗 Trying SRV connection format...");
    await mongoose.connect(MONGO_URI_SRV, mongooseOptions);

    isConnected = true;
    reconnectAttempts = 0;
    console.log("✅ Successfully connected to MongoDB Atlas using SRV format");

    // Set up connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error("❌ MongoDB connection error:", err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn("⚠️ MongoDB disconnected");
      isConnected = false;
      attemptReconnection();
    });

    mongoose.connection.on('reconnected', () => {
      console.log("🔄 MongoDB reconnected");
      isConnected = true;
      reconnectAttempts = 0;
    });

    // Start the server only after successful connection
    startServer();

  } catch (error) {
    console.error("❌ SRV connection failed:", error.message);

    if (error.message.includes('ENOTFOUND') || error.message.includes('DNS') || error.name === 'MongoServerSelectionError') {
      console.log("🔄 DNS/SRV resolution failed. Trying standard connection format...");

      try {
        // Try standard format as fallback
        await mongoose.connect(MONGO_URI_STANDARD, mongooseOptions);

        isConnected = true;
        reconnectAttempts = 0;
        console.log("✅ Successfully connected to MongoDB Atlas using standard format");

        // Set up connection event listeners
        mongoose.connection.on('error', (err) => {
          console.error("❌ MongoDB connection error:", err.message);
          isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
          console.warn("⚠️ MongoDB disconnected");
          isConnected = false;
          attemptReconnection();
        });

        mongoose.connection.on('reconnected', () => {
          console.log("🔄 MongoDB reconnected");
          isConnected = true;
          reconnectAttempts = 0;
        });

        // Start the server only after successful connection
        startServer();

      } catch (standardError) {
        console.error("❌ Standard connection also failed:", standardError.message);
        console.error("🌐 Both SRV and standard formats failed. This indicates:");
        console.error("   - Network connectivity issues");
        console.error("   - MongoDB Atlas cluster problems");
        console.error("   - Incorrect credentials or cluster configuration");
        console.error("📋 Please check:");
        console.error("   1. Your internet connection");
        console.error("   2. MongoDB Atlas cluster status");
        console.error("   3. IP whitelist settings");
        console.error("   4. Database user credentials");
        console.error("   5. Try changing DNS to 8.8.8.8 or 1.1.1.1");
        process.exit(1);
      }
    } else {
      console.error("⚠️ Unexpected error:", error.message);
      process.exit(1);
    }
  }
}

// ---- Reconnection Logic ----
async function attemptReconnection() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Exiting...`);
    process.exit(1);
  }
  
  reconnectAttempts++;
  console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${reconnectDelay/1000} seconds...`);
  
  setTimeout(async () => {
    try {
      await mongoose.connect(MONGO_URI, mongooseOptions);
      isConnected = true;
      reconnectAttempts = 0;
      console.log("✅ Successfully reconnected to MongoDB");
    } catch (error) {
      console.error(`❌ Reconnection attempt ${reconnectAttempts} failed:`, error.message);
      attemptReconnection();
    }
  }, reconnectDelay);
}

// ---- Start Server Function ----
function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  });
}

// ---- Initialize Connection ----
connectToMongoDB();

// ---- Global Error Listeners ----
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

// ---- File Upload Route for Deposit Proof ----
app.post("/api/uploads/deposit-proof", (req, res) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  }).single("file");

  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 2MB." });
        }
      }
      return res.status(500).json({ message: err.message || "File upload failed" });
    }

    res.status(200).json({
      message: "File uploaded successfully",
      filePath: `/uploads/${req.file.filename}`,
    });
  });
});