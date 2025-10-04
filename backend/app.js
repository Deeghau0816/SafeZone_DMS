require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Enhanced logging
const logRequest = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
};

// ---- Existing SafeZone DMS Routes & Controllers ----
const pinRouter = require("./Router/pins");
const contactRoutes = require("./Router/contact");
const shelterRoutes = require("./Router/shelters");

// ---- SafeZone DMS Routes & Controllers ----
const victimRoutes = require("./Router/VictimRoutes");
const aidRoutes = require("./Router/AidRoutes");
const damageRoutes = require("./Router/DamageRoutes");
const { listAids } = require("./Controllers/AidController");
const damageCtrl = require("./Controllers/DamageController");

// ---- NGO Routes & Controllers ----
const volunteerRoutes = require("./Router/VolunteerRoutes");
const operationRoutes = require("./Router/OperationRoutes");
const distributionRecordRoutes = require("./Router/DistributionrecordRoutes");
const targetInventoryRoutes = require("./Router/TargetinventoryRoutes");
const centersRoutes = require("./Router/CentersRoutes");
const inventoryRoutes = require("./Router/InventoryRoutes");
const donationRoutes = require("./Router/DonationRoutes");
const activeDisasterRoutes = require("./Router/ActiveDisasterRoutes");
const ngopastRoutes = require("./Router/NgopastRoutes");
const uploadRoutes = require("./Router/UploadRoutes");

// ---- Config ----
const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || 
  "mongodb://localhost:27017/safezone";
const MONGO_DB = process.env.MONGO_DB || "safezone";
const ALLOW_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ---- App ----
const app = express();
app.set("trust proxy", 1);

// ---- Middleware ----
// CORS (whitelist) - FIRST
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOW_ORIGIN.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// JSON and URL encoded parsing - SECOND
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging - THIRD
app.use(logRequest);

// Rate limiting (optional - uncomment if needed)
// const rateLimit = require('express-rate-limit');
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

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
  
  // Skip database check if MongoDB is disabled
  if (SKIP_MONGODB) {
    return next();
  }
  
  if (!isConnected) {
    return res.status(503).json({
      ok: false,
      message: "Database connection unavailable. Please try again later.",
      error: "SERVICE_UNAVAILABLE",
      note: "Set SKIP_MONGODB=true in .env to run without database"
    });
  }
  
  next();
});

// ---- Routes ----
// SafeZone DMS Routes
app.use("/pins", pinRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/victims", victimRoutes);
app.use("/aid", aidRoutes);
app.use("/damage", damageRoutes);

// NGO Routes
app.use("/api/volunteer", volunteerRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/operations", operationRoutes);
app.use("/api", distributionRecordRoutes);
app.use("/api/targetinventories", targetInventoryRoutes);
app.use("/api", centersRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/activedisasters", activeDisasterRoutes);
app.use("/api/ngopast", ngopastRoutes);
app.use("/api/uploads", uploadRoutes);

// Aliases
app.get("/aids", listAids);
app.get("/damages", damageCtrl.listDamages);

// NGO File Upload Routes
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

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorId = Math.random().toString(36).substr(2, 9);
  
  console.error(`[${timestamp}] Error ${errorId}:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Handle multer errors
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ 
      ok: false,
      message: "File too large",
      error: "FILE_TOO_LARGE",
      errorId
    });
  }
  
  // Handle CORS errors
  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({
      ok: false,
      message: "Access denied: Origin not allowed",
      error: "CORS_ERROR",
      errorId
    });
  }
  
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Server error",
    errorId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ---- MongoDB Connection Configuration ----
const mongooseOptions = {
  dbName: MONGO_DB,
  serverSelectionTimeoutMS: 5000, // 5 seconds timeout for server selection
  socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
  connectTimeoutMS: 10000, // 10 seconds timeout for initial connection
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 1, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  retryWrites: true,
  retryReads: true,
};

// ---- MongoDB Connection Function ----
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds
const SKIP_MONGODB = process.env.SKIP_MONGODB === 'true' || process.env.NODE_ENV === 'development';

async function connectToMongoDB() {
  // Skip MongoDB connection if SKIP_MONGODB is set to true
  if (SKIP_MONGODB) {
    console.log("⚠️ MongoDB connection skipped (SKIP_MONGODB=true)");
    console.log("📝 Note: Database features will be disabled");
    isConnected = false;
    startServer();
    return;
  }

  try {
    console.log(`🔄 Attempting to connect to MongoDB at ${MONGO_URI.replace(/\/\/.*@/, '//***:***@')}...`);
    
    await mongoose.connect(MONGO_URI, mongooseOptions);
    
    isConnected = true;
    reconnectAttempts = 0;
    console.log(`✅ Successfully connected to MongoDB (${MONGO_DB})`);
    
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
    console.error("❌ Failed to connect to MongoDB:", error.message);
    
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      console.error("🌐 Network/DNS issue detected. Attempting reconnection...");
      attemptReconnection();
    } else {
      console.error("⚠️ MongoDB connection failed. Starting server without database...");
      console.log("💡 To skip MongoDB entirely, set SKIP_MONGODB=true in your .env file");
      isConnected = false;
      startServer();
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