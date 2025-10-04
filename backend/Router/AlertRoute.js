

const express = require("express");
const EventEmitter = require("events");
const router = express.Router();

const Alert = require("../models/AlertModels");
const User  = require("../models/RegModel");
const { sendAlertEmail } = require("../Services/notifyEmail"); // uses utils/sendEmail + templates

console.log("[AlertRoute] loaded");

// ---------- Auth helpers ----------
function requireAnyAuth(req, res, next) {
  if (req.session?.user || req.session?.admin) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated" });
}

function requireUser(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated (user)" });
}

// ---------- Utils ----------
function asInt(v, d) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
}
function escReg(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A small bus to notify SSE clients when alerts change
const bus = new EventEmitter();

// Build a snapshot for dashboard (metrics + recent alerts)
async function buildSnapshot(limit = 20) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Aggregate metrics and recents in one trip
  const [agg] = await Alert.aggregate([
    {
      $facet: {
        total: [{ $count: "n" }],
        last24h: [{ $match: { createdAt: { $gte: since } } }, { $count: "n" }],
        byType: [
          { $group: { _id: { $toLower: "$alertType" }, n: { $sum: 1 } } },
        ],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            // map to fields expected by your Admin UI
            $project: {
              _id: 1,
              title: "$topic",
              severity: { $toLower: "$alertType" },
              userName: "$adminName",
              district: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const total = agg?.total?.[0]?.n ?? 0;
  const last24h = agg?.last24h?.[0]?.n ?? 0;
  const typeMap = Object.fromEntries((agg?.byType || []).map(x => [x._id, x.n]));
  const red   = typeMap["red"]   || 0;
  const green = typeMap["green"] || 0;

  const users = await User.countDocuments({}); // or { verified: true } if preferred

  return {
    metrics: {
      total,
      red,
      green,
      last24h,
      activeUsers: users,
    },
    alerts: agg?.recent || [],
  };
}

// ---------- Ping ----------
router.get("/ping", (_req, res) => res.json({ ok: true, route: "alerts/ping" }));

// ---------- Dashboard endpoints (used by AdminHome.jsx) ----------

// Metrics only
router.get("/metrics", async (_req, res) => {
  try {
    const snap = await buildSnapshot(0);
    return res.json(snap.metrics);
  } catch (e) {
    console.error("[GET /alerts/metrics]", e);
    res.status(500).json({ error: "METRICS_FAILED" });
  }
});

// Recent list for the table (array only)
router.get("/recent", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, asInt(req.query.limit, 8)));
    const snap = await buildSnapshot(limit);
    return res.json(snap.alerts);
  } catch (e) {
    console.error("[GET /alerts/recent]", e);
    res.status(500).json({ error: "RECENT_FAILED" });
  }
});

// JSON pull (metrics + alerts) - fallback when SSE not available
router.get("/pull", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, asInt(req.query.limit, 20)));
    const snap = await buildSnapshot(limit);
    return res.json(snap);
  } catch (e) {
    console.error("[GET /alerts/pull]", e);
    res.status(500).json({ error: "PULL_FAILED" });
  }
});

// SSE realtime stream
router.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  // initial snapshot
  (async () => {
    try {
      const snap = await buildSnapshot(20);
      send("metrics", snap.metrics);
      send("alerts", snap.alerts);
    } catch {}
  })();

  const onUpdate = async () => {
    try {
      const snap = await buildSnapshot(20);
      send("metrics", snap.metrics);
      send("alerts", snap.alerts);
    } catch {}
  };

  bus.on("alerts:update", onUpdate);

  req.on("close", () => {
    bus.off("alerts:update", onUpdate);
    res.end();
  });
});

// ---------- List (public) with optional district + pagination ----------
router.get("/", async (req, res) => {
  try {
    const { district = "", page = "1", limit = "10", q = "" } = req.query;

    const where = {};
    if (district && String(district).trim()) where.district = String(district).trim();

    // Optional simple search against topic/message
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim(), "i");
      where.$or = [{ topic: rx }, { message: rx }];
    }

    const pageNum = asInt(page, 1);
    const perPage = asInt(limit, 10);

    const [items, total] = await Promise.all([
      Alert.find(where)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perPage)
        .limit(perPage)
        .lean(),
      Alert.countDocuments(where),
    ]);

    const pages = Math.max(1, Math.ceil(total / perPage));
    res.json({ ok: true, items, page: pageNum, pages, total });
  } catch (e) {
    console.error("[GET /alerts] error:", e);
    res.status(500).json({ ok: false, message: "Server error while fetching alerts" });
  }
});

