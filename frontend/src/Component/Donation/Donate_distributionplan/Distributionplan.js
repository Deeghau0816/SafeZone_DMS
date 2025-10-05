// frontend/src/Component/Donation/Donate_distributionplan/Distributionplan.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom"; // Add this import
import "../../DonationDashboard/donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

/* small progress bar for inside the modal */
function PBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 10, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

/* timeline + storage */
const TL_ORDER = ["teamAssigned","vehicleLoaded","enRoute","checkpointVerified","distributionStart","returnReport"];
const TL_LABELS = {
  teamAssigned:"Team assigned",
  vehicleLoaded:"Vehicle loaded",
  enRoute:"En route to sector 7",
  checkpointVerified:"Checkpoint verified",
  distributionStart:"Distribution start",
  returnReport:"Return & report",
};
const TL_STORAGE_KEY = "opTimeline:v1";
const readTLStore = () => {
  try {
    const raw = localStorage.getItem(TL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

/* inventory mapping */
const ITEM_OPTIONS = [
  { value:"dry_rations", label:"Dry rations", unit:"packs" },
  { value:"water",       label:"Water",       unit:"liters" },
  { value:"bedding",     label:"Bedding",     unit:"sets"   },
  { value:"medical",     label:"Medical kits",unit:"kits"   },
  { value:"clothing",    label:"Clothing",    unit:"sets"   },
  { value:"hygiene",     label:"Hygiene packs",unit:"packs" },
];
const itemMeta = Object.fromEntries(ITEM_OPTIONS.map(o => [o.value, o]));

export default function Distributionplan({ onClose }) {
  const navigate = useNavigate(); // Add this hook
  const [selfClosed, setSelfClosed] = useState(false);
  
  // Create portal element and add to DOM
  const [portalEl] = useState(() => {
    const el = document.createElement("div");
    el.id = "dp-portal";
    return el;
  });

  // Mount/unmount portal element
  useEffect(() => {
    // Add portal to DOM
    document.body.appendChild(portalEl);
    // Lock body scroll
    document.body.classList.add("dp-lock-scroll");

    // Cleanup on unmount
    return () => {
      try {
        document.body.removeChild(portalEl);
        document.body.classList.remove("dp-lock-scroll");
      } catch (e) {
        // Element might have already been removed
        console.warn("Portal cleanup error:", e);
      }
    };
  }, [portalEl]);

  const escHandlerRef = useRef(null);
  const storageHandlerRef = useRef(null);

  // Simple cleanup function - navigate to specific page
  const cleanupAndClose = useCallback(() => {
  // unlock scroll now; the component will unmount next tick
  document.body.classList.remove("dp-lock-scroll");

  // let parent hide the modal if it passed onClose
  onClose?.();

  // route to Donation page (adjust the path if your route is different)
  // setTimeout ensures unmount occurs before navigation for a smooth exit
  setTimeout(() => {
    navigate("/donation", { replace: true });
  }, 0);
}, [onClose, navigate]);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanupAndClose();
      }
    };
    
    escHandlerRef.current = handleEscape;
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [cleanupAndClose]);

  /* ---------- data ---------- */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [operations, setOperations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    
    // Fallback data for when API is not available
    const fallbackData = {
      operations: [{
        _id: "demo-op-1",
        operationName: "Emergency Relief Operation",
        status: "active",
        location: "Colombo, Sri Lanka",
        timeline: {
          teamAssigned: "done",
          vehicleLoaded: "done", 
          enRoute: "warn",
          checkpointVerified: "pending",
          distributionStart: "pending",
          returnReport: "pending"
        }
      }],
      volunteers: [
        { _id: "vol-1", fullName: "John Smith", volunteerType: "individual", operationId: "demo-op-1" },
        { _id: "vol-2", fullName: "Sarah Johnson", volunteerType: "team", operationId: "demo-op-1" },
        { _id: "vol-3", fullName: "Mike Wilson", volunteerType: "individual", operationId: "demo-op-1" }
      ],
      inventory: [
        { item: "dry_rations", quantity: 250 },
        { item: "water", quantity: 500 },
        { item: "bedding", quantity: 80 },
        { item: "medical", quantity: 45 },
        { item: "clothing", quantity: 120 },
        { item: "hygiene", quantity: 90 }
      ]
    };
    
    (async () => {
      try {
        setLoading(true); setErr("");
        
        // Try to fetch from API first
        const [opsRes, volRes, invRes] = await Promise.all([
          fetch(`${API_BASE}/api/operations`).catch(() => ({ ok: false, status: 'offline' })),
          fetch(`${API_BASE}/api/volunteer?assigned=true&limit=500`).catch(() => ({ ok: false, status: 'offline' })),
          fetch(`${API_BASE}/api/inventory`).catch(() => ({ ok: false, status: 'offline' })),
        ]);

        let ops, vols, inv;

        if (opsRes.ok && volRes.ok && invRes.ok) {
          // API is working, use real data
          ops = await opsRes.json();
          vols = await volRes.json();
          inv = await invRes.json();
        } else {
          // API is down, use fallback data
          console.warn("API not available, using fallback data");
          ops = fallbackData.operations;
          vols = { items: fallbackData.volunteers };
          inv = { items: fallbackData.inventory };
        }

        if (!alive) return;
        setOperations(Array.isArray(ops) ? ops : (ops.data || ops.items || fallbackData.operations));
        setVolunteers(Array.isArray(vols?.items) ? vols.items : (Array.isArray(vols) ? vols : fallbackData.volunteers));
        setInventory(inv?.items || (Array.isArray(inv) ? inv : fallbackData.inventory));
        
      } catch (e) {
        console.warn("Error loading data, using fallback:", e);
        if (alive) {
          // Use fallback data even on error
          setOperations(fallbackData.operations);
          setVolunteers(fallbackData.volunteers);
          setInventory(fallbackData.inventory);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const onStorage = (e) => { if (e.key === TL_STORAGE_KEY) setTick(t => t + 1); };
    storageHandlerRef.current = onStorage;
    window.addEventListener("storage", onStorage);
    return () => { alive = false; window.removeEventListener("storage", onStorage); };
  }, []);

  const activeOp = useMemo(() => {
    if (!operations?.length) return null;
    return operations.find(o => (o.status || "").toLowerCase() === "active") || operations[0];
  }, [operations]);

  const timeline = useMemo(() => {
    if (!activeOp) return [];
    const ls = readTLStore();
    const storeKey = String(activeOp?._id || activeOp?.operationName || "unknown");
    const local = ls?.[storeKey] || {};
    const src = Object.keys(local).length ? local : activeOp?.timeline || {};
    return TL_ORDER.map(k => ({ key: k, label: TL_LABELS[k], state: src[k] || "pending" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOp?._id, activeOp?.operationName, activeOp?.timeline, tick]);

  const assignedToActive = useMemo(() => {
    if (!activeOp) return [];
    const opId = String(activeOp._id || "");
    const opName = (activeOp.operationName || "").trim().toLowerCase();
    return (Array.isArray(volunteers) ? volunteers : []).filter(v => {
      const byId  = opId && String(v?.operationId || "") === opId;
      const byTxt = opName && (v?.assignedTo || "").trim().toLowerCase() === opName;
      return byId || byTxt;
    });
  }, [volunteers, activeOp]);

  const totals = useMemo(() => {
    const map = Object.fromEntries(ITEM_OPTIONS.map(o => [o.value, 0]));
    for (const it of Array.isArray(inventory) ? inventory : []) {
      const key = String(it?.item || "");
      if (key in map) map[key] += Number(it?.quantity || 0);
    }
    return map;
  }, [inventory]);

  const familiesCoverage  = Math.min(100, Math.round((totals["dry_rations"] || 0) / 10));
  const resourcesCoverage = (() => {
    const vals = Object.values(totals);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, n) => a + (n > 0 ? 1 : 0), 0) / vals.length * 100);
  })();

  if (selfClosed) return null; // fallback path when no onClose provided

  const content = (
    <div
      className="dp-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && cleanupAndClose()}
      data-open="true"
    >
      <div className="dp-modal-body" onClick={(e) => e.stopPropagation()}>
        <button
          className="dp-modal-close"
          type="button"
          aria-label="Close"
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            cleanupAndClose(); 
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {loading ? (
          <div className="distribution-loading">
            <div className="loading-spinner" /> 
            <span>Loading distribution plan…</span>
          </div>
        ) : err ? (
          <div className="distribution-error">
            <div className="error-content">
              <span className="error-icon">⚠</span>
              {err}
            </div>
          </div>
        ) : !activeOp ? (
          <div className="distribution-empty">
            <div className="empty-icon">📋</div>
            <h3 className="empty-title">No operations</h3>
            <p className="empty-subtitle">Create an operation to view the distribution plan.</p>
          </div>
        ) : (
          <section className="distribution-panel">
            <div className="distribution-header">
              <div className="distribution-title-section">
                <h1 className="distribution-title">Distribution Plan</h1>
                <p className="distribution-subtitle">
                  {activeOp.operationName} • Status:{" "}
                  <span className={`status-badge status-${(activeOp.status || "pending").toLowerCase()}`}>
                    {activeOp.status || "Pending"}
                  </span>
                </p>
              </div>
            </div>

            {/* Timeline + Map */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(340px,420px) 1fr", gap: 20, marginBottom: 24 }}>
              <div className="timeline-card">
                <div className="timeline-head">
                  <div>
                    <div className="timeline-title">Timeline</div>
                    <div className="timeline-sub">
                      Active operation: <span className="timeline-op">{activeOp.operationName}</span>
                    </div>
                  </div>
                </div>
                <div className="timeline-list">
                  {timeline.map((s, idx) => (
                    <div key={s.key} className="timeline-step">
                      <span className={`timeline-dot ${s.state === "done" ? "dot-done" : s.state === "warn" ? "dot-warn" : "dot-pending"}`} />
                      {idx < timeline.length - 1 && <div className="timeline-line" />}
                      <div className="timeline-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="timeline-card" style={{ height: "100%" }}>
                <div className="timeline-head">
                  <div>
                    <div className="timeline-title">Distribution area Map</div>
                    <div className="timeline-sub">
                      Location: <span className="timeline-op">{activeOp.location || "—"}</span>
                    </div>
                  </div>
                </div>
                {activeOp.location ? (
                  <div style={{ borderRadius: 12, overflow: "hidden" }}>
                    <iframe
                      title="map"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(activeOp.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      style={{ width: "100%", height: 300, border: 0 }}
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="adp-empty-panel">No location set for this operation.</div>
                )}
              </div>
            </div>

            {/* KPIs + Team */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(320px, 420px)", gap: 20 }}>
              <div className="timeline-card">
                <div className="timeline-head">
                  <div>
                    <div className="timeline-title">Emergency resources available</div>
                    <div className="timeline-sub">Live from inventory</div>
                  </div>
                </div>

                <div className="kpi-grid">
                  {["medical","clothing","water","dry_rations"].map(v => {
                    const k = { ...itemMeta[v], have: totals[v] || 0 };
                    return (
                      <div key={k.value} className="kpi">
                        <div className="kpi-emoji">📦</div>
                        <div>
                          <div className="num">{Number(k.have).toLocaleString()}</div>
                          <div className="muted small">{k.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 16, overflowX: "auto" }}>
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Have</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ITEM_OPTIONS.map(meta => (
                        <tr key={meta.value}>
                          <td>{meta.label}</td>
                          <td>{totals[meta.value] || 0}</td>
                          <td>{meta.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="vm-timeline-card">
                <div className="vm-timeline-head">
                  <div>
                    <div className="vm-timeline-title">Team</div>
                    <div className="vm-timeline-sub">
                      Active operation: <span className="vm-timeline-op">{activeOp.operationName}</span>
                    </div>
                  </div>
                </div>

                <div className="vm-volunteer-list-container">
                  {assignedToActive.length === 0 ? (
                    <div className="vm-volunteer-empty-state">
                      <div className="vm-empty-icon">👥</div>
                      <h4>No volunteers assigned</h4>
                      <p>This operation doesn't have any assigned volunteers yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="vm-volunteer-count-display">
                        {assignedToActive.length} VOLUNTEER{assignedToActive.length > 1 ? "S" : ""} ASSIGNED
                      </div>
                      <div className="vm-volunteer-names-list">
                        {assignedToActive.map((v, i) => {
                          const name = v?.fullName || "—";
                          const type = v?.volunteerType || "individual";
                          return (
                            <div key={v?._id || i} className="vm-volunteer-name-item">
                              <div className="vm-volunteer-name-avatar">{name.charAt(0)}</div>
                              <div className="vm-volunteer-name-details">
                                <div className="vm-volunteer-name-text">{name}</div>
                                <div className="vm-volunteer-name-type">{type === "team" ? "Team Lead" : "Individual"}</div>
                              </div>
                              <div className="vm-volunteer-status-dot"></div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );

  return createPortal(content, portalEl);
}