// Controllers/AlertReportController.js
const PDFDocument = require("pdfkit");
const Alert = require("../models/AlertModels"); // <-- adjust the path/name if needed

// If your field is "level" (e.g., "RED"/"GREEN"), set this to "level".
const SEVERITY_FIELD = "severity";

function endOfDay(s) {
  const d = new Date(s);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildQuery({ from, to, severity = "all", district = "all" }) {
  const q = {};

  // severity: all | red | green
  const sev = String(severity).toLowerCase();
  if (sev === "red")   q[SEVERITY_FIELD] = /red/i;
  if (sev === "green") q[SEVERITY_FIELD] = /green/i;

  // district: all | <name>
  if (district && String(district).toLowerCase() !== "all") {
    // exact (case-insensitive)
    q.district = new RegExp(`^${String(district).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }

  // date range
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to)   q.createdAt.$lte = endOfDay(to);
  }

  return q;
}

/** GET /alerts/report?from=&to=&severity=all|green|red&district=all|<name> */
async function list(req, res) {
  try {
    const { from, to, severity = "all", district = "all" } = req.query;
    const q = buildQuery({ from, to, severity, district });

    const items = await Alert.find(q).sort({ createdAt: -1 }).lean();

    const total = items.length;
    const red   = items.filter(a => String(a[SEVERITY_FIELD]).toLowerCase() === "red").length;
    const green = items.filter(a => String(a[SEVERITY_FIELD]).toLowerCase() === "green").length;

    res.json({ ok: true, items, total, red, green, filters: { from, to, severity, district } });
  } catch (err) {
    console.error("[AlertReportController.list]", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
}

/** GET /alerts/report/pdf?from=&to=&severity=all|green|red&district=all|<name> */
async function pdf(req, res) {
  try {
    const { from, to, severity = "all", district = "all" } = req.query;
    const q = buildQuery({ from, to, severity, district });

    const items = await Alert.find(q).sort({ createdAt: -1 }).lean();

    // counts
    const total = items.length;
    const red   = items.filter(a => String(a[SEVERITY_FIELD]).toLowerCase() === "red").length;
    const green = items.filter(a => String(a[SEVERITY_FIELD]).toLowerCase() === "green").length;

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const filename = `alerts_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Alert Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown();

    // Filters
    doc.fontSize(12).text("Filters", { underline: true });
    doc.fontSize(10)
      .text(`Date range: ${from || "—"} → ${to || "—"}`)
      .text(`Severity: ${severity}`)
      .text(`District: ${district}`);
    doc.moveDown();

    // Metrics
    doc.fontSize(12).text("Metrics", { underline: true });
    doc.fontSize(10)
      .text(`Total: ${total}`)
      .text(`Red: ${red}`)
      .text(`Green: ${green}`);
    doc.moveDown();

    // Table header
    doc.fontSize(12).text("Alerts", { underline: true });
    doc.moveDown(0.5);

    const col = { date: 40, sev: 170, dist: 250, title: 340 };
    doc.fontSize(10).text("Date/Time", col.date)
       .text("Severity", col.sev)
       .text("District", col.dist)
       .text("Title / Description", col.title);
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
    doc.moveDown(0.4);

    // Rows
    items.forEach((a) => {
      const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString() : "—";
      const sevStr  = a[SEVERITY_FIELD] ? String(a[SEVERITY_FIELD]).toUpperCase() : "—";
      const distStr = a.district || "—";
      const title   = a.title || a.name || a.description || "—";

      doc.text(dateStr, col.date)
         .text(sevStr, col.sev)
         .text(distStr, col.dist)
         .text(title, col.title, { width: 555 - col.title });
      doc.moveDown(0.25);
    });

    doc.end();
  } catch (err) {
    console.error("[AlertReportController.pdf]", err);
    res.status(500).json({ ok: false, message: "Failed to generate PDF" });
  }
}

module.exports = { list, pdf };
