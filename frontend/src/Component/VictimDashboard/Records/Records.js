/**
 * Records Component - Professional Analytics Dashboard
 * 
 * @author ITP Development Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./Records.css";

/* ========================================
   Icon Components - Lightweight SVG Icons
   ======================================== */

// Common stroke properties for consistent icon styling
const Stroke = { 
  fill: "none", 
  stroke: "currentColor", 
  strokeWidth: 1.6, 
  strokeLinecap: "round", 
  strokeLinejoin: "round" 
};

/**
 * Download Icon - Used for download buttons
 */
const IconDownload = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...Stroke} />
    <polyline points="7,10 12,15 17,10" {...Stroke} />
    <line x1="12" y1="15" x2="12" y2="3" {...Stroke} />
  </svg>
);

/**
 * Eye Icon - Used for view buttons
 */
const IconEye = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...Stroke} />
    <circle cx="12" cy="12" r="3" {...Stroke} />
  </svg>
);

/**
 * Bar Chart Icon - Used for analytics
 */
const IconBarChart = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
    <line x1="12" y1="20" x2="12" y2="10" {...Stroke} />
    <line x1="18" y1="20" x2="18" y2="4" {...Stroke} />
    <line x1="6" y1="20" x2="6" y2="16" {...Stroke} />
  </svg>
);

/**
 * Pie Chart Icon - Used for analytics
 */
const IconPieChart = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" {...Stroke} />
    <path d="M22 12A10 10 0 0 0 12 2v10z" {...Stroke} />
  </svg>
);

/**
 * Refresh Icon - Used for refresh button
 */
const IconRefresh = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" {...Stroke} />
    <path d="M20 4v6h-6" {...Stroke} />
  </svg>
);

/* ========================================
   Utility Functions
   ======================================== */

/**
 * Extracts array data from various API response formats
 */
const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  
  const data = payload || {};
  
  if (Array.isArray(data.victims)) return data.victims;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.aids)) return data.aids;
  if (Array.isArray(data.claims)) return data.claims;
  if (data.ok && Array.isArray(data.items)) return data.items;
  
  return [];
};


/**
 * Formats date for chart labels
 */