// ---------- "My" alerts (user's district) ----------
router.get("/my", requireUser, async (req, res) => {
  try {
    const district = req.session.user?.district;
    if (!district) {
      return res.status(400).json({ ok: false, message: "User has no district set" });
    }
    const items = await Alert.find({ district }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, items });
  } catch (e) {
    console.error("[GET /alerts/my] error:", e);
    res.status(500).json({ ok: false, message: "Server error while fetching alerts" });
  }
});

// ---------- Get one (public) ----------
router.get("/:alertId", async (req, res) => {
  try {
    const { alertId } = req.params;
    const doc = await Alert.findById(alertId).lean();
    if (!doc) return res.status(404).json({ ok: false, message: "Alert not found" });
    res.json({ ok: true, alert: doc });
  } catch (e) {
    console.error("[GET /alerts/:alertId] error:", e);
    res.status(500).json({ ok: false, message: "Server error while fetching alert" });
  }
});

// ---------- Create (user OR admin) + EMAIL BROADCAST ----------
router.post("/", requireAnyAuth, async (req, res) => {
  try {
    const payload = {
      alertType:   req.body.alertType || "green",  // "green" | "red"
      topic:       (req.body.topic || "").trim(),
      message:     (req.body.message || "").trim(),
      district:    (req.body.district || "").trim(),
      disLocation: (req.body.disLocation || "").trim(),
      adminName:   req.body.adminName || "System Admin",
    };

    if (!payload.topic || !payload.message) {
      return res.status(400).json({ ok: false, message: "Topic and message are required." });
    }
    if (!payload.district) {
      return res.status(400).json({ ok: false, message: "District is required." });
    }

    // Create alert
    const alertDoc = await Alert.create(payload);

    // Determine recipients
    const isRed = String(alertDoc.alertType).toLowerCase() === "red";

    // Include users where:
    // - email exists AND
    // - (emailAlerts is true) OR (emailAlerts field is missing)
    const baseQuery = {
      email: { $exists: true, $ne: "" },
      $or: [{ emailAlerts: { $exists: false } }, { emailAlerts: true }],
    };

    const userQuery = isRed
      ? baseQuery // 🔴 Red = all users (per above conditions)
      : { ...baseQuery, district: new RegExp(`^${escReg(alertDoc.district)}$`, "i") };

    const users = await User.find(userQuery).select({ email: 1, _id: 0 }).lean();
    const emails = users.map((u) => u.email).filter(Boolean);

    console.log("[alerts] broadcasting", {
      type: alertDoc.alertType,
      district: alertDoc.district,
      recipients: emails.length,
      sample: emails.slice(0, 3),
    });

    // Send emails
    await sendAlertEmail(emails, {
      level: alertDoc.alertType,
      title: alertDoc.topic,
      topic: alertDoc.topic,
      message: alertDoc.message,
      district: alertDoc.district,
      disLocation: alertDoc.disLocation,
      adminName: alertDoc.adminName,
      _id: alertDoc._id,
      createdAt: alertDoc.createdAt,
    });

    // 🔔 notify dashboard clients
    bus.emit("alerts:update");

    return res.json({
      ok: true,
      alert: alertDoc,
      emailed: emails.length,
      scope: isRed ? "all" : `district:${alertDoc.district}`,
    });
  } catch (e) {
    console.error("[POST /alerts] create error:", e);
    res.status(400).json({ ok: false, message: e.message });
  }
});

// ---------- Update (user OR admin) ----------
router.put("/:alertId", requireAnyAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const patch = {};
    ["alertType", "topic", "message", "district", "disLocation", "adminName"].forEach((k) => {
      if (req.body[k] !== undefined)
        patch[k] = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
    });

    const updated = await Alert.findByIdAndUpdate(alertId, patch, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ ok: false, message: "Alert not found" });

    // 🔔 notify dashboard clients
    bus.emit("alerts:update");

    res.json({ ok: true, alert: updated });
  } catch (e) {
    console.error("[PUT /alerts/:alertId] update error:", e);
    res.status(400).json({ ok: false, message: e.message });
  }
});

// ---------- Delete (user OR admin) ----------
router.delete("/:alertId", requireAnyAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const deleted = await Alert.findByIdAndDelete(alertId).lean();
    if (!deleted) return res.status(404).json({ ok: false, message: "Alert not found" });

    // 🔔 notify dashboard clients
    bus.emit("alerts:update");

    res.json({ ok: true, deletedId: alertId });
  } catch (e) {
    console.error("[DELETE /alerts/:alertId] delete error:", e);
    res.status(400).json({ ok: false, message: e.message });
  }
});

module.exports = router;
