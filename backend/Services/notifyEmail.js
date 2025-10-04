const sendEmail = require("../utils/sendEmail");
const { alertEmailHTML } = require("./templates");

/**
 * Compose subject line
 */
function subjectFor(a) {
  const where = a.district || "All Districts";
  const level = (a.alertType || a.level || "INFO").toUpperCase();
  const title = a.topic || a.title || "Alert";
  return `[SafeZone] ${level} — ${title} (${where})`;
}

/**
 * Send one alert to many recipients
 */
async function sendAlertEmail(toList, alertDoc) {
  const emails = (toList || []).filter(Boolean);
  if (!emails.length) return;

  const subject = subjectFor(alertDoc);
  const html = alertEmailHTML(alertDoc);

  // Parallel best-effort send
  await Promise.allSettled(
    emails.map((to) => sendEmail(to, subject, html))  // ✅ matches sendEmail signature
  );

  console.log(`[sendAlertEmail] attempted ${emails.length} recipients`);
}

module.exports = { sendAlertEmail, subjectFor };
