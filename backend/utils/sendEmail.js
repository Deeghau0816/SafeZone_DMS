// BackEnd/utils/sendEmail.js
const nodemailer = require("nodemailer");

const asBool = (v, d = false) =>
  v === undefined || v === null || v === "" ? d : String(v).toLowerCase() === "true";
const asNum = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

let transporter; // singleton
function buildTransport() {
  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_DEBUG, // set to "true" only when you want verbose logs
  } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("SMTP USER/PASS not set");
  }

  const base = EMAIL_HOST
    ? {
        host: EMAIL_HOST,                // e.g. smtp.gmail.com
        port: asNum(EMAIL_PORT, 587),
        secure: asBool(EMAIL_SECURE, false),
      }
    : {
        service: EMAIL_SERVICE || "gmail",
      };

  // Quiet by default; only enable when EMAIL_DEBUG=true
  return nodemailer.createTransport({
    ...base,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    // Reuse the connection(s) to reduce chatter
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    logger: asBool(EMAIL_DEBUG, false),
    debug: asBool(EMAIL_DEBUG, false),
  });
}

function getTransporter() {
  if (!transporter) transporter = buildTransport();
  return transporter;
}

async function sendEmail(to, subject, body) {
  if (asBool(process.env.SKIP_EMAIL, false)) {
    console.log(`[sendEmail] SKIPPED\nTo: ${to}\nSubject: ${subject}`);
    return { skipped: true };
  }

  const tx = getTransporter();
  // Optionally verify once at startup; not needed every send
  // await tx.verify();

  const from = process.env.SMTP_FROM || process.env.EMAIL_USER || "no-reply@example.com";
  const isUrl = typeof body === "string" && /^https?:\/\//i.test(body);

  const info = await tx.sendMail({
    from,
    to,
    subject,
    text: isUrl ? body : undefined,
    html: isUrl ? undefined : body,
  });

  // keep a single concise line
  console.log(`[sendEmail] Sent ${info.messageId} -> ${to}`);
  return { messageId: info.messageId };
}

module.exports = sendEmail;
