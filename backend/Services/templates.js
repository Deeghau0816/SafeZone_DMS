function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * ONE alert email body
 */
function alertEmailHTML(a = {}) {
  const level = esc((a.level || a.alertType || "INFO").toString().toUpperCase());
  const title = esc(a.title || a.topic || "Alert");
  const district = esc(a.district || "All Districts");
  const location = esc(a.disLocation || "");
  const admin = esc(a.adminName || "System Admin");
  const time = a.createdAt ? new Date(a.createdAt).toLocaleString() : "";
  const msg = (a.message || "").split("\n").map(esc).join("<br/>");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <div style="max-width:660px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb">
        <div style="font-size:12px;letter-spacing:.08em;color:#6b7280">SAFEZONE ALERT</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px">${title}</div>
      </div>

      <div style="padding:18px">
        <p style="margin:0 0 8px 0"><b>Level:</b> ${level}</p>
        <p style="margin:0 0 8px 0"><b>District:</b> ${district}</p>
        ${location ? `<p style="margin:0 0 8px 0"><b>Location:</b> ${location}</p>` : ""}

        <div style="margin:12px 0;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff">
          ${msg || "<i>No message provided.</i>"}
        </div>

        <p style="margin:14px 0 0 0;color:#64748b">
          Sent by <b>${admin}</b>${time ? ` · <span>${esc(time)}</span>` : ""}
        </p>
      </div>

      <div style="padding:12px 18px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
        You are receiving this email because alerts are enabled in SafeZone.
      </div>
    </div>
  </div>`;
}

function countryDigestHTML({ title = "Sri Lanka Weather Update", items = [] } = {}) {
  const section = (items || []).map(({ district, alerts = [] }) => {
    const list = alerts.map(a => `
      <li style="margin:0 0 8px 0">
        <strong>${esc(a.event || "Alert")}</strong> — <em>${esc(a.source || "")}</em><br/>
        <span>${esc(a.description || "").replace(/\n/g, "<br/>")}</span>
        ${a.start ? `<div>Start: ${new Date(a.start).toLocaleString()}</div>` : ""}
        ${a.end   ? `<div>End: ${new Date(a.end).toLocaleString()}</div>` : ""}
      </li>
    `).join("");

    return `
      <div style="margin:0 0 18px 0">
        <h3 style="margin:0 0 8px 0">${esc(district || "Unknown")}</h3>
        <ul style="padding-left:18px;margin:0">${list}</ul>
      </div>`;
  }).join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <div style="max-width:660px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb">
        <div style="font-size:20px;font-weight:700">${esc(title)}</div>
      </div>
      <div style="padding:18px">
        ${items?.length ? section : "<p>No active alerts detected across Sri Lanka.</p>"}
      </div>
      <div style="padding:12px 18px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
        You are receiving this email because alerts are enabled in SafeZone.
      </div>
    </div>
  </div>`;
}

module.exports = { alertEmailHTML, countryDigestHTML };
