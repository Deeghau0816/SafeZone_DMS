import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { Link, useNavigate } from "react-router-dom";
import "./AdminAlert.css";

export default function AdminAlert() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await axios.get("/alerts?limit=100&page=1");
      const list = res.data?.items || res.data?.alerts || [];
      setAlerts(list);
    } catch {
      setErr("Failed to load alerts");
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      await axios.delete(`/alerts/${id}`);
      setAlerts((a) => a.filter((x) => (x._id || x.id) !== id));
    } catch (e) {
      if (e?.response?.status === 401) {
        alert("Please log in as admin");
        navigate("/AdminLogin");
        return;
      }
      alert("Delete failed");
    }
  };

  return (
    <div className="alerts-page">
      {/* ===== Header with Back + Add ===== */}
      <div className="alerts-head">
        <div className="alerts-head-left">
          <button
            className="back-btn"
            type="button"
            onClick={() => navigate("/AdminHome")} // or navigate(-1)
            aria-label="Back to Admin Home"
          >
            <span className="back-arrow" aria-hidden>←</span>
            <span className="back-text">Back</span>
          </button>
          <h2 className="alerts-title">Admin — Alerts</h2>
        </div>

        <Link to="/AdminHome/AlertAdd" className="add-alert-link">
          <button className="btn btn-primary" type="button">+ Add Alert</button>
        </Link>
      </div>

      {err && <p className="err">{err}</p>}

      <div className="alerts-list">
        {alerts.map((a) => {
          const id = a._id || a.id;
          return (
            <div key={id} className="alert-card">
              <div className="alert-top">
                <strong className="alert-topic">{a.topic}</strong>
                <small className="alert-time">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </small>
              </div>

              <div className="alert-meta">📍 {a.district} — {a.disLocation}</div>
              <div className="alert-text">{a.message}</div>

              <div className="alert-actions">
                <Link to={`/AdminHome/UpdateAlert/${id}`}>
                  {/* FORCE yellow */}
                  <button className="btn btn-warning" type="button">Update</button>
                </Link>

                {/* FORCE red */}
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => onDelete(id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {!alerts.length && !err && (
          <div className="alert-empty">No alerts yet.</div>
        )}
      </div>
    </div>
  );
}
