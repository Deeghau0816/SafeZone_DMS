// frontend/src/Component/DonationDashboard/InventoryPanel.js
import React, { useState, useEffect, useCallback } from "react";
import "./donationcss/donate_dashboard.css";
import DonateItemForm from "../Donation/Donaterelief/donateitemform";
import EditReliefForm from "./editrelief";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

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

  const generateInventoryPDF = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();
    
    // Calculate statistics
    const totalItems = inventoryData.length;
    const totalQuantity = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const activeCenters = [...new Set(inventoryData.map(item => item.branch).filter(Boolean))].length;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Management Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #1e293b;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .header p {
            margin: 0;
            font-size: 1.1rem;
            opacity: 0.9;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 4px solid #667eea;
          }
          .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 8px;
          }
          .stat-label {
            color: #64748b;
            font-weight: 500;
          }
          .section {
            background: white;
            margin-bottom: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .section-header {
            background: #f8fafc;
            padding: 20px 25px;
            border-bottom: 1px solid #e2e8f0;
          }
          .section-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .section-subtitle {
            margin: 5px 0 0 0;
            color: #64748b;
            font-size: 0.95rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
          }
          th {
            background: #f1f5f9;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #4b5563;
          }
          tr:hover {
            background: #f8fafc;
          }
          .badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
          }
          .badge-success {
            background: #dcfce7;
            color: #166534;
          }
          .badge-warning {
            background: #fef3c7;
            color: #92400e;
          }
          .badge-danger {
            background: #fee2e2;
            color: #991b1b;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #64748b;
            font-size: 0.9rem;
            border-top: 1px solid #e2e8f0;
          }
          @media print {
            body { background: white; }
            .header { background: #667eea !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 Inventory Management Report</h1>
          <p>Generated on ${currentDate}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${totalItems}</div>
            <div class="stat-label">Total Items</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${totalQuantity}</div>
            <div class="stat-label">Total Quantity</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${activeCenters}</div>
            <div class="stat-label">Active Centers</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${centers.length}</div>
            <div class="stat-label">Total Centers</div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📄 Inventory Items</h2>
            <p class="section-subtitle">Current inventory items across all centers</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Center/Branch</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${inventoryData.map(item => `
                <tr>
                  <td><strong>${ITEM_OPTIONS.find(opt => opt.value === item.item)?.label || item.item}</strong></td>
                  <td>${item.quantity || 0}</td>
                  <td>${item.unit || '-'}</td>
                  <td>${item.branch || '-'}</td>
                  <td>${item.date || '-'}</td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">🏢 Center Totals</h2>
            <p class="section-subtitle">Inventory distribution across all collection centers</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                ${centers.map(center => `<th>${center.name}</th>`).join('')}
                <th>All Centers*</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(calculateCenterTotals()).map(([itemName, data]) => `
                <tr>
                  <td><strong>${itemName}</strong></td>
                  ${centers.map(center => `<td>${data.centers[center.name] || 0}</td>`).join('')}
                  <td><strong>${data.total}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">🎯 Needs & Targets</h2>
            <p class="section-subtitle">Target quantities vs current inventory</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Current Total</th>
                <th>Target</th>
                <th>Coverage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(calculateCenterTotals()).map(([itemName, data]) => {
                const coverage = data.target > 0 ? Math.round((data.total / data.target) * 100) : 0;
                const statusClass = coverage >= 100 ? 'badge-success' : coverage >= 50 ? 'badge-warning' : 'badge-danger';
                const statusText = coverage >= 100 ? 'Target Met' : coverage >= 50 ? 'Partially Met' : 'Below Target';
                return `
                  <tr>
                    <td><strong>${itemName}</strong></td>
                    <td>${data.total} ${data.unit}</td>
                    <td>${data.target} ${data.unit}</td>
                    <td>${coverage}%</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This report was generated automatically by the SafeZone DMS Inventory Management System</p>
          <p>For questions or support, please contact the system administrator</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
    if (coverage >= 80) return "dd-badge-success";
    if (coverage >= 60) return "dd-badge-warning";
    return "dd-badge-danger";
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
    <div className="donation-dashboard-component">
      {/* Header */}
      <div className="dd-inventory-header">
        <h1 className="dd-inventory-title">📦 Inventory Management</h1>
        <p className="dd-inventory-subtitle">Manage relief items, track quantities, and monitor center totals</p>
        <div className="dd-inventory-actions" style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: '8px'
        }}>
          <button 
            className="dd-btn dd-btn-primary" 
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              color: 'white',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
            }}
          >
            ➕ Add Items
          </button>
          <button 
            className="dd-btn dd-btn-secondary" 
            onClick={() => navigate('/dashboard/target-inventory')}
          >
            🎯 Set Target
          </button>
          <button 
            className="dd-btn dd-btn-success" 
            onClick={generateInventoryPDF}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: 'auto'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
          >
            📄 Generate PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="dd-loading-panel">
          <div className="dd-loading-spinner"></div>
          <span>Loading inventory data...</span>
        </div>
      )}
      {err && (
        <div className="dd-error-panel">
          <div className="dd-error-icon">⚠️</div>
          <h3>Error Loading Inventory</h3>
          <p>{err}</p>
          <p><strong>API Base URL:</strong> {API_BASE}</p>
          <p><strong>Full URL:</strong> {API_BASE}/api/inventory</p>
          <button className="dd-btn dd-btn-primary" onClick={() => loadAll()}>
            🔄 Retry Loading
          </button>
        </div>
      )}

      {!loading && (
        <>
          {/* Inventory Table */}
          <div className="dd-table-panel">
            <div className="dd-table-header">
              <h2 className="dd-table-title">📋 Inventory Table</h2>
              <p className="dd-table-subtitle">Current inventory items across all centers</p>
            </div>
            <div className="dd-table-wrapper">
              <table className="dd-table">
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
                      <td className="dd-item-name">{itemLabel(it.item)}</td>
                      <td className="dd-quantity">{it.quantity}</td>
                      <td className="dd-unit">{itemUnit(it.item)}</td>
                      <td className="dd-center">{it.branch}</td>
                      <td className="dd-date">{it.date ? new Date(it.date).toLocaleDateString() : "-"}</td>
                      <td className="dd-notes">{it.notes}</td>
                      <td className="dd-actions">
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          justifyContent: 'flex-start'
                        }}>
                          <button
                            onClick={() => setEditingItem(it)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              minWidth: '70px',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(it._id)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              minWidth: '80px',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inventoryData.length === 0 && (
                    <tr>
                      <td colSpan="7" className="dd-empty-state">
                        <div className="dd-empty-icon">📦</div>
                        <div className="dd-empty-title">No inventory items found</div>
                        <div className="dd-empty-subtitle">Add items to start tracking your inventory</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Center Totals */}
          <div className="dd-table-panel">
            <div className="dd-table-header">
              <h2 className="dd-table-title">🏢 Center Totals</h2>
              <p className="dd-table-subtitle">Inventory distribution across all collection centers</p>
            </div>
            <div className="dd-table-wrapper">
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    {allCenters.map((c) => (
                      <th
                        key={c}
                        className={c.includes("(Inactive)") ? "dd-inactive-center" : ""}
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
                      <td className="dd-item-name">{type.label}</td>
                      {allCenters.map((c) => (
                        <td key={c} className="dd-center-total">{centerTotals[type.label]?.centers[c] || 0}</td>
                      ))}
                      <td className="dd-total-sum">{centerTotals[type.label]?.total || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Needs & Targets */}
          <div className="dd-table-panel">
            <div className="dd-table-header">
              <h2 className="dd-table-title">🎯 Needs & Targets</h2>
              <p className="dd-table-subtitle">Track progress towards inventory targets</p>
            </div>
            <div className="dd-table-wrapper">
              <table className="dd-table">
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
                      <td className="dd-item-name">{it.label}</td>
                      <td className="dd-quantity">{it.have}</td>
                      <td className="dd-target">{it.target}</td>
                      <td className={`dd-need ${it.need > 0 ? 'dd-need-critical' : 'dd-need-met'}`}>
                        {it.need}
                      </td>
                      <td className="dd-unit">{it.unit}</td>
                      <td className="dd-coverage">
                        <span className={`dd-badge ${getCoverageBadgeClass(it.coverage)}`}>
                          {Math.round(it.coverage)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Needed Now - Chart Visualization */}
          <div className="dd-chart-panel">
            <div className="dd-chart-header">
              <h2 className="dd-chart-title">📊 Most Needed Now</h2>
              <p className="dd-chart-subtitle">Priority items requiring immediate attention</p>
            </div>
            
            {/* Chart Container */}
            <div className="dd-chart-container">
              <div className="dd-chart-wrapper">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={mostNeededItems.map(item => ({
                      name: item.label,
                      coverage: Math.round(item.coverage),
                      have: item.have,
                      target: item.target,
                      need: item.need,
                      unit: item.unit
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      label={{ value: 'Coverage %', angle: -90, position: 'insideLeft' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${value}%`, 'Coverage']}
                      labelFormatter={(label) => `Item: ${label}`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="coverage" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Chart Legend */}
              <div className="dd-chart-legend">
                <div className="dd-legend-item">
                  <div className="dd-legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span>Coverage Percentage</span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="dd-summary-grid">
              {mostNeededItems.slice(0, 3).map((item, index) => (
                <div key={item.value} className="dd-summary-card">
                  <div className="dd-summary-icon">
                    {index === 0 ? '🚨' : index === 1 ? '⚠️' : '📊'}
                  </div>
                  <div className="dd-summary-content">
                    <div className="dd-summary-label">{item.label}</div>
                    <div className="dd-summary-value">{Math.round(item.coverage)}%</div>
                    <div className="dd-summary-detail">
                      {item.have} / {item.target} {item.unit}
                    </div>
                  </div>
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