import React, { useState } from "react";

export default function DistributeQuantity({ onClose }) {
  // Initial state for form fields
  const [familiesAssisted, setFamiliesAssisted] = useState(0);
  const [resourcesDistributed, setResourcesDistributed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [date] = useState(new Date().toISOString().slice(0, 10)); // auto-fill current date (YYYY-MM-DD)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validation: resources <= families
    if (parseInt(resourcesDistributed) > parseInt(familiesAssisted)) {
      setMessage("Error: Resources distributed cannot exceed families assisted.");
      setLoading(false);
      return;
    }

    const requestBody = {
      familiesAssisted: parseInt(familiesAssisted),
      resourcesDistributed: parseInt(resourcesDistributed),
      date, // optional: send to backend
    };

    try {
      const response = await fetch("http://localhost:5000/api/distributionrecords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("Distribution record created successfully!");
        setFamiliesAssisted(0);
        setResourcesDistributed(0);
      } else {
        setMessage(`Error: ${data.message || "Failed to create record"}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error("Error creating record:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      
      {/* CSS Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        maxWidth: '500px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideInUp 0.6s ease-out'
      }}>
        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderRadius: '50%',
          transform: 'translate(30px, -30px)',
          zIndex: 1
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderRadius: '50%',
          transform: 'translate(-20px, 20px)',
          zIndex: 1
        }}></div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
            textAlign: 'center',
            marginTop: '0'
          }}>📊 Track Distribution Quantities</h1>
          
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            textAlign: 'center',
            marginBottom: '32px',
            fontWeight: '500'
          }}>Record today's distribution activities and impact</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>👥 Enter Families Assisted</label>
              <input
                type="number"
                value={familiesAssisted}
                onChange={(e) => setFamiliesAssisted(e.target.value)}
                placeholder="Enter number of families assisted"
                min="0"
                required
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '16px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>📦 Enter Resources Distributed</label>
              <input
                type="number"
                value={resourcesDistributed}
                onChange={(e) => setResourcesDistributed(e.target.value)}
                placeholder="Enter number of resources distributed"
                min="0"
                required
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '16px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>📅 Date</label>
              <input 
                type="date" 
                value={date} 
                readOnly 
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  fontSize: '16px',
                  color: '#6b7280',
                  cursor: 'not-allowed',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  border: 'none',
                  background: loading 
                    ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: loading 
                    ? '0 4px 12px rgba(107, 114, 128, 0.3)'
                    : '0 8px 16px rgba(16, 185, 129, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.4)';
                    e.target.style.animation = 'pulse 1.5s infinite';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.3)';
                    e.target.style.animation = 'none';
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Submit Distribution Record
                  </>
                )}
              </button>
            </div>

            {message && (
              <div style={{
                padding: '16px 20px',
                borderRadius: '16px',
                marginTop: '20px',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'slideInUp 0.4s ease-out',
                ...(message.includes("Error") ? {
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '2px solid #fecaca',
                  color: '#991b1b',
                  boxShadow: '0 8px 16px rgba(220, 38, 38, 0.1)'
                } : {
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '2px solid #a7f3d0',
                  color: '#065f46',
                  boxShadow: '0 8px 16px rgba(16, 185, 129, 0.1)'
                })
              }}>
                <span style={{ fontSize: '20px' }}>
                  {message.includes("Error") ? '⚠️' : '✅'}
                </span>
                {message}
              </div>
            )}
          </form>

          {/* Close Button */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              zIndex: 3
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 8px 16px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
