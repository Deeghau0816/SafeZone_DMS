import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EditCenter from "./EditCenter"; // modal
import "./donationcss/donate_dashboard.css";

function CentersPanel() {
  const navigate = useNavigate();

  // state
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [stats, setStats] = useState({ total: 0, cities: 0, active: 0 });

  // edit modal
  const [editingCenter, setEditingCenter] = useState(null);

  const API_BASE = "http://localhost:5000/api";

  // fetch centers
  const fetchCenters = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/collectingcenters`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setCenters(data || []);

      // default selection
      if ((data || []).length > 0 && !selectedId) {
        setSelectedId(data[0]._id);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load centers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stats
  useEffect(() => {
    const uniqueCities = new Set(centers.map((c) => c.city));
    setStats({
      total: centers.length,
      cities: uniqueCities.size,
      active: centers.length, // treat all as active
    });
  }, [centers]);

  // filters
  const filteredCenters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return centers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q);
      const matchesCity = !filterCity || c.city === filterCity;
      return matchesSearch && matchesCity;
    });
  }, [centers, searchTerm, filterCity]);

  const sorted = useMemo(
    () => [...filteredCenters].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredCenters]
  );

  const uniqueCities = useMemo(
    () => [...new Set(centers.map((c) => c.city))].sort(),
    [centers]
  );

  const selected = useMemo(
    () => centers.find((c) => c._id === selectedId) || centers[0],
    [centers, selectedId]
  );

  // actions
  const handleRefresh = () => fetchCenters();
  const handleClearSearch = () => {
    setSearchTerm("");
    setFilterCity("");
  };
  const handleAddCenter = () => navigate("/donation/centers");

  const removeCenter = async (id) => {
    if (!window.confirm("Are you sure you want to delete this center?")) return;
    try {
      const res = await fetch(`${API_BASE}/collectingcenters/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setCenters((list) => list.filter((c) => c._id !== id));

      if (selectedId === id) {
        const remaining = centers.filter((c) => c._id !== id);
        setSelectedId(remaining[0]?._id || null);
      }

      alert("Center deleted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to delete center. Please try again.");
    }
  };

  const handleEditCenter = (center, e) => {
    e.stopPropagation();
    setEditingCenter(center);
  };

  const handleEditSubmit = async (updatedCenter) => {
    try {
      const res = await fetch(
        `${API_BASE}/collectingcenters/${updatedCenter.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCenter),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const updatedData = await res.json();

      setCenters((list) =>
        list.map((c) => (c._id === updatedCenter.id ? { ...c, ...updatedData } : c))
      );

      setEditingCenter(null);
      alert("Center updated successfully!");
    } catch (e) {
      console.error(e);
      throw new Error("Failed to update center. Please try again.");
    }
  };

  // rendering
  if (loading) {
    return (
      <div className="donation-dashboard-component">
        <div className="dd-centers-panel">
          <div className="dd-loading">
            <p>Loading centers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donation-dashboard-component">
        <div className="dd-centers-panel">
          <div className="dd-error">
            <p>{error}</p>
            <button 
              onClick={fetchCenters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                color: 'white',
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-dashboard-component">
      <div className="dd-centers-panel">
      {/* Header */}
      <div className="dd-dashboard-header">
        <div className="dd-header-content">
          <div>
            <h1>Collection Centers Management</h1>
            <p>Manage donation collection centers and their locations</p>
          </div>
          <button
            onClick={handleAddCenter}
            type="button"
            title="Navigate to centers form"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 24px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 16px rgba(239, 68, 68, 0.3)';
            }}
          >
            + Add Center
          </button>
        </div>

        <div className="dd-stats-grid">
          <div className="dd-stat-card">
            <div className="dd-stat-number">{stats.active}</div>
            <div className="dd-stat-label">Active Centers</div>
          </div>
        </div>
      </div>

      {/* Search / filters */}
      <div className="dd-search-filters">
        <div className="dd-search-input-wrapper">
          <input
            type="text"
            placeholder="Search centers by name, city, or address..."
            className="dd-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={handleRefresh}
            type="button"
            title="Refresh centers data"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: loading ? '#f3f4f6' : 'white',
              color: loading ? '#9ca3af' : '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = '#f9fafb';
                e.target.style.borderColor = '#d1d5db';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? "..." : "🔄"}
          </button>
          {(searchTerm || filterCity) && (
            <button
              onClick={handleClearSearch}
              type="button"
              title="Clear search and filters"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'auto',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '600',
                fontSize: '16px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#fef2f2';
                e.target.style.borderColor = '#fecaca';
                e.target.style.color = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#6b7280';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ×
            </button>
          )}
        </div>

        <select
          className="dd-filter-select"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {uniqueCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <section className="dd-centers-content">
        <div className="dd-cc-grid">
          {/* left: list */}
          <div className="dd-cc-list">
            {sorted.length === 0 && (
              <div className="dd-cc-empty">
                {searchTerm || filterCity
                  ? "No centers match your search criteria."
                  : 'No centers yet. Click "Add Center".'}
              </div>
            )}

            {sorted.map((c) => (
              <div
                key={c._id}
                className={`dd-cc-card ${selectedId === c._id ? "dd-active" : ""}`}
                onClick={() => setSelectedId(c._id)} // ✅ stay on page; update right panel
                style={{ cursor: "pointer" }}
              >
                <div className="dd-cc-card-head">
                  <h3 className="dd-cc-card-title">{c.name}</h3>
                  <span className="dd-cc-city">{c.city}</span>
                </div>

                <div className="dd-cc-line">{c.address}</div>

                <div className="dd-cc-line">
                  <a
                    href={`tel:${c.phone.replace(/\s+/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.phone}
                  </a>
                  {c.hours ? <span className="dd-cc-hours"> • {c.hours}</span> : null}
                </div>

                <div className="dd-cc-tags">
                  {c.tags?.map((t) => (
                    <span className="dd-cc-tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>

                <div className="dd-cc-actions">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      textDecoration: 'none',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }}
                  >
                    Get Directions
                  </a>
                  <button
                    onClick={(e) => handleEditCenter(c, e)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f3f4f6';
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCenter(c._id);
                    }}
                    title="Delete this center"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: 'white',
                      color: '#dc2626',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#fef2f2';
                      e.target.style.borderColor = '#fca5a5';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#fecaca';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* right: map/details */}
          <div className="dd-cc-map">
            {selected ? (
              <>
                <div className="dd-cc-map-head">
                  <div>
                    <h3 className="dd-cc-map-title">{selected.name}</h3>
                    <div className="dd-cc-map-sub">
                      {selected.address}, {selected.city} •{" "}
                      <a href={`tel:${selected.phone.replace(/\s+/g, "")}`}>
                        {selected.phone}
                      </a>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      textDecoration: 'none',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }}
                  >
                    Get Directions
                  </a>
                </div>
                <iframe
                  title="map"
                  className="dd-cc-iframe"
                  src={`https://www.google.com/maps?q=${selected.lat},${selected.lng}&z=14&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </>
            ) : (
              <div className="dd-cc-empty">Select a center to view the map.</div>
            )}
          </div>
        </div>
      </section>

      {/* Edit modal */}
      {editingCenter && (
        <EditCenter
          center={editingCenter}
          onClose={() => setEditingCenter(null)}
          onSubmit={handleEditSubmit}
        />
      )}
      </div>
    </div>
  );
}

export default CentersPanel;
