// Services/openweather.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require("crypto");

const KEY = process.env.OPENWEATHER_KEY || "b9ccd544efb7777665a91f8fd02c6656";
if (!KEY) throw new Error("OPENWEATHER_KEY missing");

const hash = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);

/**
 * FREE PLAN:
 * - current weather:   /data/2.5/weather
 * - 5-day/3-hour fcst: /data/2.5/forecast
 * We compute threshold-based alerts from these.
 */

async function getCurrent({ lat, lon }) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather current ${res.status}`);
  return res.json();
}

async function getForecast5({ lat, lon }) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather forecast ${res.status}`);
  return res.json(); // { list: [... 3h steps ...] }
}

/**
 * Thresholds (tune as you like):
 * - Heavy rain: sum rain.3h >= 10 mm over next 6h
 * - Wind:      max wind.speed >= 12 m/s (~43 km/h) next 6h
 * - Heat:      current feels_like >= 36°C OR next 24h max temp >= 36°C
 */
function extractAlertsFromFreeEndpoints({ current, forecast }) {
  const alerts = [];

  const steps = forecast.list || [];
  const next6 = steps.slice(0, 2);       // ~6 hours (two 3h blocks)
  const next24 = steps.slice(0, 8);      // ~24 hours

  // Rain
  const totalRain6h = next6.reduce((s, x) => s + (x.rain?.["3h"] || 0), 0);
  if (totalRain6h >= 10) {
    alerts.push({
      source: "SafeZone Threshold",
      event: "Heavy Rain Risk",
      start: new Date().toISOString(),
      end: null,
      description: `Forecast indicates ~${Math.round(totalRain6h)}mm rain in the next 6 hours.`,
      severity: "warning",
      hash: hash(`rain|${Math.round(totalRain6h)}`),
    });
  }

  // Wind
  const maxWind6h = Math.max(...next6.map(x => x.wind?.speed || 0), 0);
  if (maxWind6h >= 12) {
    alerts.push({
      source: "SafeZone Threshold",
      event: "Strong Wind Risk",
      start: new Date().toISOString(),
      end: null,
      description: `Wind up to ~${Math.round(maxWind6h)} m/s expected within 6 hours.`,
      severity: "warning",
      hash: hash(`wind|${Math.round(maxWind6h)}`),
    });
  }

  // Heat
  const feelsNow = current?.main?.feels_like;
  const maxTemp24h = Math.max(...next24.map(b => (b.main?.temp_max ?? -Infinity)));
  const maxFeels = Math.max(feelsNow ?? -Infinity, maxTemp24h);

  if (Number.isFinite(maxFeels) && maxFeels >= 36) {
    alerts.push({
      source: "SafeZone Threshold",
      event: "High Heat Risk",
      start: new Date().toISOString(),
      end: null,
      description: `Feels-like/Max temperature may reach ~${Math.round(maxFeels)}°C within 24 hours.`,
      severity: "advisory",
      hash: hash(`heat|${Math.round(maxFeels)}`),
    });
  }

  return alerts;
}

async function getAlertsForLatLon({ lat, lon }) {
  const [current, forecast] = await Promise.all([
    getCurrent({ lat, lon }),
    getForecast5({ lat, lon }),
  ]);
  const alerts = extractAlertsFromFreeEndpoints({ current, forecast });
  return { current, forecast, alerts };
}

module.exports = {
  getCurrent,
  getForecast5,
  getAlertsForLatLon,
  extractAlertsFromFreeEndpoints,
};
