import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DonationSidebar from "./DonationSidebar";
import "./distributequantity.css";
import "./donationcss/DonationSidebar.css";

// ⬇️ Import chart components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DistributionTable = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const navigate = useNavigate();

  const API_BASE = "http://localhost:5000/api";

  // Fetch all records
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/distributionrecords`);
      if (!response.ok) throw new Error("Failed to fetch records");
      const result = await response.json();
      setRecords(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // ✅ Helper function to convert date to datetime-local format
  const formatDateTimeLocal = (dateString) => {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  // ✅ Start editing
  const startEdit = (record) => {
    setEditingId(record._id);
    setEditData({
      familiesAssisted: record.familiesAssisted || "",
      resourcesDistributed: record.resourcesDistributed || "",
      timestamp: formatDateTimeLocal(record.timestamp),
    });
  };

  // ✅ Save update
  const handleUpdate = async (id) => {
    try {
      const payload = {
        familiesAssisted: Number(editData.familiesAssisted),
        resourcesDistributed: Number(editData.resourcesDistributed),
        timestamp: new Date(editData.timestamp).toISOString(),
      };

      const response = await fetch(`${API_BASE}/distributionrecords/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update record");
      }

      setEditingId(null);
      setEditData({});
      await fetchRecords();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete record
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const response = await fetch(`${API_BASE}/distributionrecords/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete record");
      await fetchRecords();
    } catch (err) {
      setError(err.message);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // ✅ Handle input changes
  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Filter today's records
  const today = new Date().toISOString().slice(0, 10);
  const todaysRecords = records.filter(
    (r) => new Date(r.timestamp).toISOString().slice(0, 10) === today
  );

  // Calculate progress for today
  const totalFamiliesToday = todaysRecords.reduce(
    (sum, r) => sum + Number(r.familiesAssisted || 0),
    0
  );
  const totalResourcesToday = todaysRecords.reduce(
    (sum, r) => sum + Number(r.resourcesDistributed || 0),
    0
  );

  const progressPercent =
    totalFamiliesToday > 0
      ? Math.round((totalResourcesToday / totalFamiliesToday) * 100)
      : 0;

  // ✅ Prepare chart data
  const chartData = records.map((r) => ({
    date: new Date(r.timestamp || r.createdAt).toLocaleDateString(),
    families: Number(r.familiesAssisted || 0),
    resources: Number(r.resourcesDistributed || 0),
  }));

  if (loading) {
    return (
      <div className="donation-dashboard-component">
        <DonationSidebar />
        <div className="dd-distribution-quantity-container">
          <div className="dd-distribution-quantity-header">
            <h1>📑 Distribution Records</h1>
            <p>Loading distribution data...</p>
          </div>
          <div className="dd-chart-loading">
            <div className="dd-loading-spinner"></div>
            <span>Loading distribution records...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-dashboard-component">
      {/* Sidebar */}
      <DonationSidebar />

      {/* Main content */}
      <div className="dd-distribution-quantity-container">
        {/* Header */}
        <div className="dd-distribution-quantity-header">
          <h1>📑 Distribution Records</h1>
          <p>Track and manage distribution quantities for families and resources</p>
          <button 
            className="dd-export-btn" 
            onClick={() => navigate(-1)}
            style={{ marginTop: '16px' }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        <div className="dd-summary-cards">
          <div className="dd-summary-card">
            <div className="dd-summary-card-icon">👥</div>
            <div className="dd-summary-card-number">{totalFamiliesToday}</div>
            <div className="dd-summary-card-label">Families Assisted Today</div>
          </div>
          <div className="dd-summary-card">
            <div className="dd-summary-card-icon">📦</div>
            <div className="dd-summary-card-number">{totalResourcesToday}</div>
            <div className="dd-summary-card-label">Resources Distributed Today</div>
          </div>
          <div className="dd-summary-card">
            <div className="dd-summary-card-icon">📊</div>
            <div className="dd-summary-card-number">{progressPercent}%</div>
            <div className="dd-summary-card-label">Distribution Progress</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="dd-chart-error">
            <div className="dd-error-icon">⚠️</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>
              Error Loading Data
            </div>
            <div style={{ marginBottom: '16px' }}>{error}</div>
            <button 
              className="dd-export-btn" 
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chart Section */}
        <div className="dd-chart-container">
          <div className="dd-chart-header">
            <h2>📈 Distribution Trends</h2>
            <p>Visual representation of families assisted and resources distributed over time</p>
          </div>
          
          <div className="dd-chart-wrapper">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="families" fill="#3b82f6" name="Families Assisted" />
                <Bar
                  dataKey="resources"
                  fill="#10b981"
                  name="Resources Distributed"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dd-chart-legend">
            <div className="dd-legend-item">
              <div className="dd-legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>Families Assisted</span>
            </div>
            <div className="dd-legend-item">
              <div className="dd-legend-color" style={{ backgroundColor: '#10b981' }}></div>
              <span>Resources Distributed</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="dd-data-table-container">
          <div className="dd-data-table-header">
            <h2>📋 Distribution Records</h2>
          </div>
          
          <div className="dd-table-wrapper">
            <table className="dd-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Families Assisted</th>
                  <th>Resources Distributed</th>
                  <th>Date & Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="dd-chart-empty">
                      <div className="dd-empty-icon">📋</div>
                      <div className="dd-empty-title">No Records Found</div>
                      <div className="dd-empty-subtitle">Start by adding distribution records to see data here</div>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id}>
                      <td>{r._id.slice(-6)}</td>

                      {/* Families Assisted */}
                      <td>
                        {editingId === r._id ? (
                          <input
                            type="number"
                            value={editData.familiesAssisted}
                            onChange={(e) =>
                              handleInputChange("familiesAssisted", e.target.value)
                            }
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--dd-border)',
                              borderRadius: '6px',
                              fontSize: '0.95rem'
                            }}
                            min="0"
                          />
                        ) : (
                          r.familiesAssisted || 0
                        )}
                      </td>

                      {/* Resources Distributed */}
                      <td>
                        {editingId === r._id ? (
                          <input
                            type="number"
                            value={editData.resourcesDistributed}
                            onChange={(e) =>
                              handleInputChange(
                                "resourcesDistributed",
                                e.target.value
                              )
                            }
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--dd-border)',
                              borderRadius: '6px',
                              fontSize: '0.95rem'
                            }}
                            min="0"
                          />
                        ) : (
                          r.resourcesDistributed || 0
                        )}
                      </td>

                      {/* Date & Time */}
                      <td>
                        {editingId === r._id ? (
                          <input
                            type="datetime-local"
                            value={editData.timestamp || ""}
                            onChange={(e) =>
                              handleInputChange("timestamp", e.target.value)
                            }
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--dd-border)',
                              borderRadius: '6px',
                              fontSize: '0.95rem'
                            }}
                          />
                        ) : (
                          new Date(r.timestamp).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        {editingId === r._id ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="dd-export-btn"
                              onClick={() => handleUpdate(r._id)}
                              style={{ backgroundColor: 'var(--dd-success)', color: 'white', border: 'none' }}
                            >
                              💾 Save
                            </button>
                            <button 
                              className="dd-export-btn" 
                              onClick={cancelEdit}
                              style={{ backgroundColor: 'var(--dd-danger)', color: 'white', border: 'none' }}
                            >
                              ✕ Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="dd-export-btn"
                              onClick={() => startEdit(r)}
                              style={{ backgroundColor: 'var(--dd-primary)', color: 'white', border: 'none' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="dd-export-btn"
                              onClick={() => handleDelete(r._id)}
                              style={{ backgroundColor: 'var(--dd-danger)', color: 'white', border: 'none' }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionTable;
