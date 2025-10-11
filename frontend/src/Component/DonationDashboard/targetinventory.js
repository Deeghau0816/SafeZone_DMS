// frontend/src/Component/DonationDashboard/targetinventory.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DonationSidebar from "./DonationSidebar";   // <--- import sidebar
import "./donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function TargetInventory() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current DB values
  useEffect(() => {
    const loadTargets = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/targetinventories`);
        if (!res.ok) throw new Error("Failed to fetch targets");
        const data = await res.json();

        // Keep only item fields
        const { _id, __v, createdAt, updatedAt, ...clean } = data || {};
        setTargets(clean);
      } catch (err) {
        console.error("Failed to load targets", err);
      } finally {
        setLoading(false);
      }
    };
    loadTargets();
  }, []);

  // Handle input change
  const handleChange = (key, value) => {
    setTargets((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/targetinventories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("✅ Targets updated successfully!");
      navigate("/dashboard/inventory");
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Failed to save targets");
    } finally {
      setSaving(false);
    }
  };

  // Labels + Units
  const itemConfig = {
    dry_rations: { label: "Dry Rations", unit: "packs" },
    water: { label: "Water", unit: "liters" },
    bedding: { label: "Bedding", unit: "sets" },
    medical: { label: "Medical Supplies", unit: "kits" },
    clothing: { label: "Clothing", unit: "sets" },
    hygiene: { label: "Hygiene Kits", unit: "packs" },
  };

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}
      </style>
      <div className="dashboard-layout">
        {/* Sidebar */}
        <DonationSidebar />

        {/* Main content */}
        <main className="dashboard-main">
          <div style={{ maxWidth: '1200px', margin: '0 auto 80px', padding: '80px 16px 12px' }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              border: 'none',
              borderRadius: '20px',
              padding: '22px',
              marginBottom: '18px',
              boxShadow: '0 20px 40px rgba(59, 130, 246, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div>
                <h1 style={{
                  margin: '0 0 6px',
                  fontSize: '44px',
                  lineHeight: '1.1',
                  fontWeight: '900',
                  letterSpacing: '-0.02em',
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  zIndex: 2
                }}>
                  🎯 Set Inventory Targets
                </h1>
                <p style={{
                  fontSize: '16.5px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: '0',
                  position: 'relative',
                  zIndex: 2
                }}>
                  Configure target quantities for each relief item
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 2 }}>
                <button 
                  className="dd-btn dd-btn-ghost" 
                  onClick={() => navigate(-1)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Cancel
                </button>
                <button
                  className="dd-btn dd-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: 'white',
                    boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  {saving ? "Saving..." : "Save Targets"}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                borderRadius: '20px',
                color: 'white',
                marginTop: '24px'
              }}>
                <div style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '3px solid #f3f3f3',
                  borderTop: '3px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: '500' }}>
                  Loading current targets...
                </p>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                borderRadius: '24px',
                padding: '32px',
                marginTop: '24px',
                boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '24px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {Object.keys(itemConfig).map((key) => (
                    <div 
                      key={key} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        padding: '28px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        height: '4px',
                        background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #ef4444, #8b5cf6, #06b6d4)',
                        backgroundSize: '200% 100%',
                        animation: 'gradientShift 3s ease-in-out infinite'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '24px'
                      }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                          boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {key === 'dry_rations' && '🍞'}
                          {key === 'water' && '💧'}
                          {key === 'bedding' && '🛏️'}
                          {key === 'medical' && '🏥'}
                          {key === 'clothing' && '👕'}
                          {key === 'hygiene' && '🧴'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#2d3748',
                            margin: '0 0 4px 0',
                            background: 'linear-gradient(135deg, #2d3748, #4a5568)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}>
                            {itemConfig[key].label}
                          </h3>
                          <p style={{
                            fontSize: '14px',
                            color: '#718096',
                            margin: '0',
                            fontWeight: '500'
                          }}>
                            Unit: {itemConfig[key].unit}
                          </p>
                        </div>
                      </div>
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <input
                          type="number"
                          min="0"
                          value={targets[key] || ""}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder="0"
                          style={{
                            flex: 1,
                            padding: '16px 20px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#2d3748',
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                            e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                            e.target.style.transform = 'scale(1.02)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.boxShadow = 'none';
                            e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                            e.target.style.transform = 'scale(1)';
                          }}
                        />
                        <span style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          whiteSpace: 'nowrap'
                        }}>
                          {itemConfig[key].unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
