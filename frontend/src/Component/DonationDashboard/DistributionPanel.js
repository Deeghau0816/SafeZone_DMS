// frontend/src/Component/DonationDashboard/DistributionPanel.js
import React, { useEffect, useMemo, useState } from "react";
import Operation from "./Operation";
import EditOperation from "./editoperation";
import "./donationcss/donate_dashboard.css";
import DistributeQuantity from './distributequantity';
import DistributionQuantityChart from './distributionquantitychart';
import { useNavigate } from "react-router-dom";


const VOL_PHOTO_URL = "/volunteer.jpg"; // served from public/
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

/**
 * Extracts a clean area/place name from a Google Maps URL
 * @param {string} url - The maps URL or plain text location
 * @returns {string} - Clean location name
 */
function extractAreaNameFromUrl(url) {
  if (!url || typeof url !== 'string') return "";

  try {
    // If it's not a URL (no http/maps), return as-is
    if (!url.includes('maps') && !url.includes('http')) {
      return url.trim();
    }

    // Decode the URL first
    const decoded = decodeURIComponent(url);
    
    // Different Google Maps URL patterns:
    // 1. /maps/place/Location+Name/@lat,lng
    // 2. /maps/dir/.../Location+Name
    // 3. /maps/@lat,lng,zoom/data=...Location+Name
    // 4. /maps/search/Location+Name/@lat,lng
    
    let locationName = "";
    
    // Pattern 1: /place/LocationName
    const placeMatch = decoded.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      locationName = placeMatch[1];
    }
    
    // Pattern 2: Last part after final slash before @ or query params
    if (!locationName) {
      const parts = decoded.split('/');
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (part && !part.includes('@') && !part.includes('=') && 
            !part.includes('maps') && !part.includes('www') &&
            !part.includes('google') && !part.includes('http')) {
          // Skip coordinate-like parts
          if (!/^[\d\.,\-]+$/.test(part)) {
            locationName = part;
            break;
          }
        }
      }
    }
    
    // Pattern 3: Search query parameter
    if (!locationName) {
      const searchMatch = decoded.match(/\/search\/([^/@]+)/);
      if (searchMatch) {
        locationName = searchMatch[1];
      }
    }
    
    // Clean up the location name
    if (locationName) {
      return locationName
        .replace(/\+/g, ' ')           // Replace + with spaces
        .replace(/%20/g, ' ')          // Replace %20 with spaces
        .replace(/,$/, '')             // Remove trailing comma
        .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
        .trim();
    }
    
    // Fallback: return original input cleaned up
    return url.replace(/\+/g, ' ').trim();
    
  } catch (error) {
    console.warn('Failed to parse location URL:', error);
    return url.trim();
  }
}

/* =========================================================================
   TIMELINE — simple "pending" ↔ "done" with localStorage persistence
   ========================================================================= */
const TL_ORDER = [
  "teamAssigned",
  "vehicleLoaded",
  "enRoute",
  "checkpointVerified",
  "distributionStart",
  "returnReport",
];

const TL_LABELS = {
  teamAssigned: "Team assigned",
  vehicleLoaded: "Vehicle loaded",
  enRoute: "En route to sector 7",
  checkpointVerified: "Checkpoint verified",
  distributionStart: "Distribution start",
  returnReport: "Return & report",
};

// default state: all pending
const TL_DEFAULT = TL_ORDER.reduce((a, k) => ((a[k] = "pending"), a), {});
const TL_STORAGE_KEY = "opTimeline:v1";

