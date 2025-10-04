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
      <div className="dashboard-layout">
        <DonationSidebar />
        <div className="dq-modern-container">
          <div className="dq-header">
            <h2>📑 Distribution Records</h2>
          </div>
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <DonationSidebar />

      {/* Main content */}
      <div className="dq-modern-container">
        {/* Header */}
        <div className="dq-header">
          <h2>📑 Distribution Records</h2>
          <button className="dq-close" onClick={() => navigate(-1)}>
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="dq-progress">
          <div className="dq-progress-bar">
            <div
              className="dq-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span>{progressPercent}% of today's resources distributed</span>
        </div>

        {/* Error */}
        {error && (
          <div className="dq-error">
            ⚠ {error} <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* ✅ Chart Section */}
        <div style={{ width: "100%", height: 400, marginBottom: 40 }}>
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

        {/* Table */}
        <div className="dq-table-card">
          <table className="dq-table">
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
                  <td colSpan="5" className="dq-no-data">
                    No records found
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
                          className="dq-input"
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
                          className="dq-input"
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
                          className="dq-input"
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
                        <div className="dq-edit-actions">
                          <button
                            className="dq-save"
                            onClick={() => handleUpdate(r._id)}
                          >
                            💾 Save
                          </button>
                          <button className="dq-cancel" onClick={cancelEdit}>
                            ✕ Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="dq-actions">
                          <button
                            className="dq-edit"
                            onClick={() => startEdit(r)}
                          >
                            ✏️
                          </button>
                          <button
                            className="dq-delete"
                            onClick={() => handleDelete(r._id)}
                          >
                            🗑️
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
  );
};

export default DistributionTable;
