import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import Alert from "./Alert";
import "./Alert.css";

export default function AlertsPage() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await axios.get("/alerts?limit=100");
      // supports either { ok, items } or array
      setItems(data?.items || data || []);
    } catch (e) {
      console.error("alerts load failed", e);
      setItems([]);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    await axios.delete(`/alerts/${id}`);
    setItems((s) => s.filter((x) => (x._id || x.id) !== id));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="alerts-wrap">
      {/* ===== Page header with back button & add button ===== */}
      <div className="alerts-header">
        <div className="alerts-header-left">
          {/* Visible back button (works even if route changes) */}
          <button
            className="back-btn"
            onClick={() => navigate("/AdminHome")}
            aria-label="Back to Admin Home"
            type="button"
          >
            <span className="back-arrow" aria-hidden>←</span>
            <span className="back-text">Back</span>
          </button>

          <h1 className="alerts-title">Admin — Alerts</h1>
        </div>

        <Link to="/AdminHome/AlertAdd" className="add-alert-btn">
          + Add Alert
        </Link>
      </div>

      {/* ===== List ===== */}
      {items.length === 0 ? (
        <div className="alert-empty">No alerts yet.</div>
      ) : (
        items.map((a) => (
          <Alert key={a._id || a.id} alert={a} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}
