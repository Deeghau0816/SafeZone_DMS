import React, { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import Nav from "../NavBar/adminNav";
import HeroSlider from "../Slider/Slider";
import "./AdminHome.css";

// Images for slider
import slide1 from "../images/disTypes.jpg";
import slide2 from "../images/floor.jpg";
import slide3 from "../images/whatIs.png";

export default function AdminHome() {
  const { pathname } = useLocation();
  const onHome = pathname === "/AdminHome" || pathname === "/AdminHome/";

  // ===== State =====
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    total: 0,
    red: 0,
    green: 0,
    last24h: 0,
    users: 0,
  });
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  // controls
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState("all");

  // Base API (env or local)
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const getJsonSmart = async (pathNoApi) => {
    let r = await fetch(`${API}${pathNoApi}`, { credentials: "include" });
    if (r.ok) return r.json();
    r = await fetch(`${API}/api${pathNoApi}`, { credentials: "include" });
    if (!r.ok) throw new Error(`${r.status} on ${pathNoApi}`);
    return r.json();
  };

  const normalizeAlerts = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.alerts)) return res.alerts;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const normalizeMetrics = (res) => ({
    total: res?.total ?? 0,
    red: res?.red ?? 0,
    green: res?.green ?? 0,
    last24h: res?.last24h ?? 0,
    users: res?.activeUsers ?? 0,
  });

  const formatWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const sevKey = (a) =>
    (a?.severity || a?.level || "green").toString().toLowerCase();

  // ===== initial load =====
  const loadAll = async () => {
    setLoading(true);
    try {
      // metrics
      let m = { total: 0, red: 0, green: 0, last24h: 0, users: 0 };
      try {
        const mj = await getJsonSmart(`/alerts/metrics`);
        m = normalizeMetrics(mj);
      } catch (e) {
        console.warn("[AdminHome] metrics fetch failed:", e?.message || e);
      }

      // recent alerts
      let r = [];
      try {
        const rcj = await getJsonSmart(`/alerts/recent?limit=20`);
        r = normalizeAlerts(rcj);
      } catch (e) {
        console.warn(
          "[AdminHome] recent alerts fetch failed:",
          e?.message || e
        );
      }

      setMetrics(m);
      setRecent(r);
      setError("");
    } catch (e) {
      console.error("[AdminHome] load error", e);
      setError("Some cards failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime via SSE with polling fallback =====
  useEffect(() => {
    if (!auto) return;
    let es;
    let pollTimer;
    const url = `${API}/alerts/events`;

    try {
      es = new EventSource(url, { withCredentials: true });
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type === "metrics")
            setMetrics((_) => normalizeMetrics(payload.data));
          if (payload?.type === "alerts")
            setRecent((_) => normalizeAlerts(payload.data));
        } catch {}
      };
      es.onerror = () => {
        if (es) es.close();
        pollTimer = setInterval(async () => {
          try {
            const r = await getJsonSmart(`/alerts/pull`);
            if (r?.metrics) setMetrics(normalizeMetrics(r.metrics));
            if (r?.alerts) setRecent(normalizeAlerts(r.alerts));
          } catch {}
        }, 15000);
      };
    } catch {
      pollTimer = setInterval(async () => {
        try {
          const r = await getJsonSmart(`/alerts/pull`);
          if (r?.metrics) setMetrics(normalizeMetrics(r.metrics));
          if (r?.alerts) setRecent(normalizeAlerts(r.alerts));
        } catch {}
      }, 15000);
    }

    return () => {
      if (es) es.close();
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, API]);

  const SLIDES = useMemo(() => [slide1, slide2, slide3], []);

  // filter in-memory
  const filtered = useMemo(() => {
    if (filter === "all") return recent;
    return recent.filter((a) => sevKey(a) === filter);
  }, [recent, filter]);

  return (
    <div className="ah-page">
      {/* ===== Top Navbar ===== */}
      <Nav />

      <main className="ah-wrap">
        {onHome ? (
          <>
            {/* ===== KPI + Controls ===== */}
            <section className="ah-kpi-section" aria-busy={loading}>
              <div className="ah-kpis">
                <div className="ah-kpi">
                  <div className="ah-v">{metrics.total}</div>
                  <div className="ah-l">Total</div>
                </div>
                <div className="ah-kpi ah-danger">
                  <div className="ah-v">{metrics.red}</div>
                  <div className="ah-l">Red</div>
                </div>
                <div className="ah-kpi ah-good">
                  <div className="ah-v">{metrics.green}</div>
                  <div className="ah-l">Green</div>
                </div>
                <div className="ah-kpi ah-warn">
                  <div className="ah-v">{metrics.last24h}</div>
                  <div className="ah-l">24h</div>
                </div>
                <div className="ah-kpi">
                  <div className="ah-v">{metrics.users}</div>
                  <div className="ah-l">Users</div>
                </div>
              </div>

              <div className="ah-controls">
                <div className="ah-filter">
                  <label>Show:</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                  </select>
                </div>
                <div className="ah-actions">
                  <button
                    className="ah-btn"
                    onClick={loadAll}
                    disabled={loading}
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </button>
                  <label className="ah-toggle">
                    <input
                      type="checkbox"
                      checked={auto}
                      onChange={(e) => setAuto(e.target.checked)}
                    />
                    <span>Auto‑update</span>
                  </label>
                </div>
              </div>

              {error && <div className="ah-err ah-kpi-err">{error}</div>}
            </section>

            {/* ===== DASHBOARD GRID ===== */}
            <section className="ah-dash">
              {/* LEFT: Recent Alerts table */}
              <div className="ah-leftcol">
                <div className="ah-card">
                  <div className="ah-ct">Recent Alerts</div>
                  {loading ? (
                    <div className="ah-skeleton" aria-hidden>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="ah-skel-row" />
                      ))}
                    </div>
                  ) : filtered?.length ? (
                    <div className="ah-tbl">
                      <table>
                        <thead>
                          <tr>
                            <th>Level</th>
                            <th>Title</th>
                            <th>User</th>
                            <th>When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((a) => {
                            const sev = sevKey(a);
                            return (
                              <tr key={a._id || a.id}>
                                <td>
                                  <span className={`ah-sev ah-sev-${sev}`}>
                                    {sev.toUpperCase()}
                                  </span>
                                </td>
                                <td className="ah-cut" title={a.title}>
                                  {a.title || "—"}
                                </td>
                                <td
                                  className="ah-cut"
                                  title={a.user || a.userName}
                                >
                                  {a.user || a.userName || "—"}
                                </td>
                                <td>{formatWhen(a.createdAt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="ah-muted">no recent alerts</div>
                  )}
                  <Link className="ah-a" to="/AdminHome/toAlerts">
                    View all →
                  </Link>
                </div>
              </div>

              {/* RIGHT: Slider (top) + Buttons (bottom) */}
              <div className="ah-rightcol">
                <div className="ah-card ah-slidercard">
                  <div className="ah-ct">Highlights</div>
                  <div className="ah-hero">
                    {HeroSlider ? (
                      <HeroSlider
                        images={SLIDES}
                        intervalMs={4500}
                        height={320}
                      />
                    ) : (
                      <img
                        src={slide1}
                        alt="highlight"
                        style={{
                          width: "100%",
                          height: 320,
                          objectFit: "cover",
                          borderRadius: 12,
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="ah-card ah-actionscard">
                  <div className="ah-ct ah-sm">Quick Actions</div>
                  <div className="ah-qa">
                    <Link className="ah-q ah-ok" to="/AdminHome/AlertAdd">
                      Add Alert
                    </Link>
                    <Link className="ah-q" to="/AdminHome/toAlerts">
                      All Alerts
                    </Link>
                    <Link className="ah-q" to="/AdminHome/AdminRegitration">
                      Admin Registration
                    </Link>
                    <Link className="ah-q" to="/AdminHome/ReportGenerator">
                      Alert Report
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