const readTLStore = () => {
  try {
    const raw = localStorage.getItem(TL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeTLStore = (obj) => {
  try {
    localStorage.setItem(TL_STORAGE_KEY, JSON.stringify(obj || {}));
  } catch {}
};

const tlDotClass = (s) =>
  s === "done" ? "dot-done" : s === "warn" ? "dot-warn" : "dot-pending";

function OperationTimeline({ op, onChange }) {
  const [tl, setTl] = useState(TL_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Load from localStorage (fallback to op.timeline if present)
  useEffect(() => {
    const all = readTLStore();
    // use op._id if exists, otherwise fall back to name key
    const key = String(op?._id || op?.operationName || "unknown");
    const saved = all?.[key] || op?.timeline || TL_DEFAULT;
    const merged = { ...TL_DEFAULT, ...saved };
    setTl(merged);
  }, [op?._id, op?.operationName]);

  const toggle = async (key) => {
    const updated = { ...tl, [key]: tl[key] === "done" ? "pending" : "done" };

    // 1) Local persistence
    const all = readTLStore();
    const storeKey = String(op?._id || op?.operationName || "unknown");
    all[storeKey] = updated;
    writeTLStore(all);
    setTl(updated);
    onChange?.(updated);

    // 2) Best-effort server save
    if (!op?._id) return;
    try {
      setSaving(true);
      setErr("");
      const res = await fetch(`${API_BASE}/api/operations/${op._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: updated }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `Save failed (${res.status})`);
      }
    } catch (e) {
      setErr(e.message || "Failed to save to server (saved locally)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dist-timeline-card">
      <div className="dist-timeline-head">
        <div>
          <div className="dist-timeline-title">Timeline</div>
          <div className="dist-timeline-sub">
            Active operation:{" "}
            <span className="dist-timeline-op">{op?.operationName || "—"}</span>
          </div>
        </div>
      </div>

      <div className="dist-timeline-list">
        {TL_ORDER.map((key, idx) => (
          <div key={key} className="dist-timeline-step">
            <button
              className={`dist-timeline-dot ${tlDotClass(tl[key])}`}
              title={TL_LABELS[key]}
              aria-pressed={tl[key] === "done"}
              onClick={() => toggle(key)}
            />
            {idx < TL_ORDER.length - 1 && <div className="dist-timeline-line" />}
            <div className="dist-timeline-label">{TL_LABELS[key]}</div>
          </div>
        ))}
      </div>

      {saving && (
        <div className="dist-timeline-saving">
          <span className="dist-spinner" /> Saving…
        </div>
      )}
      {err && <div className="dist-timeline-error">⚠ {err}</div>}
    </div>
  );
}

/* =========================================================================
   MAP CARD — shows a map related to the active operation location
   ========================================================================= */
function MapCard({ location }) {
  return (
    <div className="dist-timeline-card" style={{ height: "100%" }}>
      <div className="dist-timeline-head">
        <div>
          <div className="dist-timeline-title">Distribution area Map</div>
          <div className="dist-timeline-sub">
            Location: <span className="dist-timeline-op">{location || "—"}</span>
          </div>
        </div>
      </div>

      {location ? (
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <iframe
            title="map"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(
              location
            )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
            style={{
              width: "100%",
              height: 300,
              border: 0,
            }}
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="dist-empty-panel">No location set for this operation.</div>
      )}
    </div>
  );
}

function VolunteerManagementCard({ activeOperation, assignedVols, loadingVols, volMatchesOperation }) {
  const [showAll, setShowAll] = useState(false);

  const activeOperationVolunteers = useMemo(() => {
    if (!activeOperation || !assignedVols) return [];
    return assignedVols.filter(vol => volMatchesOperation(vol, activeOperation));
  }, [activeOperation, assignedVols, volMatchesOperation]);

  const visibleVolunteers = showAll
    ? activeOperationVolunteers
    : activeOperationVolunteers.slice(0, 5);

  return (
    <div className="dist-vm-timeline-card">
      <div className="dist-vm-timeline-head">
        <div>
          <div className="dist-vm-timeline-title">Volunteers</div>
          <div className="dist-vm-timeline-sub">
            Active operation: <span className="dist-vm-timeline-op">{activeOperation?.operationName || "—"}</span>
          </div>
        </div>
      </div>

      {/* ✅ GRID: left = list, right = image */}
      <div className="dist-vm-card-body">
        {/* LEFT — list */}
        <div className="dist-vm-volunteer-list-container">
          {loadingVols ? (
            <div className="dist-vm-volunteer-loading">
              <div className="dist-vm-loading-spinner" />
              <span>Loading volunteers...</span>
            </div>
          ) : activeOperationVolunteers.length === 0 ? (
            <div className="dist-vm-volunteer-empty-state">
              <div className="dist-vm-empty-icon">👥</div>
              <h4>No volunteers assigned</h4>
              <p>This operation doesn't have any assigned volunteers yet.</p>
            </div>
          ) : (
            <>
              <div className="dist-vm-volunteer-count-display">
                {activeOperationVolunteers.length} VOLUNTEERS ASSIGNED
              </div>

              <div className="dist-vm-volunteer-names-list">
                {visibleVolunteers.map((volunteer, index) => {
                  const name = volunteer?.fullName || "—";
                  const volunteerType = volunteer?.volunteerType || "individual";
                  return (
                    <div key={volunteer?._id || index} className="dist-vm-volunteer-name-item">
                      <div className="dist-vm-volunteer-name-avatar">{name.charAt(0)}</div>
                      <div className="dist-vm-volunteer-name-details">
                        <div className="dist-vm-volunteer-name-text">{name}</div>
                        <div className="dist-vm-volunteer-name-type">
                          {volunteerType === "team" ? "Team Lead" : "Individual"}
                        </div>
                      </div>
                      <div className="dist-vm-volunteer-status-dot" />
                    </div>
                  );
                })}
              </div>

              {activeOperationVolunteers.length > 5 && (
                <div className="dist-vm-volunteer-see-more">
                  <br />
                  <button className="dist-vm-see-more-btn" onClick={() => setShowAll(!showAll)}>
                    {showAll ? "See Less" : `See More (${activeOperationVolunteers.length - 5})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT — image */}
        <div className="dist-vm-photo-wrap">
          <img
            className="dist-vm-side-photo"
            src={VOL_PHOTO_URL}
            alt="Volunteers"
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN PANEL
   ========================================================================= */
export default function DistributionPanel() {
    const navigate = useNavigate(); // ADD THIS LINE HERE

  const [operations, setOperations] = useState([]);
  const [assignedVols, setAssignedVols] = useState([]);

  const [loadingOps, setLoadingOps] = useState(true);
  const [loadingVols, setLoadingVols] = useState(true);
  const [err, setErr] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editOperation, setEditOperation] = useState(null);

  // expanded operation ids (for modal)
  const [expanded, setExpanded] = useState(() => new Set());
    const [showQuantityForm, setShowQuantityForm] = useState(false);



  /* ------------------ Loaders ------------------ */
  const loadOperations = async () => {
    setLoadingOps(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/operations`);
      if (!res.ok) throw new Error(`Load operations failed (${res.status})`);
      const data = await res.json();
      const operationsData = Array.isArray(data)
        ? data
        : data.data || data.items || data.operations || [];
      setOperations(operationsData);
    } catch (e) {
      setErr(e.message || "Failed to load operations");
      setOperations([]);
    } finally {
      setLoadingOps(false);
    }
  };

  const loadAssignedVolunteers = async () => {
    setLoadingVols(true);
    try {
      const url = new URL(`${API_BASE}/api/volunteer`);
      url.searchParams.set("assigned", "true");
      url.searchParams.set("limit", "500");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Load volunteers failed (${res.status})`);
      const j = await res.json();
      const items = j?.items || j || [];
      setAssignedVols(Array.isArray(items) ? items : []);
    } catch (e) {
      setErr(e.message || "Failed to load assigned volunteers");
      setAssignedVols([]);
    } finally {
      setLoadingVols(false);
    }
  };

  useEffect(() => {
    Promise.all([loadOperations(), loadAssignedVolunteers()]);
  }, []);

  /* ------------------ Helpers ------------------ */
  const volMatchesOperation = (vol, op) => {
    const opId = String(op?._id || "");
    const volOpId = String(vol?.operationId || "");
    if (opId && volOpId && opId === volOpId) return true;
    const opName = (op?.operationName || "").trim().toLowerCase();
    const assignedTo = (vol?.assignedTo || "").trim().toLowerCase();
    return !!(opName && assignedTo && opName === assignedTo);
  };

  const assignedCountByOperationId = useMemo(() => {
    const map = new Map();
    for (const op of operations) map.set(String(op?._id || ""), 0);
    for (const v of assignedVols) {
      const found = operations.find((op) => volMatchesOperation(v, op));
      if (found) {
        const opId = String(found._id);
        let countToAdd = 1;
        if (v?.volunteerType === "team" && v?.members) {
          countToAdd = Number(v.members) || 1;
        }
        map.set(opId, (map.get(opId) || 0) + countToAdd);
      }
    }
    return map;
  }, [operations, assignedVols]);

  const volsByOpId = useMemo(() => {
    const map = new Map();
    for (const op of operations) map.set(String(op._id), []);
    for (const v of assignedVols) {
      const found = operations.find((op) => volMatchesOperation(v, op));
      if (found) {
        const key = String(found._id);
        map.get(key).push(v);
      }
    }
    return map;
  }, [operations, assignedVols]);

  const activeOperation = useMemo(
  () =>
    operations.find(
      (o) => (o.status || "").toLowerCase() === "active"
    ) || null,
  [operations]
);

// To this:
const activeOperations = useMemo(
  () =>
    operations.filter(
      (o) => (o.status || "").toLowerCase() === "active"
    ),
  [operations]
);

  const applyTimelineToState = (opId, timeline) => {
    setOperations((prev) =>
      prev.map((o) =>
        String(o._id) === String(opId) ? { ...o, timeline } : o
      )
    );
  };

  /* ------------------ Handlers ------------------ */
  const handleCreate = async ({ operationName, volunteerCount, location }) => {
    // Extract clean location name from URL or keep as-is if plain text
    const cleanLocation = extractAreaNameFromUrl(location);

    const body = {
      operationName,
      volunteerCount: parseInt(volunteerCount, 10),
      ...(cleanLocation && { location: cleanLocation }),
    };
    
    const res = await fetch(`${API_BASE}/api/operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.message || "Create failed");
    }
    
    setShowCreate(false);
    await loadOperations();
  };

  const handleEdit = (operation) => {
    setEditOperation(operation);
    setShowEdit(true);
  };

  const handleUpdate = async ({
    id,
    operationName,
    volunteerCount,
    status,
    location,
  }) => {
    // Extract clean location name from URL or keep as-is if plain text
    const cleanLocation = extractAreaNameFromUrl(location);

    const body = {
      operationName,
      volunteerCount,
      status,
      ...(cleanLocation !== undefined && { location: cleanLocation }),
    };
    
    const res = await fetch(`${API_BASE}/api/operations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Update failed");
    }
    
    setShowEdit(false);
    setEditOperation(null);
    await Promise.all([loadOperations(), loadAssignedVolunteers()]);
  };

  const handleDelete = async (operationId, operationName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${operationName}"? This action cannot be undone.`
      )
    )
      return;
    try {
      const res = await fetch(`${API_BASE}/api/operations/${operationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Delete failed (${res.status})`);
      }
      await loadOperations();
    } catch (e) {
      setErr(e.message || "Failed to delete operation");
    }
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ------------------ Generate Report ------------------
  const handleGenerateReport = () => {
    if (!operations || operations.length === 0) {
      alert("No operations to include in the report.");
      return;
    }

    const headers = [
      "Operation Name",
      "Location",
      "Volunteers Needed",
      "Volunteers Assigned",
      "Remaining Volunteers",
      "Status",
      "Created At",
    ];

    const rows = operations.map((op) => {
      const assignedCount = assignedCountByOperationId.get(String(op._id)) || 0;
      const totalNeeded = Number(op.volunteerCount || 0);
      const remaining = Math.max(totalNeeded - assignedCount, 0);
      
      return [
        `"${op.operationName}"`,
        `"${op.location || ""}"`,
        totalNeeded,
        assignedCount,
        remaining,
        `"${op.status || "Pending"}"`,
        op.createdAt ? new Date(op.createdAt).toLocaleDateString() : "—",
      ];
    });

    let csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `operations_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  /* ------------------ UI ------------------ */
  return (
    <div className="distribution-component">
      <div className="dist-panel">
      {/* Header */}
      <div className="dist-header">
        <div className="dist-title-section">
          <h1 className="dist-title">Distribution Operations</h1>
          <p className="dist-subtitle">
            Manage field operations and volunteer needs
          </p>
        </div>

        {/* Action buttons side by side */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="dist-add-btn"
            onClick={() => setShowCreate(true)}
          >
            <span className="dist-add-icon">+</span> Add Operation
          </button>

          <button
            className="dist-report-btn"
            onClick={handleGenerateReport}
            disabled={operations.length === 0}
            style={{
              padding: "12px 20px",
              backgroundColor: operations.length === 0 ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: operations.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.2s ease",
            }}
            onMouseOver={(e) => {
              if (operations.length > 0) {
                e.target.style.backgroundColor = "#218838";
              }
            }}
            onMouseOut={(e) => {
              if (operations.length > 0) {
                e.target.style.backgroundColor = "#28a745";
              }
            }}
          >
            📑 Generate Report
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="dist-error">
          <div className="dist-error-content">
            <span className="dist-error-icon">⚠</span>
            {err}
          </div>
        </div>
      )}

      {/* ---------- Operations Table (first) ---------- */}
      <div className="dist-content">
        {loadingOps ? (
          <div className="dist-loading">
            <div className="dist-loading-spinner" />
            <span>Loading operations...</span>
          </div>
        ) : operations.length === 0 ? (
          <div className="dist-empty">
            <div className="dist-empty-icon">📋</div>
            <h3 className="dist-empty-title">No Operations Found</h3>
            <p className="dist-empty-subtitle">
              Get started by creating your first distribution operation
            </p>
            <button className="dist-empty-cta-btn" onClick={() => setShowCreate(true)}>
              Create Operation
            </button>
          </div>
        ) : (
          <div className="dist-table-container">
            <table className="dist-table">
              <thead className="dist-table-header">
                <tr>
                  <th className="dist-table-header-cell">Operation Name</th>
                  <th className="dist-table-header-cell">Location</th>
                  <th className="dist-table-header-cell">Required Volunteers</th>
                  <th className="dist-table-header-cell">Status</th>
                  <th className="dist-table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="dist-table-body">
                {operations.map((op) => {
                  const assignedCount =
                    assignedCountByOperationId.get(String(op._id)) || 0;
                  const totalNeeded = Number(op.volunteerCount || 0);
                  const remaining = Math.max(totalNeeded - assignedCount, 0);

                  return (
                    <tr key={op._id} className="dist-table-row">
                      <td className="dist-table-cell">
                        <div className="dist-operation-name">
                          <div className="dist-name-text">{op.operationName}</div>
                          <div className="dist-operation-meta">
                            Created:{" "}
                            {op.createdAt
                              ? new Date(op.createdAt).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                      </td>
                      <td className="dist-table-cell">
                        <div className="dist-location-info">
                          <div className="dist-location-text">
  {extractAreaNameFromUrl(op.location) || "—"}
</div>

                        </div>
                      </td>
                      <td className="dist-table-cell">
                        <div className="dist-volunteer-count">
                          <span className="dist-count-badge">{remaining}</span>
                          <span className="dist-count-text">
                            remaining{" "}
                            <span className="dist-muted dist-small">
                              (of {totalNeeded} — {assignedCount} assigned)
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="dist-table-cell">
                        <span
                          className={`dist-status-badge dist-status-${(
                            op.status || "pending"
                          ).toLowerCase()}`}
                        >
                          {op.status || "Pending"}
                        </span>
                      </td>
                      <td className="dist-table-cell">
                        <div className="dist-action-buttons">
                          <button
                            className="dist-action-btn dist-edit-btn"
                            onClick={() => handleEdit(op)}
                          >
                            <span className="dist-btn-icon">✏️</span> Edit
                          </button>
                          <button
                            className="dist-action-btn dist-delete-btn"
                            onClick={() =>
                              handleDelete(op._id, op.operationName)
                            }
                          >
                            <span className="dist-btn-icon">🗑️</span> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* ======= Operation Overview (second) ======= */}
      {!loadingOps && operations.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 className="dist-subtitle" style={{ marginBottom: 20 }}>
            Operation Overview
          </h2>

          <div className="dist-simple-operation-grid">
            {operations.map((op) => {
              const id = String(op._id);
              const assignedCount = assignedCountByOperationId.get(id) || 0;

              return (
                <div key={id} className="dist-simple-operation-card">
                  <h3 className="dist-simple-operation-name">{op.operationName}</h3>
                  {op.location && (
                   <p className="dist-simple-operation-location">
  {extractAreaNameFromUrl(op.location)}
</p>

                  )}
                  <button
                    className="dist-simple-view-btn"
                    onClick={() => toggleExpanded(id)}
                  >
                    View Volunteers ({assignedCount})
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======= Timeline, Map & Volunteer Management Row (third) ======= */}
      {activeOperation && (
        <div style={{ marginBottom: 24 }}>
          {/* Timeline and Map Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(340px, 420px) 1fr",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <OperationTimeline
              op={activeOperation}
              onChange={(tl) => applyTimelineToState(activeOperation._id, tl)}
            />
            <MapCard location={activeOperation.location} />
          </div>
          
          {/* Volunteer Management Row */}
          <VolunteerManagementCard
            activeOperation={activeOperation}
            assignedVols={assignedVols}
            loadingVols={loadingVols}
            volMatchesOperation={volMatchesOperation}
          />
        </div>
      )}

        {/* ---------- Volunteer Details Modal ---------- */}
        {expanded.size > 0 && (
          <div
            className="dist-volunteer-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setExpanded(new Set());
              }
            }}
          >
            <div className="dist-volunteer-modal-container">
              <div className="dist-volunteer-modal-header">
                <h2 className="dist-volunteer-modal-title">Assigned Volunteers</h2>
                <button
                  className="dist-volunteer-modal-close"
                  onClick={() => setExpanded(new Set())}
                >
                  ✕
                </button>
              </div>

              <div className="dist-volunteer-modal-content">
                {Array.from(expanded).map((opId) => {
                  const operation = operations.find(
                    (op) => String(op._id) === opId
                  );
                  const opVols = volsByOpId.get(opId) || [];

                  if (!operation) return null;

                  return (
                    <div key={opId} className="dist-volunteer-operation-section">
                      <div className="dist-volunteer-operation-header">
                        <div>
                          <h3 className="dist-volunteer-operation-name">
                            {operation.operationName}
                          </h3>
                          {operation.location && (
                            <p className="dist-volunteer-operation-location">
                              {operation.location}
                            </p>
                          )}
                        </div>
                        <span
                          className={`dist-status-badge dist-status-${(
                            operation.status || "pending"
                          ).toLowerCase()}`}
                        >
                          {operation.status || "Pending"}
                        </span>
                      </div>

                      {loadingVols ? (
                        <div className="dist-volunteer-loading">
                          <div className="dist-loading-spinner" />
                          <span>Loading volunteers...</span>
                        </div>
                      ) : opVols.length === 0 ? (
                        <div className="dist-volunteer-empty-state">
                          <div className="dist-empty-icon">👥</div>
                          <h4>No volunteers assigned</h4>
                          <p>
                            This operation doesn't have any assigned volunteers yet.
                          </p>
                        </div>
                      ) : (
                        <div className="dist-volunteer-cards-grid">
                          {opVols.map((volunteer) => {
                            const team =
                              volunteer?.group ||
                              (volunteer?.volunteerType === "team"
                                ? volunteer?.fullName
                                : "") ||
                              "Individual";
                            const name =
                              volunteer?.volunteerType === "team"
                                ? volunteer?.fullName
                                : volunteer?.fullName || "—";
                            const contact =
                              volunteer?.phone || volunteer?.whatsapp || "";
                            const volunteerType =
                              volunteer?.volunteerType || "individual";

                            return (
                              <div key={volunteer?._id} className="dist-volunteer-card">
                                <div className="dist-volunteer-card-header">
                                  <div className="dist-volunteer-info">
                                    <h4 className="dist-volunteer-name">{name}</h4>
                                    <span
                                      className={`dist-volunteer-type-badge ${volunteerType}`}
                                    >
                                      {volunteerType === "team"
                                        ? "Team Lead"
                                        : "Individual"}
                                    </span>
                                  </div>
                                </div>

                                <div className="dist-volunteer-card-body">
                                  <div className="dist-volunteer-detail">
                                    <span className="dist-detail-label">
                                      Team/Group:
                                    </span>
                                    <span className="dist-detail-value">{team}</span>
                                  </div>

                                  {contact && (
                                    <div className="dist-volunteer-detail">
                                      <span className="dist-detail-label">
                                        Contact:
                                      </span>
                                      <a
                                        href={`tel:${contact.replace(/\s+/g, "")}`}
                                        className="dist-contact-link"
                                      >
                                        {contact}
                                      </a>
                                    </div>
                                  )}

                                  {volunteer?.assignedDate && (
                                    <div className="dist-volunteer-detail">
                                      <span className="dist-detail-label">
                                        Assigned:
                                      </span>
                                      <span className="dist-detail-value">
                                        {new Date(
                                          volunteer.assignedDate
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {contact && (
                                  <div className="dist-volunteer-card-actions">
                                    <a
                                      href={`tel:${contact.replace(/\s+/g, "")}`}
                                      className="dist-contact-btn"
                                    >
                                      📞 Call
                                    </a>
                                    <a
                                      href={`https://wa.me/${contact.replace(
                                        /\D/g,
                                        ""
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="dist-whatsapp-btn"
                                    >
                                      💬 WhatsApp
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Operation onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}

      {/* Edit Modal */}
      {showEdit && editOperation && (
        <EditOperation
          operation={editOperation}
          onClose={() => setShowEdit(false)}
          onSubmit={handleUpdate}
        />
      )}

      {/* NEW: Distribution Quantity Button at bottom */}
    <div className="dist-quantity-section">
  <button
    className="dist-quantity-btn"
    onClick={() => setShowQuantityForm(true)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
      color: 'white',
      boxShadow: '0 8px 16px rgba(30, 64, 175, 0.3)',
      fontSize: '16px'
    }}
    onMouseEnter={(e) => {
      e.target.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)';
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 12px 24px rgba(30, 64, 175, 0.4)';
    }}
    onMouseLeave={(e) => {
      e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 8px 16px rgba(30, 64, 175, 0.3)';
    }}
  >
    📊 Today Distribution quantity
  </button>

 <button
  className="dist-quantity-btn"
  onClick={() => navigate("/dashboard/distribution-quantity-chart")}
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    color: 'white',
    boxShadow: '0 8px 16px rgba(30, 64, 175, 0.3)',
    fontSize: '16px'
  }}
  onMouseEnter={(e) => {
    e.target.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)';
    e.target.style.transform = 'translateY(-2px)';
    e.target.style.boxShadow = '0 12px 24px rgba(30, 64, 175, 0.4)';
  }}
  onMouseLeave={(e) => {
    e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = '0 8px 16px rgba(30, 64, 175, 0.3)';
  }}
>
  📈 See Distribution Quantity Records
</button>
</div>

{/* Distribution Quantity Modal/Component */}
{showQuantityForm && (
  <DistributeQuantity 
    onClose={() => setShowQuantityForm(false)}
  />
)}
      </div>
    </div>
    
  );
}