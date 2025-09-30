// src/Component/VictimDashboard/ReportDisaster/Read.js

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RD_Read.css";

/** Build full URL for uploaded files */
function toUrl(x) {
  if (!x) return null;
  if (typeof x === "string" && /^https?:\/\//i.test(x)) return x;
  if (x.url && /^https?:\/\//i.test(x.url)) return x.url;
  return x.filename ? `http://localhost:5000/uploads/${x.filename}` : null;
}

/** Media tile component for displaying images, videos, and documents */
function MediaTile({ file }) {
  const url = toUrl(file);
  if (!url) return null;
  const type = file.mimetype || url;

  // Render image files
  if (/image/i.test(type)) {
    return (
      <a className="gal-thumb" href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="file" />
      </a>
    );
  }
  
  // Render video files
  if (/video/i.test(type)) {
    return (
      <div className="gal-thumb">
        <video src={url} controls />
      </div>
    );
  }
  
  // Render document files
  return (
    <a className="gal-doc" href={url} target="_blank" rel="noreferrer">
      📄 {file.filename || "file"}
    </a>
  );
}

/** Row helper component for displaying key-value pairs */
function Row({ label, children }) {
  return (
    <div className="r-row">
      <span className="r-key">{label}</span>
      <span className="r-val">{children}</span>
    </div>
  );
}

/** Normalize coordinates from GeoJSON or plain lat/lng format */
function normalizeCoords(victim) {
  if (victim?.location?.type === "Point" && Array.isArray(victim.location.coordinates)) {
    return {
      lat: Number(victim.location.coordinates[1]),
      lng: Number(victim.location.coordinates[0]),
    };
  }
  const lat = victim?.lat != null ? Number(victim.lat) : null;
  const lng = victim?.lng != null ? Number(victim.lng) : null;
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

/** Format date safely with fallback */
function fmt(dt) {
  try {
    if (!dt) return "—";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

export default function Read({ victim, onDelete }) {
  const navigate = useNavigate();
  
  // Use victim ID to create unique localStorage key
  const vid = victim?._id || victim?.id;
  const storageKey = `report_viewed_${vid}`;
  
  // Initialize state from localStorage
  const [isViewed, setIsViewed] = React.useState(() => {
    return localStorage.getItem(storageKey) === 'true';
  });
  
  if (!victim) return null;

  // Extract victim data with fallbacks
  const {
    _id,
    id,
    name,
    victimName,
    nic,
    email,
    phone,
    address,
    description,
    status,
    Status,
    disasterType,
    occurredAt,
    createdAt,
    date,           // legacy fallback
    locationStr,    // human-readable from form
    media = [],
  } = victim;

  // Use ID with fallback (already defined above)
  const displayName = name || victimName || "—";
  const rawStatus = (status || Status || "Medium").toString();

  // Determine badge color based on status
  let badge = "warn";
  const s = rawStatus.toLowerCase();
  if (/(high)/.test(s) || /(reject|rejected|deny|denied)/.test(s)) badge = "bad";
  else if (/(low|approve|approved|ok|resolved)/.test(s)) badge = "ok";

  // Get coordinates and create map source
  const coords = normalizeCoords(victim);
  const mapSrc = coords
    ? `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=14&output=embed`
    : null;

  // Format dates
  const occurredAtStr = fmt(occurredAt || null);
  const reportedAtStr = fmt(createdAt || date || null);

  return (
    <article className="r-card">
      {/* Card header with name, ID, and actions */}
      <header className="r-head">
        <div>
          <h3 className="r-title">{displayName}</h3>
          <div className="r-sub">#{vid}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="r-btn ghost" onClick={() => navigate("/victim/reports")}>
            Back
          </button>
          <span className={`r-badge ${badge}`}>{rawStatus}</span>
        </div>
      </header>

      <section className="r-body">
        {/* Left side: Report details */}
        <div className="r-left">
          <section className="r-info">
            <Row label="NIC">{nic ?? "—"}</Row>
            <Row label="Phone">{phone ?? "—"}</Row>
            <Row label="Email">{email ?? "—"}</Row>
            <Row label="Disaster Type">{disasterType ?? "—"}</Row>
            <Row label="Status">{rawStatus}</Row>
            <Row label="Home Address">{address ?? "—"}</Row>
            <Row label="Occurred At">{occurredAtStr}</Row>
            <Row label="Reported At">{reportedAtStr}</Row>
            {coords ? (
              <Row label="Current Location">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                {locationStr ? <> &nbsp;(<em>{locationStr}</em>)</> : null}
              </Row>
            ) : (
              <Row label="Current Location">—</Row>
            )}
            <Row label="Description">{description ?? "—"}</Row>
          </section>

          {/* Action buttons */}
          <footer className="r-actions">
            <button 
              className={`r-btn ${isViewed ? 'viewed' : 'view'}`} 
              onClick={() => {
                alert("Report is viewing");
                setIsViewed(true);
                localStorage.setItem(storageKey, 'true');
              }}
            >
              {isViewed ? 'Viewed' : 'View'}
            </button>
            <Link to={`/victim/report/${vid}/edit`} className="r-btn edit" target="_blank">
              Edit
            </Link>
            <button className="r-btn danger" onClick={() => onDelete(vid)}>
              Delete
            </button>
          </footer>
        </div>

        {/* Right side: Map and media gallery */}
        <div className="r-right">
          {/* Embedded map */}
          <div className="r-map">
            {mapSrc ? (
              <iframe title={`map-${vid}`} src={mapSrc} />
            ) : (
              <div className="r-map-empty">No location</div>
            )}
          </div>
          
          {/* Media attachments gallery */}
          <aside className="r-gallery">
            {media.length === 0 ? (
              <div className="gal-empty">No files</div>
            ) : (
              media.map((m, i) => <MediaTile key={m.url || m.filename || i} file={m} />)
            )}
          </aside>
        </div>
      </section>
    </article>
  );
}
