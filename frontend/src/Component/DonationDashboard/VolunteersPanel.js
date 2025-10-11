// frontend/src/Component/DonationDashboard/VolunteersPanel.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./donationcss/donate_dashboard.css";

/* -------------------------------- API helpers -------------------------------- */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const volunteerApi = {
  getAll: (params = {}) => axios.get(`${API_BASE}/volunteer`, { params }),
  getById: (id) => axios.get(`${API_BASE}/volunteer/${id}`),
  create: (data) => axios.post(`${API_BASE}/volunteer`, data),
  update: (id, data) => axios.put(`${API_BASE}/volunteer/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE}/volunteer/${id}`),
  createBulk: (data) => axios.post(`${API_BASE}/volunteer/bulk`, data),
  toggleAssignment: (id, data) => axios.put(`${API_BASE}/volunteer/${id}/assign`, data),
  getAssignmentStats: () => axios.get(`${API_BASE}/volunteer/stats/assignment`),
};

const operationsApi = {
  getAll: () => axios.get(`${API_BASE}/operations`),
};

/* -------------------------------- Constants -------------------------------- */
const FORM_ROUTE = "/volunteers";
const ROLE_OPTIONS = ["Driver", "Medic", "Logistics", "Cooking", "Translator"];
const LANGUAGE_OPTIONS = ["Sinhala", "Tamil", "English"];

