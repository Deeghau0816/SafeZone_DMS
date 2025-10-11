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
  const [centersLoading, setCentersLoading] = useState(true);
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
        console.log("Loading centers from:", `${API_BASE}/api/collectingcenters`);
        setCentersLoading(true);
        const res = await fetch(`${API_BASE}/api/collectingcenters`);
        console.log("Centers API response status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log("Centers data received:", data);
          setCenters(data || []);
        } else {
          console.error("Failed to load centers - HTTP error:", res.status);
          setError(`Failed to load centers: ${res.status}`);
        }
      } catch (e) {
        console.error("Failed to load centers:", e);
        setError(`Failed to load centers: ${e.message}`);
      } finally {
        setCentersLoading(false);
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        width: '100%',
        maxWidth: '600px'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close form"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f3f4f6';
            e.target.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
            e.target.style.color = '#6b7280';
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          color: 'white',
          borderRadius: '20px 20px 0 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '200px',
            height: '200px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            transform: 'rotate(45deg)'
          }}></div>
          
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            margin: '0 0 8px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            zIndex: 1
          }}>
            ✏️ Edit Inventory Item
          </h2>
          <p style={{
            fontSize: '1rem',
            margin: '0',
            opacity: '0.9',
            fontWeight: '300',
            position: 'relative',
            zIndex: 1
          }}>
            Update existing relief item details
          </p>
        </div>

        {error && (
          <div style={{
            padding: '16px 24px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            margin: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#dc2626'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          padding: '30px'
        }}>
          {/* Item Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Item Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              name="item"
              value={formData.item || ""}
              onChange={handleItemChange}
              required
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                background: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
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
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Quantity <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity || ""}
              onChange={handleChange}
              min="1"
              required
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                background: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Unit */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Unit <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit || ""}
              readOnly
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                background: '#f8fafc',
                color: '#64748b',
                outline: 'none'
              }}
            />
          </div>

          {/* Collection Center */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Collection Center <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              name="branch"
              value={formData.branch || ""}
              onChange={handleChange}
              required
              disabled={centersLoading}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                background: centersLoading ? '#f8fafc' : '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none',
                opacity: centersLoading ? 0.7 : 1
              }}
              onFocus={(e) => {
                if (!centersLoading) {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">
                {centersLoading ? 'Loading centers...' : 'Select center'}
              </option>
              {centers.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {centersLoading && (
              <div style={{
                marginTop: '8px',
                fontSize: '0.875rem',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Loading collection centers...
              </div>
            )}
            {!centersLoading && centers.length === 0 && (
              <div style={{
                marginTop: '8px',
                fontSize: '0.875rem',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ No collection centers found. Please add centers first.
              </div>
            )}
          </div>

          {/* Date */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date || ""}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                background: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes about this inventory item..."
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                background: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'flex-end',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '14px 28px',
                background: '#f8fafc',
                color: '#374151',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = '#e2e8f0';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = '#f8fafc';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 28px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading ? 'none' : '0 8px 20px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 25px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block'
                  }}>⏳</span>
                  Updating...
                </>
              ) : (
                <>
                  💾 Update Item
                </>
              )}
            </button>
          </div>
        </form>

        {/* Add CSS Animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
