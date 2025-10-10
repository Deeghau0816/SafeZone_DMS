import React, { useEffect, useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import "./donationcss/overview.css"; 

const API_BASE = "http://localhost:5000/api"; 

// Helper to determine if a volunteer matches an operation
const volMatchesOperation = (vol, op) => {
  const opId = String(op?._id || "");
  const volOpId = String(vol?.operationId || "");
  if (opId && volOpId && opId === volOpId) return true;
  const opName = (op?.operationName || "").trim().toLowerCase();
  const assignedTo = (vol?.assignedTo || "").trim().toLowerCase();
  return !!(opName && assignedTo && opName === assignedTo);
};

/* =========================================================================
    CHART COMPONENTS
   ========================================================================= */

// Top 5 Operations by Volunteer Need
function TopVolsChart({ operations }) {
  const opsWithVols = operations.filter(op => op.volunteerCount && Number(op.volunteerCount) > 0);
  const chartData = opsWithVols.map(op => ({
      name: op.operationName,
      volunteers: Number(op.volunteerCount) || 0,
  })).sort((a, b) => b.volunteers - a.volunteers).slice(0, 5); 

  if (chartData.length === 0) {
    return (
      <div className="dd-chart-card dd-chart-bar dd-grid-span-2"> 
        <h4 className="dd-chart-title">Top 5 Operations by Volunteer Need</h4>
        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#999' }}>No operations currently require volunteers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-chart-card dd-chart-bar">
      <h4 className="dd-chart-title">Top 5 Operations by Volunteer Need</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" stroke="#666" style={{ fontSize: '0.75rem' }} hide={true} />
          <YAxis stroke="#666" style={{ fontSize: '0.75rem' }} />
          <Tooltip 
            contentStyle={{ fontSize: '0.8rem', backgroundColor: '#fff', border: '1px solid #ccc' }} 
            formatter={(value, name, props) => [`${value} Volunteers`, props.payload.name]}
          />
          <Bar dataKey="volunteers" fill="#7b1fa2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="dd-chart-footer">Volunteer needs across operations.</p>
    </div>
  );
}

// Volunteer Type Ratio (PieChart)
const PIE_COLORS_VOL = ['#4285f4', '#ea4335']; 
function TeamRatioChart({ teamLeads, individualVols }) {
  const total = teamLeads + individualVols;
  if (total === 0) {
    return (
      <div className="dd-chart-card dd-chart-pie">
        <h4 className="dd-chart-title">Volunteer Type Breakdown</h4>
        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#999' }}>No data for assigned volunteers.</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Team Leads', value: teamLeads },
    { name: 'Individuals', value: individualVols },
  ];
  const teamRatio = ((teamLeads / total) * 100).toFixed(0);

  return (
    <div className="dd-chart-card dd-chart-pie">
      <h4 className="dd-chart-title">Volunteer Type Breakdown: {teamRatio}% Team Leads</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS_VOL[index % PIE_COLORS_VOL.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ fontSize: '0.8rem', backgroundColor: '#fff', border: '1px solid #ccc' }} 
            formatter={(value, name, props) => [`${value} Volunteers`, props.payload.name]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="dd-chart-footer">Assigned volunteer types for operations.</p>
    </div>
  );
}

// Collection Center Tag Distribution (PieChart)
const PIE_COLORS_TAGS = ['#00c49f', '#ffbb28', '#ff8042', '#83a6ed', '#8dd1e1']; 
function TagDistributionChart({ centers }) {
  // Ensure centers is always an array
  const centersArray = Array.isArray(centers) ? centers : [];
  
  const tagCounts = centersArray.reduce((acc, center) => {
    (center.tags || []).forEach(tag => {
      const cleanTag = tag.trim().toUpperCase();
      acc[cleanTag] = (acc[cleanTag] || 0) + 1;
    });
    return acc;
  }, {});

  const sortedTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
  const chartData = sortedTags.map(([name, value]) => ({ name, value }));
  const totalCenters = centersArray.length;

  if (totalCenters === 0) {
    return (
      <div className="dd-chart-card dd-chart-pie">
        <h4 className="dd-chart-title">Center Tag Distribution</h4>
        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#999' }}>No centers found to analyze tags.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-chart-card dd-chart-pie">
      <h4 className="dd-chart-title">Top 5 Collection Center Tags</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS_TAGS[index % PIE_COLORS_TAGS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ fontSize: '0.8rem', backgroundColor: '#fff', border: '1px solid #ccc' }} 
            formatter={(value, name) => [`${value} Centers`, name]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="dd-chart-footer">Distribution of center categories.</p>
    </div>
  );
}

/* =========================================================================
    MAIN PANEL
   ========================================================================= */

function OverviewPanel() {
  const [centers, setCenters] = useState([]);
  const [operations, setOperations] = useState([]);
  const [assignedVols, setAssignedVols] = useState([]);
  const [allVols, setAllVols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const centersRes = await fetch(`${API_BASE}/collectingcenters`);
      const centersData = await centersRes.json();
      // Ensure centersData is always an array
      const centersArray = Array.isArray(centersData) ? centersData : [];
      setCenters(centersArray);

      const operationsRes = await fetch(`${API_BASE}/operations`);
      const operationsDataRaw = await operationsRes.json();
      const operationsData = Array.isArray(operationsDataRaw)
        ? operationsDataRaw
        : operationsDataRaw.data || operationsDataRaw.items || operationsDataRaw.operations || [];
      setOperations(operationsData);

      const assignedVolUrl = new URL(`${API_BASE}/volunteer`);
      assignedVolUrl.searchParams.set("assigned", "true");
      const assignedVolsRes = await fetch(assignedVolUrl.toString());
      const assignedVolsRaw = await assignedVolsRes.json();
      const assignedVolsData = assignedVolsRaw?.items || assignedVolsRaw || [];
      setAssignedVols(Array.isArray(assignedVolsData) ? assignedVolsData : []);

      const allVolsRes = await fetch(`${API_BASE}/volunteer`);
      const allVolsRaw = await allVolsRes.json();
      const allVolsData = allVolsRaw?.items || allVolsRaw || [];
      setAllVols(Array.isArray(allVolsData) ? allVolsData : []);
    } catch (e) {
      console.error("Dashboard overview data fetch error:", e);
      setError("Failed to load dashboard overview data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalCenters = centers.length;
    const totalOperations = operations.length;
    const activeOperations = operations.filter(o => (o.status || "").toLowerCase() === "active").length;
    const completedOperations = operations.filter(o => (o.status || "").toLowerCase() === "completed").length;
    const operationsInProgress = operations.filter(o => 
      (o.status || "").toLowerCase() === "active" || (o.status || "").toLowerCase() === "pending"
    ).length;

    let totalNeededVolunteers = 0;
    let totalAssignedVolunteers = 0;
    let teamLeads = 0;
    let individualVols = 0;

    for (const op of operations) {
      totalNeededVolunteers += Number(op.volunteerCount || 0);
      const assignedVolunteersForOp = assignedVols.filter(v => volMatchesOperation(v, op));
      let countForOp = 0;
      for (const v of assignedVolunteersForOp) {
        countForOp += (v?.volunteerType === "team" && v?.members) ? Number(v.members) || 1 : 1;
        if (v?.volunteerType === "team") {
          teamLeads++;
        } else {
          individualVols++;
        }
      }
      totalAssignedVolunteers += countForOp;
    }

    const totalRegisteredCapacity = allVols.reduce((sum, v) => {
      const members = (v?.volunteerType === "team" && v?.members) ? Number(v.members) || 1 : 1;
      return sum + members;
    }, 0);

    return {
      totalCenters,
      totalOperations,
      activeOperations,
      completedOperations,
      operationsInProgress,
      totalNeededVolunteers,
      totalAssignedVolunteers,
      teamLeads,
      individualVols,
      totalRegisteredVolunteers: totalRegisteredCapacity
    };
  }, [centers, operations, assignedVols, allVols]);

  if (loading) {
    return (
      <div className="donation-dashboard-component">
        <div className="dd-overview-panel">
          <div className="dd-loading">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="donation-dashboard-component">
        <div className="dd-overview-panel">
          <div className="dd-error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-dashboard-component">
      <div className="dd-overview-panel">
        <div className="dd-header-top">
          <div className="dd-title-group">
            <h1>Operational Dashboard Summary 💡</h1>
            <p>A high-level, real-time overview of donation centers and field distribution operations.</p>
          </div>
          <button className="dd-btn dd-btn-ghost dd-refresh-btn" onClick={fetchData}>
            <span className="dd-icon">🔄</span> Refresh Data
          </button>
        </div>

        {/* CHARTS NOW AT TOP */}
        <h2 className="dd-section-title">Operational Deep Dive</h2>
        <div className="dd-stats-grid dd-overview-grid dd-row-3">
          <div className="dd-grid-span-2"><TopVolsChart operations={operations} /></div>
          <div className="dd-grid-span-1"><TeamRatioChart teamLeads={stats.teamLeads} individualVols={stats.individualVols} /></div>
          <div className="dd-grid-span-1"><TagDistributionChart centers={centers} /></div>
        </div>

        <h2 className="dd-section-title">Core Operations Metrics</h2>
        <div className="dd-stats-grid dd-overview-grid dd-row-1">
          <div className="dd-stat-card dd-stat-primary dd-stat-large">
            <div className="dd-stat-icon">📦</div>
            <div className="dd-stat-number">{stats.totalCenters}</div>
            <div className="dd-stat-label">Total Collection Centers</div>
          </div>
          <div className="dd-stat-card dd-stat-warning dd-stat-large">
            <div className="dd-stat-icon">🚧</div>
            <div className="dd-stat-number">{stats.operationsInProgress}</div>
            <div className="dd-stat-label">Operations In Progress</div>
          </div>
          <div className="dd-stat-card dd-stat-success dd-stat-large">
            <div className="dd-stat-icon">✅</div>
            <div className="dd-stat-number">{stats.completedOperations}</div>
            <div className="dd-stat-label">Operations Completed</div>
          </div>
        </div>

        <h2 className="dd-section-title">Volunteer and Capacity Analysis</h2>
        <div className="dd-stats-grid dd-overview-grid dd-row-2">
          {/* Registered Volunteers */}
          <div className="dd-stat-card dd-stat-info dd-grid-span-2">
            <div className="dd-stat-icon">👥</div>
            <div className="dd-stat-number">{stats.totalRegisteredVolunteers}</div>
            <div className="dd-stat-label">Total Registered Volunteer Capacity</div>
          </div>

          {/* Assigned Volunteers */}
          <div className="dd-stat-card dd-stat-info dd-grid-span-2">
            <div className="dd-stat-icon">🧑‍🤝‍🧑</div>
            <div className="dd-stat-number">{stats.totalAssignedVolunteers}</div>
            <div className="dd-stat-label">Total Assigned Capacity</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewPanel;
