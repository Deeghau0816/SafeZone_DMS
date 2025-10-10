// frontend/src/Component/DonationDashboard/InventoryPanel.js
import React, { useState, useEffect, useCallback } from "react";
import "./donationcss/donate_dashboard.css";
import DonateItemForm from "../Donation/Donaterelief/donateitemform";
import EditReliefForm from "./editrelief";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

// Item mapping (keys + labels + units) - targets will come from DB
const ITEM_OPTIONS = [
  { value: "dry_rations", label: "Dry rations", unit: "packs" },
  { value: "water", label: "Water", unit: "liters" },
  { value: "bedding", label: "Bedding", unit: "sets" },
  { value: "medical", label: "Medical kits", unit: "kits" },
  { value: "clothing", label: "Clothing", unit: "sets" },
  { value: "hygiene", label: "Hygiene packs", unit: "packs" },
];

const itemLabel = (val) => ITEM_OPTIONS.find((o) => o.value === val)?.label || val;
const itemUnit = (val) => ITEM_OPTIONS.find((o) => o.value === val)?.unit || "";

export default function InventoryPanel() {
    const navigate = useNavigate();
    
    console.log("InventoryPanel component mounted");

  const [inventoryData, setInventoryData] = useState([]);
  const [centers, setCenters] = useState([]);
  const [targets, setTargets] = useState({}); // New state for targets from DB
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  /** ---------- Load Data ---------- */
  const loadInventory = useCallback(async () => {
    try {
      console.log("Attempting to load inventory from:", `${API_BASE}/api/inventory`);
      const res = await fetch(`${API_BASE}/api/inventory`);
      console.log("Response status:", res.status, "Response ok:", res.ok);
      if (!res.ok) throw new Error(`Inventory load failed (${res.status})`);
      const json = await res.json();
      console.log("Inventory data received:", json);
      setInventoryData(json.items || []);
    } catch (e) {
      console.error("Load inventory error:", e);
      console.error("Error details:", e.message);
      setErr(`Failed to load inventory: ${e.message}`);
    }
  }, []);

  const loadCenters = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/collectingcenters`);
      if (!res.ok) throw new Error(`Centers load failed (${res.status})`);
      const data = await res.json();
      setCenters(data || []);
    } catch (e) {
      console.error("Load centers error:", e);
    }
  }, []);

  // New function to load targets from database
  const loadTargets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/targetinventories`);
      if (!res.ok) throw new Error(`Targets load failed (${res.status})`);
      const data = await res.json();
      
      // Remove system fields and set targets
      const { _id, __v, createdAt, updatedAt, ...cleanTargets } = data || {};
      setTargets(cleanTargets);
    } catch (e) {
      console.error("Load targets error:", e);
      // Set default targets if loading fails
      const defaultTargets = {
        dry_rations: 1000,
        water: 800,
        bedding: 200,
        medical: 150,
        clothing: 300,
        hygiene: 250,
      };
      setTargets(defaultTargets);
    }
  }, []);

  const loadAll = useCallback(async () => {
    console.log("Starting to load all data...");
    setLoading(true);
    setErr(""); // Clear any previous errors
    try {
      await Promise.all([loadInventory(), loadCenters(), loadTargets()]);
      console.log("All data loaded successfully");
    } catch (error) {
      console.error("Error in loadAll:", error);
    } finally {
      setLoading(false);
    }
  }, [loadInventory, loadCenters, loadTargets]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** ---------- Actions ---------- */
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      loadInventory();
    } catch (e) {
      alert("Failed to delete item");
    }
  };

  /** ---------- Analytics ---------- */
  const calculateCenterTotals = () => {
    const totals = {};
    ITEM_OPTIONS.forEach((type) => {
      const target = targets[type.value] || 0; // Get target from DB
      totals[type.label] = {
        centers: {},
        total: 0,
        target: target,
        unit: type.unit,
      };
      // initialize all active centers
      centers.forEach((c) => (totals[type.label].centers[c.name] = 0));
    });

    inventoryData.forEach((it) => {
      const match = ITEM_OPTIONS.find((t) => t.value === it.item);
      if (match) {
        totals[match.label].total += it.quantity;
        const active = centers.find((c) => c.name === it.branch);
        if (active) {
          totals[match.label].centers[it.branch] =
            (totals[match.label].centers[it.branch] || 0) + it.quantity;
        } else {
          // mark inactive center with "(Inactive)"
          totals[match.label].centers[`${it.branch} (Inactive)`] =
            (totals[match.label].centers[`${it.branch} (Inactive)`] || 0) + it.quantity;
        }
      }
    });

    return totals;
  };

  const centerTotals = calculateCenterTotals();

  const mostNeededItems = ITEM_OPTIONS.map((type) => {
    const totals = centerTotals[type.label] || {};
    const total = totals.total || 0;
    const target = targets[type.value] || 0; // Get target from DB
    const coverage = target > 0 ? Math.min((total / target) * 100, 100) : 100;
    return { 
      ...type, 
      have: total, 
      need: Math.max(target - total, 0), 
      coverage,
      target: target // Add target to the object
    };
  }).sort((a, b) => a.coverage - b.coverage);

  const getCoverageColor = (coverage) => {
    if (coverage >= 80) return "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    if (coverage >= 60) return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
    if (coverage >= 30) return "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
    return "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
  };

  const getCoverageBadgeClass = (coverage) => {
    if (coverage >= 80) return "inv-badge--ok";
    if (coverage >= 60) return "inv-badge--warn";
    return "inv-badge--err";
  };

  /** ---------- Collect All Centers (active + inactive) ---------- */
  const allCenters = [
    ...centers.map((c) => c.name),
    ...Array.from(
      new Set(
        inventoryData
          .map((it) => it.branch)
          .filter((branch) => branch && !centers.find((c) => c.name === branch))
      )
    ).map((branch) => `${branch} (Inactive)`),
  ];

  /** ---------- UI ---------- */
  return (
    <div className="inv-wrap no-purple">
      {/* Header */}
      <div className="inv-head">
        <h1 className="adp-disaster-title">Inventory Management</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="inv-btn inv-btn-primary" onClick={() => setShowAddForm(true)}>
            + Add Items
          </button>
          <button 
            className="inv-btn inv-btn-primary" 
            onClick={() => navigate('/dashboard/target-inventory')}
          >
            Set Target
          </button>
        </div>
      </div>

      {loading && <div className="inv-loading">Loading inventory data...</div>}
      {err && (
        <div className="inv-error" style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', margin: '20px 0' }}>
          <h3>Error Loading Inventory</h3>
          <p>{err}</p>
          <p><strong>API Base URL:</strong> {API_BASE}</p>
          <p><strong>Full URL:</strong> {API_BASE}/api/inventory</p>
          <button onClick={() => loadAll()} style={{ marginTop: '10px', padding: '8px 16px' }}>
            Retry Loading
          </button>
        </div>
      )}

      {!loading && (
        <>
          {/* Inventory Table */}
          <div className="inv-tablewrap">
            <h2 className="inv-subtitle">Inventory Table</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Center/Branch</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.map((it) => (
                    <tr key={it._id}>
                      <td>{itemLabel(it.item)}</td>
                      <td>{it.quantity}</td>
                      <td>{itemUnit(it.item)}</td>
                      <td>{it.branch}</td>
                      <td>{it.date ? new Date(it.date).toLocaleDateString() : "-"}</td>
                      <td>{it.notes}</td>
                      <td>
                        <div className="inv-actions">
                          <button
                            className="ngoo-btn"
                            onClick={() => setEditingItem(it)}
                          >
                            Edit
                          </button>
                          <button
                            className="ngo-btn ngo-btn-danger"
                            onClick={() => handleDeleteItem(it._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inventoryData.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                        No inventory items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Center Totals */}
          <div className="inv-tablewrap" style={{ marginTop: "2rem" }}>
            <h2>Center Totals</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    {allCenters.map((c) => (
                      <th
                        key={c}
                        className={c.includes("(Inactive)") ? "inactive-center" : ""}
                      >
                        {c}
                      </th>
                    ))}
                    <th>All Centers*</th>
                  </tr>
                </thead>
                <tbody>
                  {ITEM_OPTIONS.map((type) => (
                    <tr key={type.value}>
                      <td>{type.label}</td>
                      {allCenters.map((c) => (
                        <td key={c}>{centerTotals[type.label]?.centers[c] || 0}</td>
                      ))}
                      <td>{centerTotals[type.label]?.total || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Needs & Targets */}
          <div className="inv-tablewrap" style={{ marginTop: "2rem" }}>
            <h2>Needs & Targets</h2>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Have</th>
                  <th>Target</th>
                  <th>Need</th>
                  <th>Unit</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {mostNeededItems.map((it) => (
                  <tr key={it.value}>
                    <td>{it.label}</td>
                    <td>{it.have}</td>
                    <td>{it.target}</td>
                    <td style={{ color: it.need > 0 ? "red" : "green" }}>{it.need}</td>
                    <td>{it.unit}</td>
                    <td>
                      <span className={`inv-badge ${getCoverageBadgeClass(it.coverage)}`}>
                        {Math.round(it.coverage)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Most Needed Now */}
          <div className="inv-tablewrap" style={{ marginTop: "2rem" }}>
            <h2>Most Needed Now</h2>
            <div>
              {mostNeededItems.map((it) => (
                <div key={it.value} className="inv-progress-row">
                  <div className="inv-progress-label">{it.label}</div>
                  <div className="inv-progress-bar">
                    <div
                      style={{
                        width: `${Math.max(it.coverage, 2)}%`,
                        background: getCoverageColor(it.coverage),
                      }}
                    />
                  </div>
                  <div className="inv-progress-value">{Math.round(it.coverage)}%</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Item Form Modal */}
      {showAddForm && (
        <DonateItemForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            loadInventory();
          }}
        />
      )}

      {/* Edit Item Form Modal */}
      {editingItem && (
        <EditReliefForm
          editingItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            loadInventory();
          }}
        />
      )}
    </div>
  );
}