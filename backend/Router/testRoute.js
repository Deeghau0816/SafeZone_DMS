// Routes/testRoute.js
const express = require("express");
const router = express.Router();
console.log("[TestRoute] loaded");

const {
  __runOnceLKA,
  __forceBroadcastOnce,
  __clearCountryState
} = require("../Jobs/weatherSriLankaBroadcastCron");

const User = require("../models/RegModel");
const sendEmail = require("../utils/sendEmail");
const { alertEmailHTML } = require("../Services/templates");

// sanity
router.get("/ping", (_req, res) => {
  console.log("[TestRoute] /tools/ping hit");
  res.json({ ok: true, ping: "pong" });
});

// run country scan once (normal behavior)
router.get("/check-lka-now", async (_req, res) => {
  try {
    console.log("[TestRoute] /tools/check-lka-now hit");
    await __runOnceLKA(); // normal: will skip if no change
    res.json({ ok: true, msg: "Sri Lanka weather scan executed (normal)." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// run country scan once AND broadcast even if no change
router.get("/check-lka-now-force", async (_req, res) => {
  try {
    console.log("[TestRoute] /tools/check-lka-now-force hit");
    await __forceBroadcastOnce(); // force = true
    res.json({ ok: true, msg: "Sri Lanka weather scan executed (FORCED broadcast)." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// clear stored country state so next normal run will broadcast again if alerts exist
router.post("/reset-lka-state", async (_req, res) => {
  try {
    await __clearCountryState();
    res.json({ ok: true, msg: "Sri Lanka alert state cleared." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// send a manual test alert to ONE address (pipeline check)
router.post("/send-test-alert", async (req, res) => {
  try {
    const {
      to = process.env.EMAIL_USER,
      place = "Colombo",
      event = "Manual Test Alert",
      message = "This is a manual test alert."
    } = req.body || {};

    const html = alertEmailHTML({
      name: (to || "").split("@")[0] || "User",
      place,
      alerts: [{
        source: "SafeZone",
        event,
        description: message,
        start: new Date().toISOString(),
        end: null,
      }],
    });

    const subject = `⚠️ Weather Alert (TEST) — ${place}`;
    const r = await sendEmail(to, subject, html);
    console.log("[TestRoute] test email sent ->", to);

    res.json({ ok: true, msg: "Test email sent", messageId: r?.messageId || null, to });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === NEW: send a manual test alert to ALL users
router.post("/send-test-alert-all", async (req, res) => {
  try {
    const {
      place = "Sri Lanka",
      event = "Auto Alert System of SafeZone",
      message = "heavy rain incomming to your area.",
      limit,             
      onlyEnabled = true 
    } = req.body || {};

    // select recipients
    const query = onlyEnabled ? { alertsEnabled: true } : {};
    let users = await User.find(query, { email: 1, firstName: 1 }).lean();

    if (!users.length) {
      return res.json({ ok: false, msg: "No users found for broadcast." });
    }
    if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
      users = users.slice(0, Number(limit));
    }

    const subject = `⚠️ SafeZone (TEST BROADCAST) — ${place}`;
    const sent = [];
    const fails = [];

    // send sequentially (simple & avoids SMTP throttling bursts)
    for (const u of users) {
      try {
        const html = alertEmailHTML({
          name: u.firstName || (u.email?.split("@")[0] || "User"),
          place,
          alerts: [{
            source: "SafeZone Manual",
            event,
            description: message,
            start: new Date().toISOString(),
            end: null,
          }],
        });
        const r = await sendEmail(u.email, subject, html);
        sent.push({ email: u.email, id: r?.messageId || null });
      } catch (err) {
        fails.push({ email: u.email, error: err.message });
      }
    }

    res.json({
      ok: true,
      attempted: users.length,
      sent: sent.length,
      failed: fails.length,
      sampleSent: sent.slice(0, 5),
      sampleFailed: fails.slice(0, 5),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// enable alerts for all users + set default district if missing
router.post("/enable-alerts-for-all", async (req, res) => {
  try {
    const { district = "Colombo" } = req.body || {};

    const r1 = await User.updateMany({}, { $set: { alertsEnabled: true } });
    const r2 = await User.updateMany(
      { $or: [{ district: { $exists: false } }, { district: "" }] },
      { $set: { district } }
    );

    res.json({ ok: true, enabled: r1.modifiedCount, districtSet: r2.modifiedCount, district });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
