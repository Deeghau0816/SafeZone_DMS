const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// ---------------- Router imports ----------------
const pinRouter = require("./Router/pins");
const contactRoutes = require("./Router/contact");
const shelterRoutes = require("./Router/shelters");
const urlResolverRoutes = require("./Router/urlResolver");
const victimRoutes = require("./Router/VictimRoutes");
const aidRoutes = require("./Router/AidRoutes");
const damageRoutes = require("./Router/DamageRoutes");
const deploymentRoutes = require("./Router/DeploymentRoutes");
const requestsRoutes = require("./Router/RequestsRoutes");
const teamLocationRoutes = require("./Router/TeamLocationRoutes");
const { listAids } = require("./Controllers/AidController");
const damageCtrl = require("./Controllers/DamageController");

/* Legacy/external groups */
const adminAuthRoutes    = require("./Router/AdminRoute");
const alertRoutes        = require("./Router/AlertRoute");
const userRoutes         = require("./Router/RegRoute");
const testRoutes         = require("./Router/testRoute");

/* Reports API */
const reportsRoutes      = require("./Router/ReportRoute");

/* Country-wide broadcast cron */
const { startSriLankaBroadcastCron } = require("./Jobs/weatherSriLankaBroadcastCron");

/* ---------------- Config -------------------------------- */
const app  = express();
const PORT = process.env.PORT || 5000;

// If you ever run behind a proxy/HTTPS (nginx, vercel), keep cookies working.
app.set("trust proxy", 1);

// Accept both 3000 (CRA) and 5173 (Vite) in dev
// ✅ CHANGED: include APP_BASE_URL from .env and your LAN URLs
const ALLOWED_ORIGINS = [
  process.env.APP_BASE_URL,                  // from .env (e.g., http://192.168.136.99:3000)
  process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://192.168.136.99:3000",             // your LAN FE
  "http://192.168.136.99:5173"              // if you use Vite on LAN
].filter(Boolean);

// Prefer DB from .env; fall back to local dev
const MONGO_URL =
  (process.env.DB && process.env.DB.trim()) ||
  (process.env.MONGO_URI && process.env.MONGO_URI.trim()) ||
  "mongodb://127.0.0.1:27017/itpDB";

// redact password in logs
const redactCreds = (s = "") => s.replace(/\/\/.*?:.*?@/, "//***:***@");
console.log("[BOOT] Using Mongo URL:", redactCreds(MONGO_URL));

/* ---------------- Core middleware ----------------------- */
// CORS: allow your FE origins; also allow no-origin tools (curl/Postman)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / Postman
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use((req, res, next) => {
  // helpful for tricky CORS debugging
  res.header("Vary", "Origin");
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Sessions (uses a Mongo-backed store)
app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URL,
    collectionName: "sessions",
    ttl: 60 * 60 * 24 * 7, // 7 days
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS/proxy with app.set('trust proxy', 1)
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

/* ---------------- Static uploads ------------------------ */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const DAMAGE_UPLOAD_DIR = path.join(UPLOAD_DIR, "damage");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DAMAGE_UPLOAD_DIR)) fs.mkdirMakeDirs?.(DAMAGE_UPLOAD_DIR) || fs.mkdirSync(DAMAGE_UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

/* ---------------- Health check -------------------------- */
let isConnected = false;
app.get("/health", (_req, res) => {
  const healthStatus = {
    ok: isConnected,
    service: "backend",
    time: new Date().toISOString(),
    mongodb: {
      connected: isConnected,
      state: mongoose.connection.readyState,
      name: mongoose.connection?.name || "unknown",
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  res.status(isConnected ? 200 : 503).json(healthStatus);
});

/* ---------------- Gate requests if DB is down ----------- */
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
app.use("/pins", pinRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api", urlResolverRoutes);
app.use("/victims", victimRoutes);
app.use("/aid", aidRoutes);
app.use("/damage", damageRoutes);
app.use("/deployments", deploymentRoutes);
app.use("/requests", requestsRoutes);
app.use("/teamLocations", teamLocationRoutes);

// Aliases
app.get("/aids",           listAids);
app.get("/damages",        damageCtrl.listDamages);

// ---------------- Reports -------------------------------
app.use("/reports", reportsRoutes);

// ---------------- Legacy / tools ------------------------
app.use("/tools",   testRoutes); // debug helpers

// Unified session probe for both admin and user
app.get("/auth/me", (req, res) => {
  // Admin session?
  if (req.session?.admin) {
    return res.json({
      ok: true,
      role: "admin",
      admin: req.session.admin,
      user: null,
    });
  }
  // User session?
  if (req.session?.user) {
    return res.json({
      ok: true,
      role: "user",
      user: req.session.user,
      admin: null,
    });
  }
  // Neither present
  return res.status(401).json({ ok: false, role: null, user: null, admin: null });
});

// API groups
app.use("/admin",   adminAuthRoutes);
app.use("/alerts",  alertRoutes);
app.use("/users",   userRoutes);

// Root
app.get("/", (_req, res) => res.json({ ok: true, msg: "API up" }));

// 404s for known api groups (helps clients)
app.use(["/admin", "/alerts", "/users"], (req, res) => {
  res.status(404).json({
    error: "API_NOT_FOUND",
    message: `No API route for ${req.method} ${req.originalUrl}`,
  });
});

// ---------------- Error handler ---------------------------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  // multer size error
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ ok: false, message: "File too large", error: "FILE_TOO_LARGE" });
  }

  // CORS errors will bubble here too
  if (err?.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ ok: false, message: err.message });
  }

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Server error",
  });
});

