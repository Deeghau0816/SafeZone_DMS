import React, { useState, useEffect } from "react";
import "./donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const ITEM_OPTIONS = [
  { value: "dry_rations", label: "Dry rations", unit: "packs" },
  { value: "water", label: "Water", unit: "liters" },
  { value: "bedding", label: "Bedding", unit: "sets" },
  { value: "medical", label: "Medical kits", unit: "kits" },
  { value: "clothing", label: "Clothing", unit: "sets" },
  { value: "hygiene", label: "Hygiene packs", unit: "packs" },
];

export default function EditReliefForm({ editingItem, onClose, onSuccess }) {
  const [formData, setFormData] = useState(editingItem || {});
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingItem) {
      setFormData({
        ...editingItem,
        date: editingItem.date
          ? new Date(editingItem.date).toISOString().split("T")[0]
          : "",
      });
    }

    const loadCenters = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/collectingcenters`);
        if (res.ok) {
          const data = await res.json();
          setCenters(data || []);
        }
      } catch (e) {
        console.error("Failed to load centers:", e);
      }
    };
    loadCenters();
  }, [editingItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (e) => {
    const selected = ITEM_OPTIONS.find((o) => o.value === e.target.value);
    setFormData((prev) => ({
      ...prev,
      item: selected?.value || "",
      unit: selected?.unit || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/inventory/${editingItem._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      window.dispatchEvent(new CustomEvent("inventory:updated"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      setError(err.message || "Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="edit-form-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="edit-form-container">
        {/* Top-right Close Button */}
        <button
          className="edit-form-close"
          onClick={onClose}
          aria-label="Close form"
        >
          &times;
        </button>

        <h2 className="edit-form-title">Edit Inventory Item</h2>
        {error && <div className="edit-form-error">{error}</div>}

        <form className="edit-form" onSubmit={handleSubmit}>
          {/* Item Type */}
          <label className="edit-form-label">
            Item Type <span className="required">*</span>
            <select
              name="item"
              value={formData.item || ""}
              onChange={handleItemChange}
              className="edit-form-input"
              required
            >
              <option value="">Select item type</option>
              {ITEM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Quantity */}
          <label className="edit-form-label">
            Quantity <span className="required">*</span>
            <input
              type="number"
              name="quantity"
              value={formData.quantity || ""}
              onChange={handleChange}
              min="1"
              required
              className="edit-form-input"
            />
          </label>

          {/* Unit */}
          <label className="edit-form-label">
            Unit <span className="required">*</span>
            <input
              type="text"
              name="unit"
              value={formData.unit || ""}
              readOnly
              className="edit-form-input"
            />
          </label>

          {/* Collection Center */}
          <label className="edit-form-label">
            Collection Center <span className="required">*</span>
            <select
              name="branch"
              value={formData.branch || ""}
              onChange={handleChange}
              className="edit-form-input"
              required
            >
              <option value="">Select center</option>
              {centers.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Date */}
          <label className="edit-form-label">
            Date
            <input
              type="date"
              name="date"
              value={formData.date || ""}
              onChange={handleChange}
              className="edit-form-input"
            />
          </label>

          {/* Notes */}
          <label className="edit-form-label">
            Notes
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              className="edit-form-textarea"
            />
          </label>

          {/* Actions */}
          <div className="edit-form-actions">
            <button
              type="button"
              className="edit-form-btn edit-form-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-form-btn edit-form-btn-save"
              disabled={loading}
            >
              {loading ? <span className="edit-form-spinner"></span> : "Update Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
