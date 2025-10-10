// Jobs/weatherSriLankaBroadcastCron.js
console.log("[weatherLKA] module loaded");

const cron = require("node-cron");
const crypto = require("crypto");

const User = require("../models/RegModel");
const SystemState = require("../models/SystemState");
const sendEmail = require("../utils/sendEmail");
const { getAlertsForLatLon } = require("../Services/openweather");
const { countryDigestHTML } = require("../Services/templates");

// ---- Configs / Flags --------------------------------------------------------
const KEY = "LKA_COUNTRY_ALERT_HASH";
const TZ = process.env.LKA_TZ || "Asia/Colombo"; // schedule in Sri Lanka time
const ALWAYS_EMAIL_NO_ALERTS = process.env.LKA_ALWAYS_EMAIL_NO_ALERTS === "true";

// ✅ Synthetic heat alerts ON by default (no .env needed)
const SYNTHETIC_HEAT = true;
const HEAT_FEELS_LIKE_C = 36; // threshold in °C for “High Heat Risk”

if (!process.env.OPENWEATHER_KEY) {
  console.warn("[weatherLKA] Warning: OPENWEATHER_KEY missing");
}

// 25 districts (representative lat/lon)
const DISTRICT_LL = {
  Ampara:{lat:7.3018,lon:81.6747}, Anuradhapura:{lat:8.3114,lon:80.4037},
  Badulla:{lat:6.9934,lon:81.0550}, Batticaloa:{lat:7.7300,lon:81.6924},
  Colombo:{lat:6.9271,lon:79.8612}, Galle:{lat:6.0535,lon:80.2210},
  Gampaha:{lat:7.0897,lon:79.9994}, Hambantota:{lat:6.1246,lon:81.1185},
  Jaffna:{lat:9.6615,lon:80.0255}, Kalutara:{lat:6.5854,lon:79.9607},
  Kandy:{lat:7.2906,lon:80.6337}, Kegalle:{lat:7.2513,lon:80.3464},
  Kilinochchi:{lat:9.3803,lon:80.3773}, Kurunegala:{lat:7.4863,lon:80.3623},
  Mannar:{lat:8.9778,lon:79.9044}, Matale:{lat:7.4675,lon:80.6234},
  Matara:{lat:5.9549,lon:80.5550}, Monaragala:{lat:6.8721,lon:81.3509},
  Mullaitivu:{lat:9.2671,lon:80.8128}, "Nuwara Eliya":{lat:6.9497,lon:80.7891},
  Polonnaruwa:{lat:7.9403,lon:81.0188}, Puttalam:{lat:8.0408,lon:79.8391},
  Ratnapura:{lat:6.7056,lon:80.3847}, Trincomalee:{lat:8.5874,lon:81.2152},
  Vavuniya:{lat:8.7542,lon:80.4989}
};

// ---- Helpers ----------------------------------------------------------------
const hash = (obj) =>
  crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 16);

const isValidEmail = (s) =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// ❄️ minimal hourly forecast peek (next 24h) for max feels_like °C
async function getMaxFeelsLike24h({ lat, lon }) {
  const KEY = process.env.OPENWEATHER_KEY;
  if (!KEY) return null;
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&units=metric&appid=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`onecall ${r.status}`);
  const data = await r.json();
  const hours = Array.isArray(data.hourly) ? data.hourly.slice(0, 24) : [];
  let max = null;
  for (const h of hours) {
    const v = (h && typeof h.feels_like === "number") ? h.feels_like : null;
    if (v !== null) max = max === null ? v : Math.max(max, v);
  }
  return max;
}