const fmtDate = (value) => {
  if (!value) return "";
  
  try {
    return new Date(value).toLocaleDateString(undefined, { 
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return "";
  }
};

/**
 * Simple Bar Chart Component
 */
const SimpleBarChart = ({ data, title, color = "#3b82f6" }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="chart-container">
      <h4 className="chart-title">{title}</h4>
      <div className="bar-chart">
        {data.map((item, index) => (
          <div key={index} className="bar-item">
            <div className="bar-label">{item.label}</div>
            <div className="bar-wrapper">
              <div 
                className="bar" 
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color
                }}
              />
              <span className="bar-value">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Simple Pie Chart Component
 */
const SimplePieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;
  
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  
  return (
    <div className="chart-container">
      <h4 className="chart-title">{title}</h4>
      <div className="pie-chart">
        <div className="pie-svg">
          <svg viewBox="0 0 100 100" className="pie-svg-element">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = (cumulativePercentage / 100) * 360;
              const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
              
              const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
              
              const largeArcFlag = percentage > 50 ? 1 : 0;
              const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
              
              cumulativePercentage += percentage;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>
        </div>
        <div className="pie-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="legend-label">{item.label}</span>
              <span className="legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ========================================
   Main Component
   ======================================== */

/**
 * Records - Analytics dashboard component
 */
export default function Records() {
  // ========================================
  // State Management
  // ========================================
  
  const [loading, setLoading] = useState(true);
  const [reportList, setReportList] = useState([]);
  const [aidList, setAidList] = useState([]);
  const [claimList, setClaimList] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  // ========================================
  // Data Fetching Functions
  // ========================================

  const load = async () => {
    try {
      setLoading(true);
      
      const [reportsRes, aidsRes, claimsRes] = await Promise.allSettled([
        axios.get("http://localhost:5000/victims"),
        axios.get("http://localhost:5000/aids"),
        axios.get("http://localhost:5000/damage"),
      ]);
      
      setReportList(reportsRes.status === "fulfilled" ? pickArray(reportsRes.value.data) : []);
      setAidList(aidsRes.status === "fulfilled" ? pickArray(aidsRes.value.data) : []);
      setClaimList(claimsRes.status === "fulfilled" ? pickArray(claimsRes.value.data) : []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setReportList([]);
      setAidList([]);
      setClaimList([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // Effects
  // ========================================

  useEffect(() => { 
    load(); 
  }, []);

  // ========================================
  // Analytics Functions
  // ========================================

  /**
   * Get disaster type distribution
   */
  const getDisasterTypeDistribution = () => {
    const distribution = {};
    reportList.forEach(report => {
      const type = report.disasterType || 'Unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([label, value]) => ({ label, value }));
  };

  /**
   * Get aid type distribution
   */
  const getAidTypeDistribution = () => {
    const distribution = {};
    aidList.forEach(aid => {
      const type = aid.aidType || 'Unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([label, value]) => ({ label, value }));
  };

  /**
   * Get damage type distribution
   */
  const getDamageTypeDistribution = () => {
    const distribution = {};
    claimList.forEach(claim => {
      const type = claim.damageType || 'Unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([label, value]) => ({ label, value }));
  };

  /**
   * Get daily submission trends
   */
  const getDailyTrends = () => {
    const trends = {};
    const allRecords = [
      ...reportList.map(r => ({ ...r, type: 'Reports' })),
      ...aidList.map(a => ({ ...a, type: 'Aid' })),
      ...claimList.map(c => ({ ...c, type: 'Claims' }))
    ];

    allRecords.forEach(record => {
      const date = new Date(record.createdAt || record.date || record.requestedAt);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!trends[dateKey]) {
        trends[dateKey] = { Reports: 0, Aid: 0, Claims: 0 };
      }
      trends[dateKey][record.type]++;
    });

    return Object.entries(trends)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-7) // Last 7 days
      .map(([date, counts]) => ({
        label: fmtDate(date),
        Reports: counts.Reports,
        Aid: counts.Aid,
        Claims: counts.Claims
      }));
  };

  /**
   * Get risk level distribution
   */
  const getRiskLevelDistribution = () => {
    const distribution = { High: 0, Medium: 0, Low: 0 };
    reportList.forEach(report => {
      const risk = report.status || 'Medium';
      distribution[risk] = (distribution[risk] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([label, value]) => ({ label, value }));
  };

  /**
   * Get urgency distribution for aid
   */
  const getUrgencyDistribution = () => {
    const distribution = { Critical: 0, High: 0, Normal: 0 };
    aidList.forEach(aid => {
      const urgency = aid.urgency || 'Normal';
      distribution[urgency] = (distribution[urgency] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([label, value]) => ({ label, value }));
  };

  /**
   * Calculate total estimated loss
   */
  const getTotalEstimatedLoss = () => {
    return claimList.reduce((total, claim) => total + (claim.estimatedLoss || 0), 0);
  };

  /**
   * Download data as CSV
   */
  const downloadCSV = (data, filename) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // ========================================
  // Computed Values
  // ========================================

  const disasterTypes = getDisasterTypeDistribution();
  const aidTypes = getAidTypeDistribution();
  const damageTypes = getDamageTypeDistribution();
  const dailyTrends = getDailyTrends();
  const riskLevels = getRiskLevelDistribution();
  const urgencyLevels = getUrgencyDistribution();
  const totalLoss = getTotalEstimatedLoss();

  // ========================================
  // Render
  // ========================================

  return (
    <main className="records-dashboard container light-theme">
      {/* ========================================
           Header Section
           ======================================== */}
      <header className="records-header">
        <div className="header-content">
          <h1>📊 Records & Analytics</h1>
          <p>Comprehensive analysis of emergency management data</p>
        </div>
        <div className="header-actions">
          <select 
            className="period-selector"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button 
            className="btn btn--ghost" 
            onClick={load} 
            disabled={loading}
          >
            <IconRefresh /> 
            <span>{loading ? "Loading…" : "Refresh"}</span>
          </button>
          <Link to="/victim/reports" className="btn btn--secondary">
            Back 
          </Link>
        </div>
      </header>

      {/* ========================================
           Summary Cards Section
           ======================================== */}
      <section className="summary-cards">
        <div className="summary-card">
          <div className="card-icon reports">
            <IconBarChart />
          </div>
          <div className="card-content">
            <h3>{reportList.length}</h3>
            <p>Disaster Reports</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon aid">
            <IconPieChart />
          </div>
          <div className="card-content">
            <h3>{aidList.length}</h3>
            <p>Aid Requests</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon claims">
            <IconBarChart />
          </div>
          <div className="card-content">
            <h3>{claimList.length}</h3>
            <p>Damage Claims</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon loss">
            <IconPieChart />
          </div>
          <div className="card-content">
            <h3>Rs. {totalLoss.toLocaleString()}</h3>
            <p>Total Estimated Loss</p>
          </div>
        </div>
      </section>

      {/* ========================================
           Charts Section
           ======================================== */}
      <section className="charts-section">
        <div className="charts-grid">
          {/* Disaster Types Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Disaster Types Distribution</h3>
              <div className="chart-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadCSV(reportList, 'disaster-reports')}
                  title="Download data"
                >
                  <IconDownload />
                </button>
                <Link to="/victim/read" className="btn-icon" title="View details">
                  <IconEye />
                </Link>
              </div>
            </div>
            <SimplePieChart data={disasterTypes} title="Disaster Types" />
          </div>

          {/* Aid Types Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Aid Types Distribution</h3>
              <div className="chart-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadCSV(aidList, 'aid-requests')}
                  title="Download data"
                >
                  <IconDownload />
                </button>
                <Link to="/victim/aid/records" className="btn-icon" title="View details">
                  <IconEye />
                </Link>
              </div>
            </div>
            <SimpleBarChart data={aidTypes} title="Aid Types" color="#10b981" />
          </div>

          {/* Damage Types Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Damage Types Distribution</h3>
              <div className="chart-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadCSV(claimList, 'damage-claims')}
                  title="Download data"
                >
                  <IconDownload />
                </button>
                <Link to="/victim/claim/records" className="btn-icon" title="View details">
                  <IconEye />
                </Link>
              </div>
            </div>
            <SimplePieChart data={damageTypes} title="Damage Types" />
          </div>

          {/* Risk Levels Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Risk Level Distribution</h3>
              <div className="chart-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadCSV(reportList, 'risk-levels')}
                  title="Download data"
                >
                  <IconDownload />
                </button>
                <Link to="/victim/read" className="btn-icon" title="View details">
                  <IconEye />
                </Link>
              </div>
            </div>
            <SimpleBarChart data={riskLevels} title="Risk Levels" color="#f59e0b" />
          </div>

          {/* Urgency Levels Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Aid Urgency Distribution</h3>
              <div className="chart-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadCSV(aidList, 'aid-urgency')}
                  title="Download data"
                >
                  <IconDownload />
                </button>
                <Link to="/victim/aid/records" className="btn-icon" title="View details">
                  <IconEye />
                </Link>
              </div>
            </div>
            <SimpleBarChart data={urgencyLevels} title="Urgency Levels" color="#ef4444" />
          </div>

          {/* Daily Trends Chart */}
          <div className="chart-card chart-wide">
            <div className="chart-header">
              <h3>Daily Submission Trends</h3>
              <div className="chart-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadCSV(dailyTrends, 'daily-trends')}
                  title="Download data"
                >
                  <IconDownload />
                </button>
              </div>
            </div>
            <div className="trends-chart">
              <div className="trends-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#3b82f6' }} />
                  <span>Reports</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
                  <span>Aid</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#8b5cf6' }} />
                  <span>Claims</span>
                </div>
              </div>
              <div className="trends-bars">
                {dailyTrends.map((day, index) => {
                  const maxValue = Math.max(day.Reports, day.Aid, day.Claims);
                  return (
                    <div key={index} className="trend-day">
                      <div className="day-label">{day.label}</div>
                      <div className="day-bars">
                        <div 
                          className="day-bar reports" 
                          style={{ height: `${(day.Reports / maxValue) * 100}%` }}
                        />
                        <div 
                          className="day-bar aid" 
                          style={{ height: `${(day.Aid / maxValue) * 100}%` }}
                        />
                        <div 
                          className="day-bar claims" 
                          style={{ height: `${(day.Claims / maxValue) * 100}%` }}
                        />
                      </div>
                      <div className="day-values">
                        <span>{day.Reports}</span>
                        <span>{day.Aid}</span>
                        <span>{day.Claims}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
           Quick Actions Section
           ======================================== */}
      <section className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <Link to="/victim/read" className="action-card">
            <IconBarChart />
            <h4>View All Reports</h4>
            <p>Browse detailed disaster reports</p>
          </Link>
          
          <Link to="/victim/aid/records" className="action-card">
            <IconPieChart />
            <h4>View Aid Requests</h4>
            <p>Review aid request details</p>
          </Link>
          
          <Link to="/victim/claim/records" className="action-card">
            <IconBarChart />
            <h4>View Damage Claims</h4>
            <p>Examine damage claim records</p>
          </Link>
          
          <button 
            className="action-card"
            onClick={() => {
              const allData = [...reportList, ...aidList, ...claimList];
              downloadCSV(allData, 'complete-records');
            }}
          >
            <IconDownload />
            <h4>Download All Data</h4>
            <p>Export complete dataset</p>
          </button>
        </div>
      </section>
    </main>
  );
}
