import React, { useEffect, useState, useMemo } from "react";

const EditCenter = ({ center, onClose, onSubmit }) => {
  // simple dark-mode detection for nicer defaults with inline styles
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const theme = useMemo(
    () => ({
      bg: prefersDark ? "#0b0f14" : "#ffffff",
      panel: prefersDark ? "#111827" : "#ffffff",
      text: prefersDark ? "#e5e7eb" : "#111827",
      muted: prefersDark ? "#9ca3af" : "#6b7280",
      border: prefersDark ? "#1f2937" : "#e5e7eb",
      brand: prefersDark ? "#60a5fa" : "#3b82f6",
      brandText: "#ffffff",
      dangerBg: prefersDark ? "#450a0a" : "#fef2f2",
      dangerText: prefersDark ? "#fecaca" : "#7f1d1d",
      overlay: "rgba(0,0,0,.45)",
      chipBg: prefersDark ? "#1f2937" : "#f3f4f6",
      chipSelectedBg: prefersDark ? "#0b4a7a" : "#dbeafe",
      chipSelectedText: prefersDark ? "#bfdbfe" : "#1e40af",
      inputBg: prefersDark ? "#0b0f14" : "#ffffff",
      shadow: prefersDark
        ? "0 10px 30px rgba(0,0,0,.6)"
        : "0 10px 30px rgba(0,0,0,.12)",
    }),
    [prefersDark]
  );

  const styles = useMemo(
    () => ({
      modal: {
        position: "fixed",
        inset: 0,
        background: theme.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      },
      panel: {
        width: "100%",
        maxWidth: 720,
        maxHeight: "90vh",
        overflowY: "auto",
        background: theme.panel,
        color: theme.text,
        borderRadius: 12,
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: `1px solid ${theme.border}`,
      },
      title: {
        margin: 0,
        fontSize: 20,
        fontWeight: 700,
        color: theme.text,
      },
      close: {
        background: "transparent",
        border: "none",
        color: theme.muted,
        fontSize: 24,
        lineHeight: 1,
        cursor: "pointer",
        padding: 4,
      },
      error: {
        margin: "12px 20px 0",
        padding: "10px 12px",
        borderRadius: 8,
        background: theme.dangerBg,
        color: theme.dangerText,
        border: `1px solid ${theme.dangerText}33`,
      },
      form: {
        padding: 20,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      },
      group: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
      },
      label: {
        fontSize: 13,
        fontWeight: 600,
        color: theme.muted,
      },
      input: {
        height: 40,
        borderRadius: 8,
        padding: "0 12px",
        border: `1px solid ${theme.border}`,
        background: theme.inputBg,
        color: theme.text,
        outline: "none",
      },
      tagGrid: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
      },
      tagChip: {
        borderRadius: 999,
        padding: "6px 12px",
        border: `1px solid ${theme.border}`,
        background: theme.chipBg,
        color: theme.text,
        cursor: "pointer",
        fontSize: 13,
      },
      tagChipSelected: {
        background: theme.chipSelectedBg,
        color: theme.chipSelectedText,
        border: `1px solid ${theme.brand}`,
      },
      infoPanel: {
        display: "grid",
        gap: 6,
        padding: 12,
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        background: prefersDark ? "#0f172a" : "#f8fafc",
        color: theme.text,
      },
      infoItem: { fontSize: 13 },
      actions: {
        gridColumn: "1 / -1",
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        paddingTop: 8,
        borderTop: `1px solid ${theme.border}`,
        marginTop: 8,
      },
      btn: {
        height: 40,
        borderRadius: 8,
        padding: "0 14px",
        cursor: "pointer",
        border: `1px solid ${theme.border}`,
        background: theme.inputBg,
        color: theme.text,
      },
      btnSecondary: {},
      btnPrimary: {
        background: theme.brand,
        border: `1px solid ${theme.brand}`,
        color: theme.brandText,
      },
      // Make full-width on small screens
      fullWidth: { gridColumn: "1 / -1" },
    }),
    [theme, prefersDark]
  );

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    lat: "",
    lng: "",
    hours: "",
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Available tags for selection
  const availableTags = [
    "Food",
    "Clothing",
    "Medical",
    "Shelter",
    "Education",
    "Emergency",
    "Disaster Relief",
    "Community",
    "Youth",
    "Elderly",
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
        tags: center.tags || [],
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
        lng: lng ? parseFloat(lng) : null,
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Click outside to close (relies on the className "ec-modal", which we keep)
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
      style={styles.modal}
    >
      <div
        className="ec-panel"
        onMouseDown={(e) => e.stopPropagation()}
        style={styles.panel}
      >
        <div className="ec-header" style={styles.header}>
          <h2 id="ec-title" className="ec-title" style={styles.title}>
            Edit Collection Center
          </h2>
          <button
            type="button"
            className="ec-close"
            onClick={onClose}
            aria-label="Close"
            style={styles.close}
          >
            ×
          </button>
        </div>

        {error && <div className="ec-error" style={styles.error}>{error}</div>}

        <form className="ec-form" onSubmit={handleSubmit} style={styles.form}>
          <div className="ec-group" style={{ ...styles.group, ...styles.fullWidth }}>
            <label className="ec-label" style={styles.label}>
              Center Name *
            </label>
            <input
              className="ec-input"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Community Relief Center"
              required
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={{ ...styles.group, ...styles.fullWidth }}>
            <label className="ec-label" style={styles.label}>
              Address *
            </label>
            <input
              className="ec-input"
              value={form.address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="e.g., 123 Main Street"
              required
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={styles.group}>
            <label className="ec-label" style={styles.label}>
              City *
            </label>
            <input
              className="ec-input"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="e.g., Colombo"
              required
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={styles.group}>
            <label className="ec-label" style={styles.label}>
              Phone Number *
            </label>
            <input
              className="ec-input"
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="e.g., +94 11 123 4567"
              required
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={styles.group}>
            <label className="ec-label" style={styles.label}>
              Operating Hours
            </label>
            <input
              className="ec-input"
              value={form.hours}
              onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))}
              placeholder="e.g., 9AM - 5PM Mon-Fri"
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={styles.group}>
            <label className="ec-label" style={styles.label}>
              Latitude
            </label>
            <input
              className="ec-input"
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
              placeholder="e.g., 6.9271"
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={styles.group}>
            <label className="ec-label" style={styles.label}>
              Longitude
            </label>
            <input
              className="ec-input"
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
              placeholder="e.g., 79.8612"
              style={styles.input}
            />
          </div>

          <div className="ec-group" style={{ ...styles.group, ...styles.fullWidth }}>
            <label className="ec-label" style={styles.label}>
              Service Tags
            </label>
            <div className="ec-tag-grid" style={styles.tagGrid}>
              {availableTags.map((tag) => {
                const selected = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`ec-tag-chip ${selected ? "ec-tag-selected" : ""}`}
                    onClick={() => handleTagToggle(tag)}
                    style={{
                      ...styles.tagChip,
                      ...(selected ? styles.tagChipSelected : null),
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {center && (
            <div className="ec-group" style={{ ...styles.group, ...styles.fullWidth }}>
              <div className="ec-info-panel" style={styles.infoPanel}>
                <div className="ec-info-item" style={styles.infoItem}>
                  <strong>Center ID:</strong> {center._id}
                </div>
                <div className="ec-info-item" style={styles.infoItem}>
                  <strong>Created:</strong>{" "}
                  {new Date(center.createdAt || Date.now()).toLocaleString()}
                </div>
                {center.updatedAt && (
                  <div className="ec-info-item" style={styles.infoItem}>
                    <strong>Last Updated:</strong>{" "}
                    {new Date(center.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ec-actions" style={styles.actions}>
            <button
              type="button"
              className="ec-btn ec-btn-secondary"
              onClick={onClose}
              style={{ ...styles.btn, ...styles.btnSecondary }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ec-btn ec-btn-primary"
              disabled={loading}
              style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.8 : 1 }}
            >
              {loading ? "Updating..." : "Update Center"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCenter;
