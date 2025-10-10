import React, { useState, useCallback } from "react";
import api from "../../api/axios";
import "./ReportGenarator.css";

const districts = [
  "all","Colombo","Gampaha","Kalutara","Kandy","Galle",
  "Matara","Hambantota","Jaffna","Kurunegala"
];

const toISO = (d) => new Date(d).toISOString().slice(0,10);

// ✅ use the same API base you use elsewhere
const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AlertReport() {
  const [from, setFrom] = useState(toISO(new Date(Date.now() - 7*864e5)));
  const [to, setTo]   = useState(toISO(new Date()));
  const [severity, setSeverity] = useState("all");   // all | green | red
  const [district, setDistrict] = useState("all");   // all | <name>

  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [items, setItems]       = useState([]);
  const [totals, setTotals]     = useState({ total: 0, red: 0, green: 0 });

  // ✅ Memoized to avoid identity changes; called only on Apply
  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/alerts/report", {
        params: { from, to, severity, district },
        validateStatus: () => true,
        withCredentials: true,
      });
      if (res.data?.ok) {
        setItems(res.data.items || []);
        setTotals({
          total: res.data.total || 0,
          red:   res.data.red   || 0,
          green: res.data.green || 0,
        });
      } else {
        setErr(res.data?.message || "Failed to load");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [from, to, severity, district]);

  // ✅ Open the backend URL (not the frontend) and block form submit
  const downloadPdf = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const qs = new URLSearchParams({ from, to, severity, district }).toString();
    window.open(`${API}/alerts/report/pdf?${qs}`, "_blank", "noopener"); // hits backend:5000
  };

  return (
    <div className="rg-page">
      <div className="rg-card">
        <div className="rg-header">
          <h2>Alert Report</h2>
          <div className="rg-sub">Range: {from} – {to}</div>
        </div>

        <form
          className="rg-filters"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <div className="rg-row">
            <label>From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label>Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="all">All</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
            </label>
            <label>District
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>

            {/* Submit triggers load (form prevents default) */}
            <button className="rg-btn" disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </button>

            {/* ✅ Non-submit download button that opens backend URL */}
            <button
              type="button"
              className="rg-btn"
              onClick={downloadPdf}
              disabled={loading || items.length === 0}
            >
              Download PDF
            </button>
          </div>
        </form>

        {err && <div className="rg-error">⚠️ {err}</div>}

        <div className="rg-kpis">
          <div className="rg-kpi"><div className="rg-v">{totals.total}</div><div className="rg-l">Total</div></div>
          <div className="rg-kpi good"><div className="rg-v">{totals.green}</div><div className="rg-l">Green</div></div>
          <div className="rg-kpi danger"><div className="rg-v">{totals.red}</div><div className="rg-l">Red</div></div>
        </div>

        <div className="rg-table" aria-busy={loading}>
          {loading ? (
            <div className="rg-skel">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rg-skel-row" />)}
            </div>
          ) : items.length ? (
            <table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Severity</th>
                  <th>District</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id}>
                    <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      <span className={`sev sev-${String(a.severity || a.level || "").toLowerCase()}`}>
                        {a.severity || a.level || "—"}
                      </span>
                    </td>
                    <td>{a.district || "—"}</td>
                    <td className="cut" title={a.title || a.description}>
                      {a.title || a.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rg-empty">No alerts match the selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
