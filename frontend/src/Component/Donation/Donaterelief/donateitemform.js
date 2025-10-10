import React, { useState, useEffect } from "react";
import "./donateitemform.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const ITEM_OPTIONS = [
  { value: "dry_rations", label: "Dry rations", unit: "packs" },
  { value: "water", label: "Water", unit: "liters" },
  { value: "bedding", label: "Bedding", unit: "sets" },
  { value: "medical", label: "Medical kits", unit: "kits" },
  { value: "clothing", label: "Clothing", unit: "sets" },
  { value: "hygiene", label: "Hygiene packs", unit: "packs" },
];

export default function DonateItemForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    item: "",
    quantity: "",
    unit: "",
    branch: "",
    notes: "",
    date: "",
  });
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /** ---------- Load Centers ---------- */
  useEffect(() => {
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
  }, []);

  /** ---------- Form Handlers ---------- */
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
    setError("");
    setLoading(true);

    if (!formData.item || !formData.quantity || !formData.unit || !formData.branch) {
      setError("Please fill all required fields");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
        }),
      });

      if (!res.ok) throw new Error(`Save failed (${res.status})`);

      // ✅ Refresh parent (InventoryPanel) tables & charts
      if (onSuccess) onSuccess();

      // ✅ Close modal
      if (onClose) onClose();

    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  /** ---------- UI ---------- */
  return (
    <div
      className="donate-form-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="donate-form-container">
        {/* Close (×) Button */}
        <button
          className="donate-form-close"
          onClick={onClose}
          aria-label="Close form"
        >
          &times;
        </button>

        <h2>Add Inventory Item</h2>

        {error && <div className="donate-form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Item Type */}
          <div className="form-group">
            <label>Item Type *</label>
            <select
              name="item"
              value={formData.item}
              onChange={handleItemChange}
              required
            >
              <option value="">Select item type</option>
              {ITEM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="form-group">
            <label>Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          {/* Unit */}
          <div className="form-group">
            <label>Unit *</label>
            <input type="text" name="unit" value={formData.unit} readOnly />
          </div>

          {/* Center */}
          <div className="form-group">
            <label>Collection Center *</label>
            <select
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              required
            >
              <option value="">Select center</option>
              {centers.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Saving..." : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
