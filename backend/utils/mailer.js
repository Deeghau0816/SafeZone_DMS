// utils/mailer.js
const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: String(SMTP_SECURE || "false").toLowerCase() === "true",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

async function verify() {
  try {
    await transporter.verify();
    console.log(`[mailer] ✅ SMTP ready: ${SMTP_HOST}:${SMTP_PORT}`);
  } catch (err) {
    console.error("[mailer] ❌ SMTP verify failed:", err.message);
  }
}

async function sendEmail({ to, bcc, subject, html, text }) {
  try {
    const safeSubject = subject || "SafeZone Alert";
    const safeHtml =
      typeof html === "string" && html.trim()
        ? html
        : `<p>${text || "SafeZone alert notification."}</p>`;

    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      bcc,
      subject: safeSubject,
      html: safeHtml,
      text: safeHtml.replace(/<[^>]+>/g, " "),
    });

    return true;
  } catch (err) {
    console.error("[mailer] sendEmail error:", err.message);
    throw err;
  }
}

module.exports = { verify, sendEmail };
