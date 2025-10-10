import React, { useEffect, useState } from "react";

const EditCenter = ({ center, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    lat: "",
    lng: "",
    hours: "",
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Available tags for selection
  const availableTags = [
    "Food", "Clothing", "Medical", "Shelter", "Education", 
    "Emergency", "Disaster Relief", "Community", "Youth", "Elderly"
  ];

  // Hydrate form from selected center
  useEffect(() => {
    if (center) {
      setForm({
        name: center.name || "",
        address: center.address || "",
        city: center.city || "",
        phone: center.phone || "",
        lat: center.lat || "",
        lng: center.lng || "",
        hours: center.hours || "",
        tags: center.tags || []
      });
    }
  }, [center]);

  // Close on ESC key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, address, city, phone, lat, lng } = form;
    if (!name || !address || !city || !phone) {
      setError("Please complete all required fields.");
      return;
    }

    // Validate coordinates if provided
    if (lat && (isNaN(lat) || lat < -90 || lat > 90)) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (lng && (isNaN(lng) || lng < -180 || lng > 180)) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        id: center._id,
        ...form,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // Click outside to close
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("ec-modal")) onClose?.();
  };

  return (
    <div
      className="ec-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ec-title"
      onMouseDown={handleBackdropClick}
    >
      <div className="ec-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ec-header">
          <h2 id="ec-title" className="ec-title">
            Edit Collection Center
          </h2>
          <button type="button" className="ec-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div className="ec-error">{error}</div>}

        <form className="ec-form" onSubmit={handleSubmit}>
          <div className="ec-group">
            <label className="ec-label">Center Name *</label>
            <input
              className="ec-input"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Community Relief Center"
              required
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">Address *</label>
            <input
              className="ec-input"
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g., 123 Main Street"
              required
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">City *</label>
            <input
              className="ec-input"
              value={form.city}
              onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="e.g., Colombo"
              required
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">Phone Number *</label>
            <input
              className="ec-input"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g., +94 11 123 4567"
              required
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">Operating Hours</label>
            <input
              className="ec-input"
              value={form.hours}
              onChange={(e) => setForm(prev => ({ ...prev, hours: e.target.value }))}
              placeholder="e.g., 9AM - 5PM Mon-Fri"
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">Latitude</label>
            <input
              className="ec-input"
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm(prev => ({ ...prev, lat: e.target.value }))}
              placeholder="e.g., 6.9271"
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">Longitude</label>
            <input
              className="ec-input"
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm(prev => ({ ...prev, lng: e.target.value }))}
              placeholder="e.g., 79.8612"
            />
          </div>

          <div className="ec-group">
            <label className="ec-label">Service Tags</label>
            <div className="ec-tag-grid">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`ec-tag-chip ${form.tags.includes(tag) ? 'ec-tag-selected' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {center && (
            <div className="ec-group">
              <div className="ec-info-panel">
                <div className="ec-info-item">
                  <strong>Center ID:</strong> {center._id}
                </div>
                <div className="ec-info-item">
                  <strong>Created:</strong> {new Date(center.createdAt || Date.now()).toLocaleString()}
                </div>
                {center.updatedAt && (
                  <div className="ec-info-item">
                    <strong>Last Updated:</strong> {new Date(center.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ec-actions">
            <button type="button" className="ec-btn ec-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ec-btn ec-btn-primary" disabled={loading}>
              {loading ? "Updating..." : "Update Center"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCenter;