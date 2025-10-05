//app.js backend
// app.js (merged)
// -------------------------------------------------
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// ---------------- Existing (yours) routers ----------------
const pinRouter      = require("./Router/pins");
const contactRoutes  = require("./Router/contact");
const shelterRoutes  = require("./Router/shelters");

const victimRoutes   = require("./Router/VictimRoutes");
const aidRoutes      = require("./Router/AidRoutes");
const damageRoutes   = require("./Router/DamageRoutes");
const { listAids }   = require("./Controllers/AidController");
const damageCtrl     = require("./Controllers/DamageController");
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
const deploymentRoutes = require("./Router/DeploymentRoutes");
const requestsRoutes = require("./Router/RequestsRoutes");
const teamLocationRoutes = require("./Router/TeamLocationRoutes");

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
// ---------------- Theirs (+ your project) routers ----------
const adminAuthRoutes = require("./Router/AdminRoute");
const alertRoutes     = require("./Router/AlertRoute");
const userRoutes      = require("./Router/RegRoute");
const testRoutes      = require("./Router/testRoute");

// Country-wide broadcast cron
const { startSriLankaBroadcastCron } = require("./Jobs/weatherSriLankaBroadcastCron");

// ---------------- Config ----------------------------------
const app = express();
const PORT = process.env.PORT || 5000;

// Accept both 3000 (CRA) and 5173 (Vite) in dev
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  "http://localhost:5173"
];

// Prefer DB from .env; fall back to local dev
const MONGO_URL =
  (process.env.DB && process.env.DB.trim()) ||
  (process.env.MONGO_URL && process.env.MONGO_URL.trim()) ||
  "mongodb://127.0.0.1:27017/itpDB";

// redact password in logs
const redactCreds = (s = "") => s.replace(/\/\/.*?:.*?@/, "//***:***@");
console.log("[BOOT] Using Mongo URL:", redactCreds(MONGO_URL));
if (!process.env.DB && !process.env.MONGO_URL) {
  console.warn("[WARN] No DB/MONGO_URL in .env; using local mongodb://127.0.0.1:27017/itpDB");
}

// ---------------- Core middleware -------------------------
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Sessions (needs Mongo)
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URL,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7, // 7 days (in seconds)
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true behind HTTPS/proxy
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (in ms)
    },
  })
);

// ---------------- Static uploads --------------------------
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const DAMAGE_UPLOAD_DIR = path.join(UPLOAD_DIR, "damage");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DAMAGE_UPLOAD_DIR)) fs.mkdirSync(DAMAGE_UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------------- Health check ----------------------------
let isConnected = false;
app.get("/health", (_req, res) => {
  const healthStatus = {
    ok: isConnected,
    service: "backend",
    time: new Date().toISOString(),
    mongodb: {
      connected: isConnected,
      state: mongoose.connection.readyState,
      host: mongoose.connection.host || "unknown",
      port: mongoose.connection.port || "unknown",
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  res.status(isConnected ? 200 : 503).json(healthStatus);
});

// ---------------- Gate requests if DB is down -------------
app.use((req, res, next) => {
  // allow health + static even if DB is down
  if (req.path === "/health" || req.path.startsWith("/uploads")) return next();
  if (!isConnected) {
    return res.status(503).json({
      ok: false,
      message: "Database connection unavailable. Please try again later.",
      error: "SERVICE_UNAVAILABLE",
    });
  }
  next();
});

// ---------------- Routes (yours) --------------------------
app.use("/pins",         pinRouter);
app.use("/api/contact",  contactRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api", urlResolverRoutes);

app.use("/victims",      victimRoutes);
app.use("/aid",          aidRoutes);
app.use("/damage",       damageRoutes);
// New routes
app.use("/victims", victimRoutes);
app.use("/aid", aidRoutes);
app.use("/damage", damageRoutes);
app.use("/deployments", deploymentRoutes);
app.use("/requests", requestsRoutes);
app.use("/teamLocations", teamLocationRoutes);

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
app.get("/aids",    listAids);
app.get("/damages", damageCtrl.listDamages);

// ---------------- Routes (theirs) -------------------------
app.use("/tools",  testRoutes); // debug helpers

// Session probe
app.get("/auth/me", (req, res) => {
  if (req.session?.user) return res.json({ ok: true, user: req.session.user });
  return res.status(401).json({ ok: false, user: null });
});

// API groups
app.use("/admin",  adminAuthRoutes);
app.use("/alerts", alertRoutes);
app.use("/users",  userRoutes);

// Root
app.get("/", (_req, res) => res.json({ ok: true, msg: "API up" }));

// 404s for known api groups (helps clients)
app.use(["/admin", "/alerts", "/users"], (req, res) => {
  res.status(404).json({
    error: "API_NOT_FOUND",
    message: `No API route for ${req.method} ${req.originalUrl}`,
  });
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

// ---------------- Error handler ---------------------------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  // multer size error
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ ok: false, message: "File too large", error: "FILE_TOO_LARGE" });
  }

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Server error",
  });
});

// ---------------- Mongo connection & server ---------------
const mongooseOptions = {
  // Remove deprecated options that are causing warnings
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
  socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
  connectTimeoutMS: 30000, // 30 seconds timeout for initial connection
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 5, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  family: 4, // prefer IPv4
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000;

function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
  });

  // start the Sri Lanka country-wide broadcast cron
  try {
    startSriLankaBroadcastCron();
  } catch (e) {
    console.warn("[WARN] startSriLankaBroadcastCron failed:", e.message);
  }
}

function wireMongoEvents() {
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
    isConnected = false;
    attemptReconnection();
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔄 MongoDB reconnected");
    isConnected = true;
    reconnectAttempts = 0;
  });
}

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
    await mongoose.connect(MONGO_URL, mongooseOptions);
    isConnected = true;
    reconnectAttempts = 0;
    console.log("✅ Successfully connected to MongoDB:", redactCreds(MONGO_URL));
    wireMongoEvents();
    startServer();
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    if (error.name === "MongoServerSelectionError" || error.name === "MongoNetworkError") {
      console.error("🌐 Network/DNS issue detected. Attempting reconnection...");
      attemptReconnection();
    } else {
      console.error("⚠️ Check your cluster name, credentials, and IP access list in MongoDB Atlas");
      process.exit(1);
    }
  }
}

function attemptReconnection() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Exiting...`);
    process.exit(1);
  }
  reconnectAttempts++;
  console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${reconnectDelay / 1000}s...`);
  setTimeout(async () => {
    try {
      await mongoose.connect(MONGO_URL, mongooseOptions);
      isConnected = true;
      reconnectAttempts = 0;
      console.log("✅ Successfully reconnected to MongoDB");
    } catch (error) {
      console.error(`❌ Reconnection attempt ${reconnectAttempts} failed:`, error.message);
      attemptReconnection();
    }
  }, reconnectDelay);
}

// Boot
connectToMongoDB();

//  ---- Global Error Listeners ----
// ---------------- Global error listeners ------------------
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
module.exports = app;
