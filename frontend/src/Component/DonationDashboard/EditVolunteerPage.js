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
      <div className="dd-vols-wrap">
        <div className="dd-vols-header"><h1>Edit Volunteer</h1></div>
        <div className="panel soft" style={{ textAlign: "center", padding: 40 }}>
          <div className="loading-pulse">Loading volunteer data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-vols-wrap">
      {/* Header */}
      <div className="dd-vols-header">
        <div>
          <h1>Edit Volunteer</h1>
          <div className="muted">Update volunteer information</div>
        </div>
        <div className="row gap8">
          <button className="ngo-btn" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="ngo-btn ngo-btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Assignment Status */}
        <div className="panel soft" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
            Assignment Status
          </h3>

          <div className="ngo-formgrid">
            <label>
              Status *
              <select
                className="ngo-select"
                value={formData.assignmentStatus}
                onChange={(e) => handleAssignmentStatusChange(e.target.value)}
                disabled={saving}
              >
                <option value="not_assigned">Not Assigned</option>
                <option value="assigned">Assigned</option>
              </select>
            </label>

            {formData.assignmentStatus === "assigned" && (
              <>
                <label>
                  Assignment Date *
                  <input
                    type="date"
                    className="ngo-input"
                    value={formData.assignedDate}
                    onChange={(e) => handleChange("assignedDate", e.target.value)}
                    required
                    disabled={saving}
                  />
                </label>

                <label>
                  Assigned By
                  <input
                    type="text"
                    className="ngo-input"
                    value={formData.assignedBy}
                    onChange={(e) => handleChange("assignedBy", e.target.value)}
                    placeholder="Enter name of person who made the assignment"
                    disabled={saving}
                  />
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  Assignment Notes
                  <textarea
                    className="ngo-input"
                    style={{ minHeight: 60, marginTop: 8 }}
                    value={formData.assignmentNotes}
                    onChange={(e) =>
                      handleChange("assignmentNotes", e.target.value)
                    }
                    placeholder="Add any notes about this assignment..."
                    disabled={saving}
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="panel soft" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
            Basic Information
          </h3>

          <div className="ngo-formgrid">
            <label>
              Full Name *
              <input
                type="text"
                className="ngo-input"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                required
                disabled={saving}
              />
            </label>

            <label>
              Phone Number *
              <input
                type="tel"
                className="ngo-input"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
                disabled={saving}
              />
            </label>

            <label>
              WhatsApp Number
              <input
                type="tel"
                className="ngo-input"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                disabled={saving}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                className="ngo-input"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={saving}
              />
            </label>

            <label>
              Volunteer Type
              <select
                className="ngo-select"
                value={formData.volunteerType}
                onChange={(e) => handleChange("volunteerType", e.target.value)}
                disabled={saving}
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </label>

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
          <div style={{ marginBottom: 20 }}>
            <div className="strong small muted" style={{ marginBottom: 8 }}>
              Roles & Skills
            </div>
            <div className="dd-vols-roles">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={`dd-vols-btn ${
                    formData.roles.includes(role) ? "dd-vols-btn-primary" : ""
                  }`}
                  onClick={() => toggleChip(role, "roles")}
                  disabled={saving}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div style={{ marginBottom: 20 }}>
            <div className="strong small muted" style={{ marginBottom: 8 }}>
              Languages
            </div>
            <div className="dd-vols-roles">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`dd-vols-btn ${
                    formData.languages.includes(lang)
                      ? "dd-vols-btn-primary"
                      : ""
                  }`}
                  onClick={() => toggleChip(lang, "languages")}
                  disabled={saving}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location (city removed) */}
        <div className="panel soft" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
            Location
          </h3>

          <div className="ngo-formgrid">
            <label>
              Living Area
              <input
                type="text"
                className="ngo-input"
                value={formData.livingArea}
                onChange={(e) => handleChange("livingArea", e.target.value)}
                disabled={saving}
              />
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="panel soft" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
            Additional Notes
          </h3>
          <label style={{ display: "block" }}>
            Notes
            <textarea
              className="ngo-input"
              style={{ minHeight: 80, marginTop: 8 }}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              disabled={saving}
            />
          </label>
        </div>

        <div
          className="row gap12"
          style={{ justifyContent: "flex-end", marginTop: 24 }}
        >
          <button
            type="button"
            className="ngo-btn"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="ngo-btn ngo-btn-primary" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
