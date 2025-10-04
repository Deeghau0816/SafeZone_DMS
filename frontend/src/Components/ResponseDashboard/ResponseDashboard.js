import React, { useEffect, useMemo, useState } from "react";

export default function ResponseDashboard() {
  const [active, setActive] = useState("dashboard"); // "dashboard" | "Army" | "Police" | "Fire Brigade"
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deploymentStatus, setDeploymentStatus] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");
    fetch("http://localhost:5000/deployments")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (!mounted) return;
        setItems(Array.isArray(data?.deployments) ? data.deployments : []);
      })
      .catch(() => mounted && setErr("Failed to load deployments"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  
  // Load saved deployment statuses from localStorage
  useEffect(() => {
    const savedStatuses = localStorage.getItem('deploymentStatuses');
    if (savedStatuses) {
      setDeploymentStatus(JSON.parse(savedStatuses));
    }
  }, []);

  const byTeam = useMemo(() => ({
    Army: items.filter((d) => d.team === "Army"),
    Police: items.filter((d) => d.team === "Police"),
    "Fire Brigade": items.filter((d) => d.team === "Fire Brigade"),
  }), [items]);
  
  // Function to update deployment status
  const updateDeploymentStatus = (id, status) => {
    const newStatus = { ...deploymentStatus, [id]: status };
    setDeploymentStatus(newStatus);
    localStorage.setItem('deploymentStatuses', JSON.stringify(newStatus));
  };

  // Function to share live location
  const shareLiveLocation = (deployment) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          
          // Create location data object
          const locationData = {
            deploymentId: deployment._id,
            team: deployment.team,
            teamName: deployment.teamName || 'Unnamed',
            latitude: latitude,
            longitude: longitude,
            lastUpdated: new Date().toLocaleString(),
            status: deploymentStatus[deployment._id] || "Pending"
          };
          
          // Save to backend API
          fetch('http://localhost:5000/teamLocations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locationData)
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Trigger custom event to notify DMO Dashboard
              window.dispatchEvent(new Event('teamsUpdated'));
              
              // Copy to clipboard
              navigator.clipboard.writeText(locationUrl).then(() => {
                alert(`Live location shared successfully!\nLat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}\n\nDeployment: ${deployment.team} - ${deployment.teamName || 'Unnamed'}\n\nLocation is now visible on DMO Dashboard map.`);
              }).catch(() => {
                alert(`Location shared successfully!\nLocation: ${locationUrl}\n\nLocation is now visible on DMO Dashboard map.`);
              });
            } else {
              alert('Failed to share location. Please try again.');
            }
          })
          .catch(error => {
            console.error('Error sharing location:', error);
            alert('Failed to share location. Please try again.');
          });
        },
        (error) => {
          alert('Unable to retrieve location. Please enable location services.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const total = items.length;
  const kpi = {
    Army: byTeam.Army.length,
    Police: byTeam.Police.length,
    FireBrigade: byTeam["Fire Brigade"].length,
  };

  const list = active === "Army" ? byTeam.Army
    : active === "Police" ? byTeam.Police
    : active === "Fire Brigade" ? byTeam["Fire Brigade"]
    : items;

  return (
    <main style={{ display: "flex", minHeight: "calc(100vh - 120px)" }}>
      <aside style={{ width: 240, borderRight: "1px solid #e5e9f1", padding: 16, background: "#f9fbff" }}>
        <h2 style={{ margin: "0 0 24px 0", fontSize: 18 }}>Team Dashboard</h2>
        <nav>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <button
                onClick={() => setActive("dashboard")}
                className={active === "dashboard" ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                aria-current={active === "dashboard" ? "page" : undefined}
                style={{ 
                  width: "100%", 
                  textAlign: "left", 
                  padding: "10px 12px", 
                  borderRadius: 8, 
                  marginBottom: 24,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  transform: "translateZ(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Dashboard
              </button>
            </li>
            {(["Army","Police","Fire Brigade"]).map((t) => (
              <li key={t}>
                <button
                  onClick={() => setActive(t)}
                  className={active === t ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                  aria-current={active === t ? "page" : undefined}
                  style={{ 
                    width: "100%", 
                    textAlign: "left", 
                    padding: "10px 12px", 
                    borderRadius: 8, 
                    marginBottom: 16,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    transition: "all 0.3s ease",
                    transform: "translateZ(0)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                    e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section style={{ flex: 1, padding: 16 }}>
        {loading && <div>Loading deployments…</div>}
        {err && <div style={{ color: "#b91c1c" }}>{err}</div>}

        {!loading && !err && active === "dashboard" && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            <div 
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <div style={kpiLabel}>Total Deployments</div><div style={kpiValue}>{total}</div>
            </div>
            <div 
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <div style={kpiLabel}>Army</div><div style={kpiValue}>{kpi.Army}</div>
            </div>
            <div 
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <div style={kpiLabel}>Police</div><div style={kpiValue}>{kpi.Police}</div>
            </div>
            <div 
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <div style={kpiLabel}>Fire Brigade</div><div style={kpiValue}>{kpi.FireBrigade}</div>
            </div>
          </div>
          
          {/* Pie Charts Section */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 48 }}>
            {["Army", "Police", "Fire Brigade"].map((team) => {
              const teamItems = byTeam[team];
              const pending = teamItems.filter(it => (deploymentStatus[it._id] || "Pending") === "Pending").length;
              const inProgress = teamItems.filter(it => deploymentStatus[it._id] === "In Progress").length;
              const completed = teamItems.filter(it => deploymentStatus[it._id] === "Completed").length;
              const total = teamItems.length;
              
              return (
                <div 
                  key={team}
                  style={{
                    background: "#ffffff",
                    border: "2px solid #d1d5db",
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    transition: "all 0.3s ease",
                    transform: "translateZ(0)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                    e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  }}
                >
                  <h3 style={{ margin: "0 0 12px 0", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 16, fontWeight: 600, color: "#1f2937", textAlign: "center" }}>{team}</h3>
                  
                  {/* Donut Chart */}
                  <div style={{ width: 120, height: 120, margin: "0 auto 16px", position: "relative" }}>
                    {total === 0 ? (
                      <div style={{ width: 120, height: 120, borderRadius: "50%", backgroundColor: "#f3f4f6" }}></div>
                    ) : (
                      <div style={{ 
                        width: 120, 
                        height: 120, 
                        borderRadius: "50%",
                        background: `conic-gradient(
                          #fb923c 0deg ${(pending / total) * 360}deg,
                          #60a5fa ${(pending / total) * 360}deg ${((pending + inProgress) / total) * 360}deg,
                          #4ade80 ${((pending + inProgress) / total) * 360}deg 360deg
                        )`,
                        position: "relative"
                      }}>
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 70,
                          height: 70,
                          borderRadius: "50%",
                          backgroundColor: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#1f2937"
                        }}>
                          {total}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 16, height: 16, backgroundColor: "#fb923c", borderRadius: 4 }}></div>
                        <span>Pending</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{pending}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 16, height: 16, backgroundColor: "#60a5fa", borderRadius: 4 }}></div>
                        <span>In Progress</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{inProgress}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 16, height: 16, backgroundColor: "#4ade80", borderRadius: 4 }}></div>
                        <span>Completed</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{completed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {!loading && !err && active !== "dashboard" && (
          <div style={{ display: "grid", gap: 12 }}>
            {list.length === 0 ? (
              <div>No deployments for {active}.</div>
            ) : (
              list.map((it) => (
                <article 
                  key={it._id} 
                  style={{ 
                    background: "#fff", 
                    border: "2px solid #d1d5db", 
                    borderRadius: 12, 
                    padding: 16,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    transition: "all 0.3s ease",
                    transform: "translateZ(0)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                    e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  }}
                >
                  <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 18, fontWeight: 600, color: "#1f2937" }}>{it.team} • {it.teamName || "Unnamed"}</h3>
                    <span className={`ra-pill ra-pill--${String(it.urgent || "medium").toLowerCase()}`}>{it.urgent || "Medium"}</span>
                  </header>
                  <dl style={{ display: "grid", gridTemplateColumns: "1fr 2fr", rowGap: 16, columnGap: 20, margin: 0 }}>
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Report ID</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.reportId || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>DMO Contact</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.contact || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Notes</dt>
                    <dd style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, color: "#1f2937", lineHeight: 1.6, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.notes || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Special</dt>
                    <dd style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, color: "#1f2937", lineHeight: 1.6, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.specialInstructions || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Created</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{new Date(it.createdAt).toLocaleString()}</dd>
                    
                    {it.updatedAt && (<><dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Updated</dt><dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{new Date(it.updatedAt).toLocaleString()}</dd></>)}
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Status</dt>
                    <dd style={{ margin: 0 }}>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button 
                          onClick={() => updateDeploymentStatus(it._id, "Pending")}
                          style={{ 
                            padding: "8px 16px", 
                            borderRadius: "6px", 
                            border: "none",
                            backgroundColor: deploymentStatus[it._id] === "Pending" ? "#f97316" : "#fed7aa",
                            color: deploymentStatus[it._id] === "Pending" ? "#ffffff" : "#9a3412",
                            fontWeight: deploymentStatus[it._id] === "Pending" ? "600" : "500",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            transition: "all 0.3s ease",
                            transform: "translateZ(0)",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(249, 115, 22, 0.3), 0 4px 6px -2px rgba(249, 115, 22, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                            e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                          }}
                        >
                          Pending
                        </button>
                        <button 
                          onClick={() => updateDeploymentStatus(it._id, "In Progress")}
                          style={{ 
                            padding: "8px 16px", 
                            borderRadius: "6px", 
                            border: "none",
                            backgroundColor: deploymentStatus[it._id] === "In Progress" ? "#3b82f6" : "#bfdbfe",
                            color: deploymentStatus[it._id] === "In Progress" ? "#ffffff" : "#1e3a8a",
                            fontWeight: deploymentStatus[it._id] === "In Progress" ? "600" : "500",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            transition: "all 0.3s ease",
                            transform: "translateZ(0)",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                            e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                          }}
                        >
                          In Progress
                        </button>
                        <button 
                          onClick={() => updateDeploymentStatus(it._id, "Completed")}
                          style={{ 
                            padding: "8px 16px", 
                            borderRadius: "6px", 
                            border: "none",
                            backgroundColor: deploymentStatus[it._id] === "Completed" ? "#22c55e" : "#bbf7d0",
                            color: deploymentStatus[it._id] === "Completed" ? "#ffffff" : "#14532d",
                            fontWeight: deploymentStatus[it._id] === "Completed" ? "600" : "500",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            transition: "all 0.3s ease",
                            transform: "translateZ(0)",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                            e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                          }}
                        >
                          Completed
                        </button>
                      </div>
                    </dd>
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Location</dt>
                    <dd style={{ margin: 0 }}>
                      <button 
                        onClick={() => shareLiveLocation(it)}
                        style={{ 
                          padding: "10px 20px", 
                          borderRadius: "8px", 
                          border: "none",
                          backgroundColor: "#3b82f6",
                          color: "#ffffff",
                          fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          transition: "all 0.3s ease",
                          transform: "translateZ(0)",
                          fontSize: "14px",
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#2563eb";
                          e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                          e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.4), 0 4px 6px -2px rgba(59, 130, 246, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#3b82f6";
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                          e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                        }}
                      >
                        📍 Share Live Location
                      </button>
                    </dd>
                  </dl>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}

const cardStyle = { background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", transition: "all 0.3s ease", transform: "translateZ(0)" };
const kpiLabel = { fontSize: 12, color: "#6b7280", marginBottom: 6 };
const kpiValue = { fontSize: 28, fontWeight: 700 };


