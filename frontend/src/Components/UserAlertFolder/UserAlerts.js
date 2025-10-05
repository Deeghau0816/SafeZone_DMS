import React, { useEffect, useMemo, useState, useMemo as useMemo2 } from "react";
import "./UserAlerts.css";
import Nav from "../../HeaderFotter/Header";

/* --------------------- Helpers (stable, outside component) ------------------ */

function classifyAlert(a) {
  // Normalize any string-like severity field
  const raw = (
    a?.alertType ??
    a?.severity ??
    a?.level ??
    a?.alert_level ??
    a?.type ??
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  // Numeric severity (0–100 or 1–10 etc.)
  if (typeof a?.severity === "number") {
    const s = a.severity;
    if (s >= 80 || s >= 4) return "red";
    if (s >= 40 || s >= 2) return "orange";
    return "green";
  }

  const has = (k) => raw.includes(k);
  if (has("red") || has("critical") || has("severe") || has("danger") || has("high"))
    return "red";
  if (has("orange") || has("amber") || has("yellow") || has("warn") || has("medium"))
    return "orange";
  if (has("green") || has("info") || has("normal") || has("low")) return "green";

  // Other hints
  if (a?.isCritical || a?.priority === "high") return "red";
  if (a?.priority === "medium") return "orange";
  return "green"; // safe default
}

function computeStatsFromList(list) {
  return list.reduce(
    (acc, a) => {
      const t = classifyAlert(a);
      acc[t] += 1;
      acc.total += 1;
      return acc;
    },
    { red: 0, orange: 0, green: 0, total: 0 }
  );
}

function latestByTypeFrom(list) {
  const out = { red: null, orange: null, green: null };
  for (const a of list) {
    const t = classifyAlert(a);
    const when = a.createdAt ? new Date(a.createdAt) : null;
    if (when && (!out[t] || when > out[t])) out[t] = when;
  }
  return out;
}

/* -------------------------------- Component -------------------------------- */

export default function UserAlerts() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [mode, setMode] = useState("all");          // "all" | "mine" | "pick"
  const [pickedDistrict, setPickedDistrict] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [stats, setStats] = useState({ red: 0, orange: 0, green: 0, total: 0 });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    return p.toString();
  }, [page]);

  // Session user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setUser(data.user || null);
        } else if (!cancelled) {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Default view once auth is known
  useEffect(() => {
    if (!authChecked) return;
    setMode(prev => (user ? (prev === "all" ? "mine" : prev) : "all"));
  }, [authChecked, user]);

  // Fetch alerts list
  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;
    setLoading(true);
    setErr("");

    const base = "http://localhost:5000";
    let url;
    if (mode === "mine") {
      if (!user) {
        setMode("all");
        setLoading(false);
        return;
      }
      url = `${base}/alerts/my?${query}`;
    } else if (mode === "pick") {
      const d = pickedDistrict.trim();
      url = `${base}/alerts?${d ? `district=${encodeURIComponent(d)}&` : ""}${query}`;
    } else {
      url = `${base}/alerts?${query}`;
    }

    (async () => {
      try {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 401 && mode === "mine") {
            setMode("all");
            setErr("");
          } else {
            setErr(data.message || `Request failed (${res.status})`);
          }
          setAlerts([]);
          setPages(1);
          setStats({ red: 0, orange: 0, green: 0, total: 0 });
          return;
        }

        const items = data.items || data.alerts || [];
        const list = Array.isArray(items) ? items : [];
        setAlerts(list);
        setPages(Number(data.pages) || 1);

        // Fallback stats from the current page
        setStats(computeStatsFromList(list));
      } catch {
        if (!cancelled) {
          setErr("Network error");
          setAlerts([]);
          setPages(1);
          setStats({ red: 0, orange: 0, green: 0, total: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authChecked, mode, pickedDistrict, query, user]);

  // Try real stats endpoint; override fallback if present
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const base = "http://localhost:5000";

    (async () => {
      try {
        const params = new URLSearchParams();
        if (mode === "mine" && user?.district) params.set("district", user.district);
        if (mode === "pick" && pickedDistrict) params.set("district", pickedDistrict);

        const res = await fetch(`${base}/alerts/stats${params.toString() ? `?${params}` : ""}`, {
          credentials: "include",
        });
        if (!res.ok) return; // silently keep fallback

        const j = await res.json().catch(() => ({}));
        const s = {
          red: Number(j.red || j.critical || 0),
          orange: Number(j.orange || j.warning || 0),
          green: Number(j.green || j.info || 0),
          total:
            Number(
              j.total ??
              (j.red || 0) + (j.orange || 0) + (j.green || 0)
            ),
        };
        if (!cancelled) setStats(s);
      } catch {
        /* keep fallback */
      }
    })();

    return () => { cancelled = true; };
  }, [authChecked, mode, pickedDistrict, user]);

  // Last submitted (from current page only — matches your screenshot)
  const lastByType = useMemo2(() => latestByTypeFrom(alerts), [alerts]);
  const fmt = (d) => (d ? d.toLocaleString() : "—");

  const districts = [
    "Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota",
    "Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee",
    "Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle",
  ];

  return (
    <>
      {/* Fixed site nav */}
      <div className="navClass">
        <Nav />
      </div>

      {/* ===== Toolbar only (hero & quick cards removed) ===== */}
      <section className="ua-toolbar-out">
        <div className="ua-container">
          <div className="ua-toolbar" role="region" aria-label="Alerts toolbar">
            <div className="ua-filters">
              <label className="ua-ctl">
                <span className="ua-label">View</span>
                <select
                  className="ua-select"
                  value={mode}
                  onChange={(e) => { setMode(e.target.value); setPage(1); }}
                  aria-label="Choose which alerts to view"
                >
                  {user && <option value="mine">My district ({user?.district || "N/A"})</option>}
                  <option value="all">All alerts</option>
                  <option value="pick">Pick a district…</option>
                </select>
              </label>

              {mode === "pick" && (
                <label className="ua-ctl">
                  <span className="ua-label">District</span>
                  <select
                    className="ua-select"
                    value={pickedDistrict}
                    onChange={(e) => { setPickedDistrict(e.target.value); setPage(1); }}
                    aria-label="Select a district"
                  >
                    <option value="">-- Select district --</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Main grid ===== */}
      <div className="ua-container ua-main">
        <div className="ua-grid2">
          {/* LEFT: alerts list */}
          <section className="ua-left" aria-labelledby="alerts-heading">
            <h2 id="alerts-heading" className="ua-visually-hidden">Alerts</h2>

            {loading && <p className="ua-state">Loading…</p>}
            {err && !loading && <p className="ua-err">{err}</p>}
            {!loading && !alerts.length && !err && <p className="ua-state">No alerts found.</p>}

            <ul className="ua-list">
              {alerts.map((a) => {
                const type = classifyAlert(a);
                const created = a.createdAt ? new Date(a.createdAt).toLocaleString() : "";
                return (
                  <li key={a._id || a.id} className={`ua-item ${type}`}>
                    <div className="ua-row">
                      <div className="ua-titlewrap">
                        <span className={`ua-live-dot ${type}`} aria-hidden="true" />
                        <h4 className={`ua-topic ${type}`}>{a.topic}</h4>
                      </div>
                      <time className="ua-time" dateTime={a.createdAt || ""}>{created}</time>
                    </div>

                    <div className="ua-sub">
                      <span className={`ua-badge ${type}`} aria-label={`Severity ${type}`}>
                        {type.toUpperCase()}
                      </span>
                      <span className="ua-dot" aria-hidden="true">•</span>
                      <span>📍 {a.district || "—"}</span>
                    </div>

                    <div className="ua-pill">📍 Disaster Location: {a.disLocation || "—"}</div>
                    <p className="ua-msg">{a.message}</p>
                  </li>
                );
              })}
            </ul>

            {pages > 1 && !loading && (
              <nav className="ua-pager" aria-label="Pagination">
                <button className="ua-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)} type="button">Prev</button>
                <span className="ua-pagecount">Page {page} / {pages}</span>
                <button className="ua-btn" disabled={page === pages} onClick={() => setPage((p) => p + 1)} type="button">Next</button>
              </nav>
            )}
          </section>

          {/* RIGHT: summary + tips + contacts */}
          <aside className="ua-right" aria-label="Sidebar">
            {/* Recent Alerts summary */}
            <section className="ua-card">
              <header className="ua-card-head ua-between">
                <h3>Recent Alerts</h3>
                <span className="ua-live-label"><span className="ua-live-dot green" /> Live</span>
              </header>
              <div className="ua-card-body">
                <table className="ua-table">
                  <thead>
                    <tr><th>Type</th><th>Count</th><th>Last Submitted</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="ua-tag red">CRITICAL</span></td>
                      <td><span className="ua-count">{stats.red}</span></td>
                      <td>{fmt(lastByType.red)}</td>
                    </tr>
                    <tr>
                      <td><span className="ua-tag orange">WARNING</span></td>
                      <td><span className="ua-count">{stats.orange}</span></td>
                      <td>{fmt(lastByType.orange)}</td>
                    </tr>
                    <tr>
                      <td><span className="ua-tag green">INFO</span></td>
                      <td><span className="ua-count">{stats.green}</span></td>
                      <td>{fmt(lastByType.green)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Safety Tips */}
            <section className="ua-card">
              <header className="ua-card-head"><h3>Safety Tips</h3></header>
              <div className="ua-card-body ua-tips">
                <div className="ua-tip"><span className="ua-tip-ico">🔋</span><span>Keep your phone charged and carry a power bank.</span></div>
                <div className="ua-tip"><span className="ua-tip-ico">🌊</span><span>Move to higher ground during flood warnings.</span></div>
                <div className="ua-tip"><span className="ua-tip-ico">🧳</span><span>Prepare a 3-day emergency kit with water & food.</span></div>
              </div>
            </section>

            {/* Emergency Contacts */}
            <section className="ua-card">
              <header className="ua-card-head"><h3>Emergency Contacts</h3></header>
              <div className="ua-card-body">
                <div className="ua-rowline"><span>Police Emergency</span><strong className="ua-emph red">119</strong></div>
                <div className="ua-rowline"><span>Fire & Rescue</span><strong className="ua-emph red">110</strong></div>
                <div className="ua-rowline"><span>Medical Emergency</span><strong className="ua-emph red">1990</strong></div>
                <div className="ua-rowline"><span>Disaster Management</span><strong className="ua-emph red">117</strong></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