/* ---------------- Mongo connection & server ------------- */
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  family: 4, // prefer IPv4
  tls: true,
  tlsAllowInvalidCertificates: true,
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000;

// ✅ CHANGED: bind to 0.0.0.0 and log API_BASE_URL if present
function startServer() {
  const HOST = "0.0.0.0";
  const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running at ${base}`);
    console.log(`📊 Health: ${base}/health`);
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
    await mongoose.connect(MONGO_URL, mongooseOptions);
    isConnected = true;
    reconnectAttempts = 0;
    console.log("✅ Successfully connected to MongoDB:", redactCreds(MONGO_URL));
    wireMongoEvents();
    startServer();
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    
    // If SRV connection fails due to DNS, try direct connection
    if (error.code === 'ENOTFOUND' && MONGO_URL === MONGO_URL_SRV) {
      console.log("🔄 SRV connection failed due to DNS. Trying direct connection...");
      try {
        await mongoose.connect(MONGO_URL_DIRECT, mongooseOptions);
        isConnected = true;
        reconnectAttempts = 0;
        console.log("✅ Successfully connected to MongoDB via direct connection:", redactCreds(MONGO_URL_DIRECT));
        wireMongoEvents();
        startServer();
        return;
      } catch (directError) {
        console.error("❌ Direct connection also failed:", directError.message);
      }
    }
    
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

/* ---------------- Global error listeners ---------------- */
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

// ---------------- Personal Routes Integration -----------------
// Additional routes for personal features
try {
  const volunteerRoutes = require("./Router/VolunteerRoutes");
  const operationRoutes = require("./Router/OperationRoutes");
  const distributionRecordRoutes = require("./Router/DistributionrecordRoutes");
  const targetInventoryRoutes = require("./Router/TargetinventoryRoutes");
  const centersRoutes = require("./Router/CentersRoutes");
  const inventoryRoutes = require("./Router/InventoryRoutes");
  const donationRoutes = require("./Router/DonationRoutes");
  const activeDisasterRoutes = require("./Router/ActiveDisasterRoutes");
  const ngopastRoutes = require("./Router/NgopastRoutes");

  // Personal routes
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

  console.log("✅ Personal routes loaded successfully");
} catch (error) {
  console.warn("⚠️ Some personal routes could not be loaded:", error.message);
}

// Additional file upload endpoint for personal features
app.post("/api/uploads/deposit-proof", (req, res) => {
  const multer = require("multer");
  const path = require("path");
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), "uploads"));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
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

// Catch-all 404 (must be last)
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

module.exports = app;
