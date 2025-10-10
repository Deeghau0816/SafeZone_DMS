import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EditCenter from "./EditCenter"; // modal

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
      <div className="dd-centers-panel">
        <div className="dd-loading">
          <p>Loading centers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dd-centers-panel">
        <div className="dd-error">
          <p>{error}</p>
          <button className="dd-btn dd-btn-primary" onClick={fetchCenters}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-centers-panel">
      {/* Header */}
      <div className="dd-dashboard-header">
        <div className="dd-header-content">
          <div>
            <h1>Collection Centers Management</h1>
            <p>Manage donation collection centers and their locations</p>
          </div>
          <button
            className="dd-btn dd-btn-primary"
            onClick={handleAddCenter}
            type="button"
            title="Navigate to centers form"
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
            className="dd-btn dd-btn-ghost"
            onClick={handleRefresh}
            type="button"
            title="Refresh centers data"
            disabled={loading}
          >
            {loading ? "..." : "🔄"}
          </button>
          {(searchTerm || filterCity) && (
            <button
              className="dd-btn dd-btn-ghost"
              onClick={handleClearSearch}
              type="button"
              title="Clear search and filters"
              style={{ minWidth: "auto", padding: "8px 12px" }}
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
                    className="dd-btn dd-btn-primary"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Get Directions
                  </a>
                  <button
                    className="dd-btn dd-btn-ghost"
                    onClick={(e) => handleEditCenter(c, e)}
                  >
                    Edit
                  </button>
                  <button
                    className="dd-btn dd-btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCenter(c._id);
                    }}
                    title="Delete this center"
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
                    className="dd-btn dd-btn-primary"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                    target="_blank"
                    rel="noreferrer"
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
  );
}

export default CentersPanel;