/* ---------------------------- WhatsApp (optional) --------------------------- */
const sendWhatsAppMessage = (phone, message) => {
  // Format phone number (remove spaces, add country code if needed)
  const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '94'); // Sri Lanka code
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Open WhatsApp Web with pre-filled message
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};
export default function VolunteersPanel() {
  const navigate = useNavigate();
  const location = useLocation();

  /* state */
  const [vols, setVols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assignmentStats, setAssignmentStats] = useState({
    total: 0,
    assigned: 0,
    unassigned: 0,
    assignedPercentage: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100 });

  /* search and filters */
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  /* Advanced filters */
  const [filterLanguages, setFilterLanguages] = useState([]);
  const [filterLivingArea, setFilterLivingArea] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterRoles, setFilterRoles] = useState([]);

  /* Operations (from backend) */
  const [operations, setOperations] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await operationsApi.getAll();
        const ops = Array.isArray(res.data)
          ? res.data
          : res.data.data || res.data.items || res.data.operations || [];
        setOperations(ops);
      } catch (e) {
        console.error("Failed to load operations", e);
      }
    })();
  }, []);

  /* Helpers */
  const getOperationName = (vol) => {
    if (vol?.operationName) return vol.operationName; // denormalized (preferred)
    const id = vol?.operationId;
    if (!id) return "—";
    const found = operations.find((o) => o._id === id);
    return found?.operationName || found?.name || found?.title || id || "—";
  };

  const isAssigned = (v) =>
    (typeof v?.assigned === "boolean" ? v.assigned : undefined) ??
    (v?.assignmentStatus === "assigned");

  /* Fetch assignment stats */
  const fetchAssignmentStats = async () => {
    try {
      const response = await volunteerApi.getAssignmentStats();
      setAssignmentStats(response.data);
    } catch (err) {
      console.error("Error fetching assignment stats:", err);
    }
  };

  /* Fetch volunteers */
  const fetchVolunteers = async (params = {}) => {
    try {
      setLoading(true);
      setError("");

      const queryParams = {
        limit: pagination.limit,
        page: pagination.page,
        ...params,
      };

      if (search.trim()) queryParams.q = search.trim();
      if (filterTime) queryParams.availableTime = filterTime;
      if (filterDateFrom) queryParams.dateFrom = filterDateFrom;
      if (filterRoles.length > 0) queryParams.role = filterRoles;
      if (filterLanguages.length > 0) queryParams.language = filterLanguages;
      if (assignedFilter) queryParams.assigned = assignedFilter === "assigned";

      const response = await volunteerApi.getAll(queryParams);
      const { items, total, page, limit } = response.data || {};
      setVols(items || []);
      setPagination({
        total: total ?? (items?.length || 0),
        page: page ?? 1,
        limit: limit ?? pagination.limit,
      });

      await fetchAssignmentStats();
    } catch (err) {
      console.error("Error fetching volunteers:", err);
      setError(err.response?.data?.message || "Failed to fetch volunteers");
      setVols([]);
    } finally {
      setLoading(false);
    }
  };

  /* Toggle assignment */
  const toggleAssignment = async (volunteerId, currentStatus, row) => {
    try {
      setLoading(true);
      const assignedToValue =
        row?.assignedTo ||
        row?.assignedBy ||
        row?.operationName ||
        getOperationName(row) ||
        null;

      const payload = currentStatus ? { assignedTo: null } : { assignedTo: assignedToValue };
      await volunteerApi.toggleAssignment(volunteerId, payload);
      await fetchVolunteers();
    } catch (err) {
      console.error("Error toggling assignment:", err);
      setError(err.response?.data?.message || "Failed to update assignment");
    } finally {
      setLoading(false);
    }
  };

  // re-fetch on return with refresh flag
  useEffect(() => {
    if (location.state?.refreshData) {
      fetchVolunteers().finally(() => {
        navigate(location.pathname, { replace: true, state: {} });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.refreshData]);

  /* Initial load & refetch when filters change */
  useEffect(() => {
    const t = setTimeout(() => {
      const shouldResetPage =
        pagination.page === 1 ||
        [search, filterLanguages, filterTime, filterDateFrom, filterRoles, assignedFilter].some((f) =>
          Array.isArray(f) ? f.length > 0 : Boolean(f)
        );

      if (shouldResetPage && pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      } else {
        fetchVolunteers();
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterLanguages, filterTime, filterDateFrom, filterRoles, assignedFilter, pagination.page]);

  /* Derived: operations list for filter dropdown */
  const allOperations = useMemo(() => {
    const namesFromOps = operations
      .map((o) => o.operationName || o.name || o.title)
      .filter(Boolean);
    const namesFromVols = vols.map((v) => getOperationName(v)).filter((n) => n && n !== "—");
    return [...new Set([...namesFromOps, ...namesFromVols])].sort();
  }, [operations, vols]);

  /* Client-side filtering */
  const filtered = useMemo(() => {
    let result = [...vols];

    if (operationFilter) {
      result = result.filter((v) => getOperationName(v).toLowerCase().includes(operationFilter.toLowerCase()));
    }

    if (typeFilter) {
      result = result.filter((v) => (v?.volunteerType || "individual") === typeFilter);
    }

    if (filterLivingArea.trim()) {
      const needle = filterLivingArea.trim().toLowerCase();
      result = result.filter((v) => (v?.livingArea || "").toLowerCase().includes(needle));
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter((v) => {
        const fields = [
          v?.fullName || "",
          v?.phone || "",
          v?.email || "",
          v?.livingArea || "",
          getOperationName(v),
          v?.volunteerType === "team" ? "team" : "individual",
          ...(v?.roles || []),
          ...(v?.languages || []),
          v?.notes || "",
          v?.assignedTo || "",
        ];
        return fields.some((f) => f.toString().toLowerCase().includes(s));
      });
    }

    if (filterLanguages.length > 0) {
      result = result.filter((v) => (v?.languages || []).length && filterLanguages.every((x) => v.languages.includes(x)));
    }

    if (filterRoles.length > 0) {
      result = result.filter((v) => (v?.roles || []).length && filterRoles.every((x) => v.roles.includes(x)));
    }

    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      result = result.filter((v) => v?.date && new Date(v.date) >= from);
    }

    result.sort((a, b) => (a?.fullName || "").localeCompare(b?.fullName || ""));
    return result;
  }, [
    vols,
    operationFilter,
    typeFilter,
    filterLivingArea,
    search,
    filterLanguages,
    filterRoles,
    filterDateFrom,
  ]);

  /* Search suggestions (names, phones, emails, areas, ops, roles, languages) */
  const suggestions = useMemo(() => {
    const set = new Set();
    vols.forEach((v) => {
      if (v.fullName) set.add(v.fullName);
      if (v.phone) set.add(v.phone);
      if (v.email) set.add(v.email);
      if (v.livingArea) set.add(v.livingArea);
      getOperationName(v) && set.add(getOperationName(v));
      (v.roles || []).forEach((r) => r && set.add(r));
      (v.languages || []).forEach((l) => l && set.add(l));
    });
    allOperations.forEach((n) => set.add(n));
    return Array.from(set).slice(0, 200); // keep reasonable
  }, [vols, allOperations]);

  /* UI helpers */
  const toggleChip = (val, list, setter) =>
    setter((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));

  const clearAdvanced = () => {
    setFilterLanguages([]);
    setFilterLivingArea("");
    setFilterTime("");
    setFilterDateFrom("");
    setFilterRoles([]);
  };

  const clearAll = () => {
    setSearch("");
    setOperationFilter("");
    setTypeFilter("");
    setAssignedFilter("");
    clearAdvanced();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  /* UI */
  return (
    <div className="volunteers-component">
      <style>
        {`
          @keyframes horizontalLine {
            0% { transform: scaleX(0); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: scaleX(1); opacity: 1; }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          }
        `}
      </style>
      <div className="vp-vols-wrap" style={{
        padding: '24px',
        maxWidth: '100%',
        margin: '0 auto',
        overflowX: 'auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        padding: '24px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>Assign Volunteer</h1>
          <div style={{ 
            color: '#6b7280', 
            fontSize: '16px',
            marginBottom: '16px'
          }}>Manage volunteers, availability & assignments</div>

          {/* Stats */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderRadius: '16px',
              fontSize: '14px',
              color: '#6b7280',
              border: '2px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <span style={{ fontWeight: '800', color: '#1e40af', fontSize: '18px' }}>{assignmentStats.total}</span> Total
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: '16px',
              fontSize: '14px',
              color: '#6b7280',
              border: '2px solid #a7f3d0',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
            }}>
              <span style={{ fontWeight: '800', color: "#22c55e", fontSize: '18px' }}>{assignmentStats.assigned}</span> Assigned
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderRadius: '16px',
              fontSize: '14px',
              color: '#6b7280',
              border: '2px solid #fecaca',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
            }}>
              <span style={{ fontWeight: '800', color: "#ef4444", fontSize: '18px' }}>{assignmentStats.unassigned}</span> Unassigned
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: '16px',
              fontSize: '14px',
              color: '#6b7280',
              border: '2px solid #bfdbfe',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
            }}>
              <span style={{ fontWeight: '800', color: '#3b82f6', fontSize: '18px' }}>{assignmentStats.assignedPercentage}%</span> Assigned Rate
            </div>
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderRadius: '50%',
          transform: 'translate(50px, -50px)',
          zIndex: 1
        }}></div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate(FORM_ROUTE, { state: { from: location.pathname } })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
              fontSize: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.4)';
              e.target.style.animation = 'pulse 1.5s infinite';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
              e.target.style.animation = 'none';
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>+ Add Volunteer</span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>

          <button 
            onClick={() => {
              // Generate PDF functionality
              const generatePDF = () => {
                // Create a simple PDF generation (you can replace this with your preferred PDF library)
                const printWindow = window.open('', '_blank');
                const tableData = filtered.map(v => ({
                  name: v.fullName || '—',
                  phone: v.phone || '—',
                  type: v.volunteerType === 'team' ? `Team (${v.members || 1})` : 'Individual',
                  roles: (v.roles || []).join(', ') || '—',
                  languages: (v.languages || []).join(', ') || '—',
                  date: formatDate(v.date),
                  availableTime: v.availableTime === 'day' ? 'Daytime' : v.availableTime === 'night' ? 'Night' : v.availableTime === 'both' ? 'Both (24h)' : '—',
                  livingArea: v.livingArea || '—',
                  operation: getOperationName(v),
                  assignment: isAssigned(v) ? 'Assigned' : 'Unassigned'
                }));

                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Volunteers Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 20px; }
                      h1 { color: #1e40af; text-align: center; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f8fafc; font-weight: bold; }
                      .stats { margin-bottom: 20px; text-align: center; }
                      .stat { display: inline-block; margin: 0 20px; }
                    </style>
                  </head>
                  <body>
                    <h1>Volunteers Report</h1>
                    <div class="stats">
                      <div class="stat"><strong>Total:</strong> ${assignmentStats.total}</div>
                      <div class="stat"><strong>Assigned:</strong> ${assignmentStats.assigned}</div>
                      <div class="stat"><strong>Unassigned:</strong> ${assignmentStats.unassigned}</div>
                      <div class="stat"><strong>Assigned Rate:</strong> ${assignmentStats.assignedPercentage}%</div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Type</th>
                          <th>Roles</th>
                          <th>Languages</th>
                          <th>Date</th>
                          <th>Available Time</th>
                          <th>Living Area</th>
                          <th>Operation</th>
                          <th>Assignment</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tableData.map(row => `
                          <tr>
                            <td>${row.name}</td>
                            <td>${row.phone}</td>
                            <td>${row.type}</td>
                            <td>${row.roles}</td>
                            <td>${row.languages}</td>
                            <td>${row.date}</td>
                            <td>${row.availableTime}</td>
                            <td>${row.livingArea}</td>
                            <td>${row.operation}</td>
                            <td>${row.assignment}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    <p style="text-align: center; margin-top: 20px; color: #6b7280;">
                      Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                    </p>
                  </body>
                  </html>
                `;
                
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.print();
              };
              
              generatePDF();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
              fontSize: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.3)';
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>📄 Generate PDF</span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, #f59e0b, #10b981, #3b82f6)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>

          <button 
            type="button" 
            onClick={() => fetchVolunteers()} 
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              background: loading ? '#f3f4f6' : 'white',
              color: loading ? '#9ca3af' : '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                e.target.style.borderColor = '#3b82f6';
                e.target.style.color = '#3b82f6';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#374151';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>
              {loading ? "Loading..." : "🔄 Refresh"}
            </span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginTop: 16, marginBottom: 8 }}>{error}</div>}

      {/* Search and Filter Section */}
      <div style={{
        marginBottom: '24px',
        padding: '24px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '150px',
          height: '150px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: '50%',
          transform: 'translate(-50px, -50px)',
          zIndex: 1
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Main Search Bar */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <input
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '16px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                placeholder="🔍 Search name, phone, email, living area, operation, roles, languages, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                list="vol-suggestions"
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              />
              <datalist id="vol-suggestions">
                {suggestions.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>
            </div>

            <button 
              type="button" 
              onClick={clearAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '2px solid #fecaca',
                background: 'white',
                color: '#dc2626',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '700',
                fontSize: '16px',
                position: 'relative',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
                e.target.style.borderColor = '#f87171';
                e.target.style.color = '#b91c1c';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(220, 38, 38, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#fecaca';
                e.target.style.color = '#dc2626';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span style={{ position: 'relative', zIndex: 2 }}>🗑️ Clear All</span>
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                height: '3px',
                background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                transform: 'scaleX(0)',
                transition: 'transform 0.3s ease'
              }}></div>
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>📋 Type</label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                title="Filter by type"
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                <option value="">All types</option>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>✅ Assignment</label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                title="Filter by assignment status"
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                <option value="">All assignments</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>🎯 Operation</label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                value={operationFilter}
                onChange={(e) => setOperationFilter(e.target.value)}
                title="Filter by operation"
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                <option value="">All operations</option>
                {allOperations.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced filters */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="row gap12" style={{ flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Language (must have ALL selected)</div>
            <div className="vp-vols-roles">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleChip(l, filterLanguages, setFilterLanguages)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '2px solid',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    position: 'relative',
                    overflow: 'hidden',
                    ...(filterLanguages.includes(l) ? {
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                      color: 'white',
                      borderColor: '#3b82f6',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    } : {
                      background: 'white',
                      color: '#6b7280',
                      borderColor: '#e5e7eb'
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (filterLanguages.includes(l)) {
                      e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.4)';
                    } else {
                      e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.color = '#3b82f6';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filterLanguages.includes(l)) {
                      e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                    } else {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.color = '#6b7280';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>{l}</span>
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)',
                    transform: filterLanguages.includes(l) ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'transform 0.3s ease'
                  }}></div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 300 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Role (must have ALL selected)</div>
            <div className="vp-vols-roles">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleChip(r, filterRoles, setFilterRoles)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '2px solid',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    position: 'relative',
                    overflow: 'hidden',
                    ...(filterRoles.includes(r) ? {
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      borderColor: '#10b981',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    } : {
                      background: 'white',
                      color: '#6b7280',
                      borderColor: '#e5e7eb'
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (filterRoles.includes(r)) {
                      e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.4)';
                    } else {
                      e.target.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                      e.target.style.borderColor = '#10b981';
                      e.target.style.color = '#10b981';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filterRoles.includes(r)) {
                      e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    } else {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.color = '#6b7280';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>{r}</span>
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(90deg, #f59e0b, #10b981, #3b82f6)',
                    transform: filterRoles.includes(r) ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'transform 0.3s ease'
                  }}></div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 260, flex: 1 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Living area (contains)</div>
            <input
              className="vp-vols-input"
              placeholder="e.g., Ratnapura, Galle, Weligama…"
              value={filterLivingArea}
              onChange={(e) => setFilterLivingArea(e.target.value)}
              list="area-suggestions"
            />
            <datalist id="area-suggestions">
              {[...new Set(vols.map((v) => v.livingArea).filter(Boolean))].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div style={{ minWidth: 180 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Available time</div>
            <select className="vp-vols-select" value={filterTime} onChange={(e) => setFilterTime(e.target.value)}>
              <option value="">Any</option>
              <option value="day">Daytime</option>
              <option value="night">Night</option>
              <option value="both">Both (24h)</option>
            </select>
          </div>

          <div>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Date from</div>
            <input type="date" className="vp-vols-input" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>

          <div className="row gap8" style={{ alignItems: "flex-end" }}>
            <button 
              type="button" 
              onClick={clearAdvanced}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '2px solid #fbbf24',
                background: 'white',
                color: '#d97706',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '600',
                fontSize: '14px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                e.target.style.borderColor = '#f59e0b';
                e.target.style.color = '#b45309';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(245, 158, 11, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#fbbf24';
                e.target.style.color = '#d97706';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span style={{ position: 'relative', zIndex: 2 }}>Clear advanced</span>
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                height: '2px',
                background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                transform: 'scaleX(0)',
                transition: 'transform 0.3s ease'
              }}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row between center" style={{ marginBottom: 12 }}>
        <div className="muted">
          Showing {filtered.length} of {pagination.total} volunteers
          {loading && " (Loading...)"}
        </div>

        {(search || typeFilter || assignedFilter || operationFilter || filterLanguages.length ||
          filterLivingArea || filterTime || filterDateFrom || filterRoles.length) && (
          <div className="row gap8 center">
            <span className="muted small">Active filters:</span>
            {search && <span className="vp-vols-filter-tag">Search: "{search}"</span>}
            {typeFilter && <span className="vp-vols-filter-tag">Type: {typeFilter === "individual" ? "Individual" : "Team"}</span>}
            {assignedFilter && <span className="vp-vols-filter-tag">Status: {assignedFilter === "assigned" ? "Assigned" : "Unassigned"}</span>}
            {operationFilter && <span className="vp-vols-filter-tag">Operation: {operationFilter}</span>}
            {filterLanguages.length > 0 && <span className="vp-vols-filter-tag">Languages: {filterLanguages.join(", ")}</span>}
            {filterRoles.length > 0 && <span className="vp-vols-filter-tag">Roles: {filterRoles.join(", ")}</span>}
            {filterLivingArea && <span className="vp-vols-filter-tag">Area: {filterLivingArea}</span>}
            {filterTime && <span className="vp-vols-filter-tag">Time: {filterTime}</span>}
            {filterDateFrom && <span className="vp-vols-filter-tag">Date from: {filterDateFrom}</span>}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        <div style={{
          overflowX: 'auto',
          overflowY: 'visible'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            minWidth: '1200px'
          }}>
          <thead>
            <tr>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '200px'
              }}>Name</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '120px'
              }}>Phone</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '100px'
              }}>Type</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '120px'
              }}>Roles</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '120px'
              }}>Languages</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '100px'
              }}>Date</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '120px'
              }}>Available Time</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '120px'
              }}>Living Area</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '120px'
              }}>Operation</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'left',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '150px'
              }}>Assignment</th>
              <th style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '20px 16px',
                textAlign: 'right',
                fontWeight: '700',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '320px'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ 
                  textAlign: "center", 
                  padding: '40px',
                  color: '#6b7280',
                  fontSize: '16px'
                }}>Loading volunteers...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ 
                  textAlign: "center", 
                  padding: '40px',
                  color: '#6b7280',
                  fontSize: '16px'
                }}>No volunteers match your filters.</td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v._id} style={{
                transition: 'all 0.3s ease'
              }}>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>
                  <div style={{ fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>{v?.fullName || "—"}</div>
                  {v?.email ? <div style={{ color: '#6b7280', fontSize: '13px' }}>{v.email}</div> : null}
                </td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>
                  <a href={`tel:${(v?.phone || "").replace(/\s+/g, "")}`} style={{ 
                    color: '#3b82f6', 
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}>{v?.phone || "—"}</a>
                  {v?.whatsapp && v.whatsapp !== v.phone && <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>WA: {v.whatsapp}</div>}
                </td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    ...(v?.volunteerType === "team" ? {
                      background: '#fef3c7',
                      color: '#d97706'
                    } : {
                      background: '#dcfce7',
                      color: '#16a34a'
                    })
                  }}>
                    {v?.volunteerType === "team" ? `Team (${v.members || 1})` : "Individual"}
                  </span>
                </td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>
                  {(v?.roles || []).length ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(v.roles || []).map((r, i) => (
                        <span key={v._id + r + i} style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>{r}</span>
                      ))}
                    </div>
                  ) : <span style={{ color: '#6b7280' }}>—</span>}
                </td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>{(v?.languages || []).length ? (v.languages || []).join(", ") : <span style={{ color: '#6b7280' }}>—</span>}</td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>{formatDate(v?.date)}</td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>
                  {v?.availableTime === "day" ? "Daytime"
                    : v?.availableTime === "night" ? "Night"
                    : v?.availableTime === "both" ? "Both (24h)" : "—"}
                </td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>{v?.livingArea || "—"}</td>
                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>{getOperationName(v)}</td>

                <td style={{
                  padding: '20px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  verticalAlign: 'top'
                }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      ...(isAssigned(v) ? {
                        background: '#dcfce7',
                        color: '#16a34a'
                      } : {
                        background: '#fee2e2',
                        color: '#dc2626'
                      })
                    }}>
                      {isAssigned(v) ? "Assigned" : "Unassigned"}
                    </span>
                    {isAssigned(v) && v?.assignedTo && (
                      <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>To: {v.assignedTo}</div>
                    )}
                    {isAssigned(v) && v?.assignedDate && (
                      <div style={{ color: '#6b7280', fontSize: '13px' }}>Date: {formatDate(v.assignedDate)}</div>
                    )}
                  </div>
                </td>

                <td style={{ textAlign: 'right', minWidth: '320px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexWrap: 'nowrap',
                    minWidth: '300px'
                  }}>
                    <button
                      onClick={() => toggleAssignment(v._id, isAssigned(v), v)}
                      disabled={loading}
                      title={isAssigned(v) ? "Unassign volunteer" : "Assign volunteer"}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '2px solid',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '13px',
                        position: 'relative',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        minWidth: '80px',
                        ...(isAssigned(v) ? {
                          background: 'white',
                          color: '#dc2626',
                          borderColor: '#fecaca'
                        } : {
                          background: 'white',
                          color: '#059669',
                          borderColor: '#a7f3d0'
                        })
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          if (isAssigned(v)) {
                            e.target.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
                            e.target.style.borderColor = '#f87171';
                            e.target.style.color = '#b91c1c';
                          } else {
                            e.target.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                            e.target.style.borderColor = '#34d399';
                            e.target.style.color = '#047857';
                          }
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.background = 'white';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                          if (isAssigned(v)) {
                            e.target.style.borderColor = '#fecaca';
                            e.target.style.color = '#dc2626';
                          } else {
                            e.target.style.borderColor = '#a7f3d0';
                            e.target.style.color = '#059669';
                          }
                        }
                      }}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>
                        {isAssigned(v) ? "Unassign" : "Assign"}
                      </span>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '3px',
                        background: isAssigned(v) 
                          ? 'linear-gradient(90deg, #dc2626, #ef4444)' 
                          : 'linear-gradient(90deg, #10b981, #059669)',
                        transform: 'scaleX(0)',
                        transition: 'transform 0.3s ease'
                      }}></div>
                    </button>

                    <button
                      onClick={() => navigate(`/dashboard/volunteers/${v._id}/edit`, { state: { from: location.pathname } })}
                      disabled={loading}
                      title="Edit volunteer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '2px solid #e5e7eb',
                        background: 'white',
                        color: '#6b7280',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        fontWeight: '600',
                        fontSize: '13px',
                        position: 'relative',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        minWidth: '60px'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.color = '#3b82f6';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.background = 'white';
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.color = '#6b7280';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>Edit</span>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '3px',
                        background: 'linear-gradient(90deg, #3b82f6, #1e40af)',
                        transform: 'scaleX(0)',
                        transition: 'transform 0.3s ease'
                      }}></div>
                    </button>

                    <button
                      onClick={async () => {
                        if (!window.confirm("Remove this volunteer?")) return;
                        try {
                          setLoading(true);
                          await volunteerApi.delete(v._id);
                          await fetchVolunteers();
                        } catch (err) {
                          console.error("Error deleting volunteer:", err);
                          setError(err.response?.data?.message || "Failed to delete volunteer");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      title="Delete this volunteer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '2px solid #fecaca',
                        background: 'white',
                        color: '#dc2626',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        fontWeight: '600',
                        fontSize: '13px',
                        position: 'relative',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        minWidth: '70px'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
                          e.target.style.borderColor = '#f87171';
                          e.target.style.color = '#b91c1c';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 16px rgba(220, 38, 38, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.background = 'white';
                          e.target.style.borderColor = '#fecaca';
                          e.target.style.color = '#dc2626';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>Delete</span>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '3px',
                        background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                        transform: 'scaleX(0)',
                        transition: 'transform 0.3s ease'
                      }}></div>
                    </button>

                    <button
                      onClick={() =>
                        sendWhatsAppMessage(
                          v.whatsapp || v.phone,
                          "🌟 Thanks so much for volunteering—your support means the world. If you're free to help, please message or call 07182995 for the next steps."
                        )
                      }
                      disabled={!v.phone && !v.whatsapp}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '2px solid #25d366',
                        background: 'white',
                        color: '#25d366',
                        cursor: (!v.phone && !v.whatsapp) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        fontWeight: '600',
                        fontSize: '13px',
                        position: 'relative',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        minWidth: '90px'
                      }}
                      onMouseEnter={(e) => {
                        if (v.phone || v.whatsapp) {
                          e.target.style.background = 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)';
                          e.target.style.color = 'white';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 16px rgba(37, 211, 102, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (v.phone || v.whatsapp) {
                          e.target.style.background = 'white';
                          e.target.style.color = '#25d366';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>WhatsApp</span>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '3px',
                        background: 'linear-gradient(90deg, #25d366, #128c7e)',
                        transform: 'scaleX(0)',
                        transition: 'transform 0.3s ease'
                      }}></div>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="row center gap12" style={{ marginTop: 16 }}>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page <= 1 || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid #e5e7eb',
              background: (pagination.page <= 1 || loading) ? '#f3f4f6' : 'white',
              color: (pagination.page <= 1 || loading) ? '#9ca3af' : '#374151',
              cursor: (pagination.page <= 1 || loading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!(pagination.page <= 1 || loading)) {
                e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                e.target.style.borderColor = '#3b82f6';
                e.target.style.color = '#3b82f6';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(pagination.page <= 1 || loading)) {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#374151';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>← Previous</span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, #1e40af)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>
          <span className="muted" style={{ 
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: '10px',
            border: '2px solid #e5e7eb',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid #e5e7eb',
              background: (pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading) ? '#f3f4f6' : 'white',
              color: (pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading) ? '#9ca3af' : '#374151',
              cursor: (pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!(pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading)) {
                e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                e.target.style.borderColor = '#3b82f6';
                e.target.style.color = '#3b82f6';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading)) {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#374151';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>Next →</span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, #1e40af)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
//