// Build national digest (official + synthetic heat)
async function scanSriLanka() {
  const digest = [];

  for (const [district, { lat, lon }] of Object.entries(DISTRICT_LL)) {
    const combined = [];

    try {
      // 1) Official OpenWeather “alerts” (if any)
      const { alerts } = await getAlertsForLatLon({ lat, lon });
      if (Array.isArray(alerts) && alerts.length) {
        combined.push(
          ...alerts.map(a => ({
            source: a.source,
            event: a.event,
            description: a.description,
            severity: a.severity
          }))
        );
      }
    } catch (e) {
      console.error(`[weatherLKA] official alerts error ${district}:`, e.message);
    }

    // 2) Synthetic heat risk (threshold on hourly feels_like)
    if (SYNTHETIC_HEAT) {
      try {
        const maxFeels = await getMaxFeelsLike24h({ lat, lon });
        if (maxFeels !== null && maxFeels >= HEAT_FEELS_LIKE_C) {
          combined.push({
            source: "SafeZone Threshold",
            event: "High Heat Risk",
            description: `Feels-like/Max temperature may reach ~${Math.round(maxFeels)}°C within 24 hours.`,
            severity: "red"
          });
        }
      } catch (e) {
        console.error(`[weatherLKA] synthetic heat error ${district}:`, e.message);
      }
    }

    if (combined.length) {
      digest.push({ district, alerts: combined });
    }
  }

  // stable order for hashing
  digest.sort((a, b) => a.district.localeCompare(b.district));
  return { digest, countryHash: hash(digest) };
}

// ⬇️ Accepts { force } to send even if no state change
async function runBroadcastCycle({ force = false } = {}) {
  console.log("[weatherLKA] broadcast cycle start");

  const { digest, countryHash } = await scanSriLanka();
  console.log(`[weatherLKA] districts with alerts: ${digest.length}`);
  console.log(`[weatherLKA] country hash: ${countryHash}`);

  const state = await SystemState.findOne({ key: KEY });
  const lastHash = state?.value?.hash || "";

  if (!force && countryHash === lastHash) {
    console.log("[weatherLKA] no change -> skip broadcast");
    return;
  }

  // Update stored state (even if empty)
  await SystemState.findOneAndUpdate(
    { key: KEY },
    { $set: { value: { hash: countryHash, at: new Date().toISOString(), digest } } },
    { upsert: true }
  );

  // If there are no alerts, only proceed when forced or env flag says to
  if (!digest.length && !force && !ALWAYS_EMAIL_NO_ALERTS) {
    console.log("[weatherLKA] no active alerts; not emailing (by design). Set LKA_ALWAYS_EMAIL_NO_ALERTS=true or use force.");
    return;
  }

  // Build digest email
  const html = countryDigestHTML({
    title: force ? "⚠️ Sri Lanka Weather Alerts (Forced Update)" : "⚠️ Sri Lanka Weather Alerts Update",
    items: digest
  });

  // Send to ALL users (with valid emails)
  const usersRaw = await User.find({}, { email: 1, firstName: 1 }).lean();
  const users = usersRaw.filter(u => isValidEmail(u.email));
  const invalid = usersRaw.length - users.length;
  console.log(`[weatherLKA] recipients discovered: ${usersRaw.length}, valid: ${users.length}, invalid: ${invalid}`);

  let sent = 0, failed = 0;
  for (const u of users) {
    try {
      await sendEmail(u.email, "⚠️ Sri Lanka Weather Alerts Update", html);
      console.log(`[weatherLKA] sent -> ${u.email}`);
      sent++;
    } catch (e) {
      console.error("[weatherLKA] send error:", u.email, e.message);
      failed++;
    }
  }

  console.log("[weatherLKA] broadcast cycle end", { sent, failed });
}

function startSriLankaBroadcastCron() {
  console.log("[weatherLKA] scheduler starting (*/30 * * * *)");
  cron.schedule(
    "*/30 * * * *",
    () => {
      console.log("[weatherLKA] cron tick");
      runBroadcastCycle().catch(err => console.error("[weatherLKA] run error:", err));
    },
    { timezone: TZ } // ✅ run on Sri Lanka time
  );

  // also run once on boot
  runBroadcastCycle().catch(err => console.error("[weatherLKA] initial run error:", err));
}

// expose helpers for routes
async function forceBroadcastOnce() {
  return runBroadcastCycle({ force: true });
}
async function clearCountryState() {
  await SystemState.deleteOne({ key: KEY });
  console.log("[weatherLKA] state cleared");
}

module.exports = {
  startSriLankaBroadcastCron,
  __runOnceLKA: runBroadcastCycle,
  __forceBroadcastOnce: forceBroadcastOnce,
  __clearCountryState: clearCountryState
};
