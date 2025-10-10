// frontend/src/Component/DonationDashboard/targetinventory.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DonationSidebar from "./DonationSidebar";   // <--- import sidebar
import "./donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function TargetInventory() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current DB values
  useEffect(() => {
    const loadTargets = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/targetinventories`);
        if (!res.ok) throw new Error("Failed to fetch targets");
        const data = await res.json();

        // Keep only item fields
        const { _id, __v, createdAt, updatedAt, ...clean } = data || {};
        setTargets(clean);
      } catch (err) {
        console.error("Failed to load targets", err);
      } finally {
        setLoading(false);
      }
    };
    loadTargets();
  }, []);

  // Handle input change
  const handleChange = (key, value) => {
    setTargets((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/targetinventories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("✅ Targets updated successfully!");
      navigate("/dashboard/inventory");
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Failed to save targets");
    } finally {
      setSaving(false);
    }
  };

  // Labels + Units
  const itemConfig = {
    dry_rations: { label: "Dry Rations", unit: "packs" },
    water: { label: "Water", unit: "liters" },
    bedding: { label: "Bedding", unit: "sets" },
    medical: { label: "Medical Supplies", unit: "kits" },
    clothing: { label: "Clothing", unit: "sets" },
    hygiene: { label: "Hygiene Kits", unit: "packs" },
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <DonationSidebar />

      {/* Main content */}
      <main className="dashboard-main">
        <div className="ngo-wrap">
          {/* Header */}
          <div className="ngo-head">
            <div>
              <h1 className="adp-disaster-title"> Set Inventory Targets</h1>
              <p className="adp-disaster-titlee">
                Configure target quantities for each relief item
              </p>
            </div>
            <div className="row gap8">
              <button className="ngo-btn btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button
                className="ngo-btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Targets"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="ngo-empty">⏳ Loading current targets...</div>
          ) : (
            <div className="ngo-tablewrap">
              <table className="ngo-table">
                <thead>
                  <tr>
                    <th>Relief Item</th>
                    <th>Target</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(itemConfig).map((key) => (
                    <tr key={key}>
                      <td className="strong">{itemConfig[key].label}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={targets[key] || ""}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="ngo-input"
                          placeholder="0"
                        />
                      </td>
                      <td className="small muted">{itemConfig[key].unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
