// frontend/src/Component/DonationDashboard/editvolunteer.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./donationcss/donate_dashboard.css";

/* -------------------------------- API helpers -------------------------------- */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const volunteerApi = {
  getById: (id) => axios.get(`${API_BASE}/volunteer/${id}`),
  update: (id, data) => axios.put(`${API_BASE}/volunteer/${id}`, data),
};

const operationsApi = {
  getAll: () => axios.get(`${API_BASE}/operations`),
};

/* -------------------------------- Constants -------------------------------- */
const ROLE_OPTIONS = ["Driver", "Medic", "Logistics", "Cooking", "Translator"];
const LANGUAGE_OPTIONS = ["Sinhala", "Tamil", "English"];

export default function EditVolunteerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  /* Top-level state */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* Operations list */
  const [operations, setOperations] = useState([]);
  const [opsLoading, setOpsLoading] = useState(true);

  /* Simple search box for operation suggestions */
  const [operationSearch, setOperationSearch] = useState("");

  /* Form data (city removed) */
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    whatsapp: "",
    email: "",
    volunteerType: "individual", // individual | team
    members: 1,
    group: "",
    roles: [],
    languages: [],
    availableTime: "day", // day | night | both
    date: "",
    livingArea: "",
    operationId: "",
    notes: "",
    // Assignment
    assignmentStatus: "not_assigned", // assigned | not_assigned
    assignedDate: "",
    assignedBy: "",
    assignmentNotes: "",
  });

  /* ---------- Load operations ---------- */
  useEffect(() => {
    (async () => {
      try {
        setOpsLoading(true);
        const res = await operationsApi.getAll();
        const ops = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.items || res.data?.operations || [];
        setOperations(ops);
      } catch (e) {
        console.error("Failed to load operations", e);
      } finally {
        setOpsLoading(false);
      }
    })();
  }, []);

  /* ---------- Load volunteer ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const { data: v } = await volunteerApi.getById(id);

        setFormData({
          fullName: v.fullName || "",
          phone: v.phone || "",
          whatsapp: v.whatsapp || "",
          email: v.email || "",
          volunteerType: v.volunteerType || "individual",
          members: v.members || 1,
          group: v.group || "",
          roles: v.roles || [],
          languages: v.languages || [],
          availableTime: v.availableTime || "day",
          date: v.date ? v.date.split("T")[0] : "",
          livingArea: v.livingArea || "",
          operationId: v.operationId || "",
          notes: v.notes || "",
          assignmentStatus:
            v.assignmentStatus || (v.assigned ? "assigned" : "not_assigned"),
          assignedDate: v.assignedDate ? v.assignedDate.split("T")[0] : "",
          assignedBy: v.assignedTo || v.assignedBy || "",
          assignmentNotes: v.assignmentNotes || "",
        });
      } catch (e) {
        console.error(e);
        setError(e.response?.data?.message || "Failed to load volunteer");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  /* Convenience getters */
  const selectedOperation = useMemo(
    () => operations.find((o) => o._id === formData.operationId),
    [operations, formData.operationId]
  );
  const opNameOf = (op) =>
    op?.operationName || op?.name || op?.title || op?._id || "";

  /* Keep search box in sync when operationId or operations change */
  useEffect(() => {
    if (!selectedOperation) {
      setOperationSearch("");
      return;
    }
    const name = opNameOf(selectedOperation);
    setOperationSearch(name);
  }, [selectedOperation]);

  /* Handlers */
  const handleChange = (field, value) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const toggleChip = (val, listName) =>
    handleChange(
      listName,
      formData[listName].includes(val)
        ? formData[listName].filter((x) => x !== val)
        : [...formData[listName], val]
    );

  const handleCancel = () => {
    const back = location.state?.from || "/dashboard/volunteers";
    navigate(back);
  };

  /* Assignment status helpers */
  const handleAssignmentStatusChange = (status) => {
    const updates = { assignmentStatus: status };
    if (status === "assigned" && !formData.assignedDate) {
      updates.assignedDate = new Date().toISOString().split("T")[0];
    }
    if (status === "not_assigned") {
      updates.assignedDate = "";
      updates.assignedBy = "";
      updates.assignmentNotes = "";
    }
    setFormData((p) => ({ ...p, ...updates }));
  };

  /* Operation suggestion: when user types and chooses a suggestion, set operationId */
  const handleOperationSearchChange = (val) => {
    setOperationSearch(val);

    // Try to map typed value to an operation by (case-insensitive) name match.
    const match = operations.find(
      (o) => opNameOf(o).toLowerCase() === val.trim().toLowerCase()
    );

    // If found, select it; if cleared or no exact match, don't clobber operationId.
    if (match) {
      handleChange("operationId", match._id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      if (!formData.fullName.trim()) throw new Error("Full name is required");
      if (!formData.phone.trim()) throw new Error("Phone number is required");
      if (formData.assignmentStatus === "assigned" && !formData.assignedDate) {
        throw new Error("Assignment date is required when marked as assigned");
      }

      const opName = selectedOperation ? opNameOf(selectedOperation) : "";

      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        volunteerType: formData.volunteerType,
        members: formData.members,
        group: formData.group,
        roles: formData.roles,
        languages: formData.languages,
        availableTime: formData.availableTime,
        date: formData.date,
        livingArea: formData.livingArea,
        operationId: formData.operationId,
        operationName: opName, // denormalized for list rendering
        notes: formData.notes,
        // Assignment
        assignmentStatus: formData.assignmentStatus,
        assignedDate: formData.assignedDate,
        assignedBy: formData.assignedBy,
        assignmentNotes: formData.assignmentNotes,
      };

      await volunteerApi.update(id, payload);

      const back = location.state?.from || "/dashboard/volunteers";
      navigate(back, { state: { refreshData: true } });
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        maxWidth: '100%',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          padding: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Edit Volunteer</h1>
        </div>
        <div style={{
          textAlign: "center", 
          padding: '60px 40px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            fontSize: '18px',
            color: '#6b7280',
            fontWeight: '600'
          }}>Loading volunteer data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '100%',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
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
          }}>Edit Volunteer</h1>
          <div style={{ 
            color: '#6b7280', 
            fontSize: '16px'
          }}>Update volunteer information</div>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <button 
            onClick={handleCancel} 
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              background: 'white',
              color: '#6b7280',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                e.target.style.borderColor = '#6b7280';
                e.target.style.color = '#374151';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(107, 114, 128, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#6b7280';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>Cancel</span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, #6b7280, #374151)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
              fontSize: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.4)';
                e.target.style.animation = 'pulse 1.5s infinite';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.3)';
                e.target.style.animation = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>
              {saving ? "Saving..." : "Save Changes"}
            </span>
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
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '2px solid #fecaca',
          borderRadius: '12px',
          color: '#dc2626',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 8px 16px rgba(220, 38, 38, 0.1)'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Assignment Status */}
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
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
            borderRadius: '50%',
            transform: 'translate(-30px, -30px)',
            zIndex: 1
          }}></div>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: '20px', 
            fontWeight: '700',
            color: '#1f2937',
            position: 'relative',
            zIndex: 2
          }}>
            📋 Assignment Status
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            position: 'relative',
            zIndex: 2
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Status *
              </label>
              <select
                value={formData.assignmentStatus}
                onChange={(e) => handleAssignmentStatusChange(e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                <option value="not_assigned">Not Assigned</option>
                <option value="assigned">Assigned</option>
              </select>
            </div>

            {formData.assignmentStatus === "assigned" && (
              <>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Assignment Date *
                  </label>
                  <input
                    type="date"
                    value={formData.assignedDate}
                    onChange={(e) => handleChange("assignedDate", e.target.value)}
                    required
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      fontSize: '14px',
                      color: '#374151',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Assigned By
                  </label>
                  <input
                    type="text"
                    value={formData.assignedBy}
                    onChange={(e) => handleChange("assignedBy", e.target.value)}
                    placeholder="Enter name of person who made the assignment"
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      fontSize: '14px',
                      color: '#374151',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Assignment Notes
                  </label>
                  <textarea
                    value={formData.assignmentNotes}
                    onChange={(e) => handleChange("assignmentNotes", e.target.value)}
                    placeholder="Add any notes about this assignment..."
                    disabled={saving}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      fontSize: '14px',
                      color: '#374151',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Basic Information */}
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
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
            borderRadius: '50%',
            transform: 'translate(30px, -30px)',
            zIndex: 1
          }}></div>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: '20px', 
            fontWeight: '700',
            color: '#1f2937',
            position: 'relative',
            zIndex: 2
          }}>
            👤 Basic Information
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            position: 'relative',
            zIndex: 2
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                required
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Volunteer Type
              </label>
              <select
                value={formData.volunteerType}
                onChange={(e) => handleChange("volunteerType", e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>

            {formData.volunteerType === "team" && (
              <label>
                Number of Members
                <input
                  type="number"
                  className="ngo-input"
                  min="1"
                  value={formData.members}
                  onChange={(e) =>
                    handleChange("members", parseInt(e.target.value) || 1)
                  }
                  disabled={saving}
                />
              </label>
            )}

            <label>
              Group/Organization
              <input
                type="text"
                className="ngo-input"
                value={formData.group}
                onChange={(e) => handleChange("group", e.target.value)}
                disabled={saving}
              />
            </label>

            <label>
              Date Registered
              <input
                type="date"
                className="ngo-input"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                disabled={saving}
              />
            </label>
          </div>
        </div>

        {/* Skills, Availability & Operation */}
        <div className="panel soft" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
            Skills & Availability
          </h3>

          <div className="ngo-formgrid">
            <label>
              Available Time
              <select
                className="ngo-select"
                value={formData.availableTime}
                onChange={(e) => handleChange("availableTime", e.target.value)}
                disabled={saving}
              >
                <option value="day">Daytime</option>
                <option value="night">Night</option>
                <option value="both">Both (24h)</option>
              </select>
            </label>

            {/* Operation search + select */}
            <label>
              Operation (search by name)
              <input
                list="operation-suggestions"
                className="ngo-input"
                value={operationSearch}
                placeholder={opsLoading ? "Loading operations..." : "Type to search..."}
                onChange={(e) => handleOperationSearchChange(e.target.value)}
                disabled={saving || opsLoading}
              />
              <datalist id="operation-suggestions">
                {operations.map((op) => (
                  <option key={op._id} value={opNameOf(op)} />
                ))}
              </datalist>
              <span className="small muted" style={{ marginTop: 6 }}>
                Pick a suggestion to set the assignment. You can also use the dropdown below.
              </span>
            </label>

            <label>
              Operation (select)
              <select
                className="ngo-select"
                value={formData.operationId}
                onChange={(e) => handleChange("operationId", e.target.value)}
                disabled={saving || opsLoading}
              >
                <option value="">Select an operation</option>
                {operations.map((op) => (
                  <option key={op._id} value={op._id}>
                    {opNameOf(op)}
                    {typeof op.volunteerCount === "number"
                      ? ` — ${op.volunteerCount} volunteers needed`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Roles */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              🎯 Roles & Skills
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleChip(role, "roles")}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: '2px solid',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    position: 'relative',
                    overflow: 'hidden',
                    ...(formData.roles.includes(role) ? {
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
                    if (!saving) {
                      if (formData.roles.includes(role)) {
                        e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.4)';
                      } else {
                        e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.color = '#3b82f6';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      if (formData.roles.includes(role)) {
                        e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                      } else {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.color = '#6b7280';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>{role}</span>
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)',
                    transform: formData.roles.includes(role) ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'transform 0.3s ease'
                  }}></div>
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              🌐 Languages
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleChip(lang, "languages")}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: '2px solid',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    position: 'relative',
                    overflow: 'hidden',
                    ...(formData.languages.includes(lang) ? {
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
                    if (!saving) {
                      if (formData.languages.includes(lang)) {
                        e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.4)';
                      } else {
                        e.target.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                        e.target.style.borderColor = '#10b981';
                        e.target.style.color = '#10b981';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      if (formData.languages.includes(lang)) {
                        e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                      } else {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.color = '#6b7280';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>{lang}</span>
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(90deg, #f59e0b, #10b981, #3b82f6)',
                    transform: formData.languages.includes(lang) ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'transform 0.3s ease'
                  }}></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
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
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
            borderRadius: '50%',
            transform: 'translate(-20px, -20px)',
            zIndex: 1
          }}></div>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: '20px', 
            fontWeight: '700',
            color: '#1f2937',
            position: 'relative',
            zIndex: 2
          }}>
            📍 Location
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            position: 'relative',
            zIndex: 2
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Living Area
              </label>
              <input
                type="text"
                value={formData.livingArea}
                onChange={(e) => handleChange("livingArea", e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  fontSize: '14px',
                  color: '#374151',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
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
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
            borderRadius: '50%',
            transform: 'translate(30px, -30px)',
            zIndex: 1
          }}></div>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: '20px', 
            fontWeight: '700',
            color: '#1f2937',
            position: 'relative',
            zIndex: 2
          }}>
            📝 Additional Notes
          </h3>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              disabled={saving}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                fontSize: '14px',
                color: '#374151',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                resize: 'vertical'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '32px',
          padding: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              background: 'white',
              color: '#6b7280',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                e.target.style.borderColor = '#6b7280';
                e.target.style.color = '#374151';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(107, 114, 128, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#6b7280';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>Cancel</span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, #6b7280, #374151)',
              transform: 'scaleX(0)',
              transition: 'transform 0.3s ease'
            }}></div>
          </button>
          <button 
            type="submit" 
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
              fontSize: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.4)';
                e.target.style.animation = 'pulse 1.5s infinite';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.3)';
                e.target.style.animation = 'none';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>
              {saving ? "Saving Changes..." : "Save Changes"}
            </span>
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
        </div>
      </form>
    </div>
  );
}
