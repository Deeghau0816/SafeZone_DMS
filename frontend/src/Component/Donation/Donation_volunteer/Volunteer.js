// frontend/src/Component/Volunteer.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Volunteer.css";

/* -------------------------------- API helpers -------------------------------- */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const volunteerApi = {
  getAll: (params = {}) => axios.get(`${API_BASE}/volunteer`, { params }),
  getById: (id) => axios.get(`${API_BASE}/volunteer/${id}`),
  create: (data) => axios.post(`${API_BASE}/volunteer`, data),
  update: (id, data) => axios.put(`${API_BASE}/volunteer/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE}/volunteer/${id}`),
  createBulk: (data) => axios.post(`${API_BASE}/volunteer/bulk`, data),
};

const operationsApi = {
  getAll: () => axios.get(`${API_BASE}/operations`),
};

/* -------------------------------- UI constants -------------------------------- */
const ROLE_OPTIONS = ["Driver", "Medic", "Logistics", "Cooking", "Translator"];
const LANGUAGE_OPTIONS = ["Sinhala", "Tamil", "English"];
const TIME_SLOTS = ["daytime", "night"];

/* -------------------------------- helpers -------------------------------- */
function normalizeInitialSlots(initial) {
  if (!initial) return [];
  let slots = [];

  if (Array.isArray(initial.timeSlots) && initial.timeSlots.length) {
    const s = new Set(initial.timeSlots.map((x) => (x || "").toLowerCase()));
    if (s.has("daytime") || s.has("morning") || s.has("afternoon")) slots.push("daytime");
    if (s.has("night") || s.has("evening")) slots.push("night");
    return Array.from(new Set(slots));
  }

  const t = (initial.time || "").toLowerCase();
  if (!t) return [];
  if (t === "full") return ["daytime", "night"];
  if (t === "multiple") return ["daytime"];
  if (t === "morning" || t === "afternoon") return ["daytime"];
  if (t === "evening") return ["night"];
  if (t === "daytime") return ["daytime"];
  if (t === "night") return ["night"];
  return [];
}

function convertToAvailableTime(timeSlots) {
  if (!timeSlots || timeSlots.length === 0) return null;
  if (timeSlots.length === 2) return "both";
  if (timeSlots.includes("daytime")) return "day";
  if (timeSlots.includes("night")) return "night";
  return null;
}

/* ================================== Component ================================== */
export default function Volunteer() {
  const nav = useNavigate();
  const location = useLocation();
  const initial = location.state?.initial;
  const isEditing = Boolean(initial?._id);

  const handleCancel = () => {
    if (location.state?.from) nav(location.state.from);
    else if (window.history.length > 1) nav(-1);
    else nav("/dashboard");
  };

  /* ---------- Operations ---------- */
  const [operations, setOperations] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(true);

  /* ---------- Basics ---------- */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  /* ---------- Type ---------- */
  const [volType, setVolType] = useState("individual");
  const isTeam = volType === "team";
  const [teamCount, setTeamCount] = useState(2);

  /* ---------- Location ---------- */
  const [livingArea, setLivingArea] = useState("");
  const [group, setGroup] = useState("");
  const groupRef = useRef(null);

  /* ---------- Roles / Languages ---------- */
  const [roles, setRoles] = useState([]);
  const toggleRole = (r) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  function addCustomRole(e) {
    const val = e.target.value.trim();
    if (e.key === "Enter" && val) {
      if (!roles.includes(val)) setRoles((prev) => [...prev, val]);
      e.target.value = "";
      e.preventDefault();
    }
  }

  const [languages, setLanguages] = useState([]);
  const toggleLang = (l) =>
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  function addCustomLang(e) {
    const val = e.target.value.trim();
    if (e.key === "Enter" && val) {
      if (!languages.includes(val)) setLanguages((prev) => [...prev, val]);
      e.target.value = "";
      e.preventDefault();
    }
  }

  /* ---------- Availability ---------- */
  const [date, setDate] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const toggleTime = (slot) =>
    setTimeSlots((prev) => (prev.includes(slot) ? prev.filter((x) => x !== slot) : [...prev, slot]));
  const selectFullDay = () => setTimeSlots([...TIME_SLOTS]);

  /* ---------- Operation (with suggestions) ---------- */
  const [operationId, setOperationId] = useState("");
  const [operationSearch, setOperationSearch] = useState("");

  const opNameOf = (op) =>
    op?.operationName || op?.name || op?.title || op?._id || "";

  const selectedOperation = useMemo(
    () => operations.find((o) => o._id === operationId),
    [operations, operationId]
  );

  useEffect(() => {
    if (!selectedOperation) {
      setOperationSearch("");
    } else {
      setOperationSearch(opNameOf(selectedOperation));
    }
  }, [selectedOperation]);

  const remainingSlots = useMemo(() => {
    const selectedOp = operations.find((o) => o._id === operationId);
    return selectedOp?.volunteerCount ?? null;
  }, [operationId, operations]);

  /* ---------- Notes & state ---------- */
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /* ---------- Fetch operations ---------- */
  useEffect(() => {
    const fetchOperations = async () => {
      try {
        setOperationsLoading(true);
        const response = await operationsApi.getAll();
        const operationsData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.items || response.data.operations || [];
        setOperations(operationsData);
        if (!isEditing && operationsData.length > 0) {
          setOperationId(operationsData[0]._id);
        }
      } catch (error) {
        console.error("Error fetching operations:", error);
        setMsg("Failed to load operations. Please try again.");
      } finally {
        setOperationsLoading(false);
      }
    };
    fetchOperations();
  }, [isEditing]);

  /* ---------- Prefill when editing ---------- */
  useEffect(() => {
    if (!initial) return;
    setFullName(initial.fullName || "");
    setEmail(initial.email || "");
    setPhone(initial.phone || "");
    setWhatsapp(initial.whatsapp || "");
    setLivingArea(initial.livingArea || "");
    setGroup(initial.group || "");

    const members = Number(initial.members || 1);
    if (members > 1) {
      setVolType("team");
      setTeamCount(members);
    } else {
      setVolType("individual");
      setTeamCount(2);
    }

    setRoles(initial.roles || []);
    setLanguages(initial.languages || []);
    setDate(initial.date || "");

    if (initial.availableTime) {
      if (initial.availableTime === "both") setTimeSlots(["daytime", "night"]);
      else if (initial.availableTime === "day") setTimeSlots(["daytime"]);
      else if (initial.availableTime === "night") setTimeSlots(["night"]);
    } else {
      setTimeSlots(normalizeInitialSlots(initial));
    }

    setOperationId(initial.operationId || "");
    setNotes(initial.notes || "");
  }, [initial]);

  /* ---------- Operation search change ---------- */
  const onOperationSearchChange = (val) => {
    setOperationSearch(val);
    const match = operations.find(
      (o) => opNameOf(o).toLowerCase() === String(val).trim().toLowerCase()
    );
    if (match) setOperationId(match._id);
  };

  /* ---------- Submit ---------- */
 async function submit(e) {
  e.preventDefault();
  setMsg("");
  setLoading(true);

  try {
    // Required field checks
    if (!fullName || !phone) {
      setMsg("Please fill your name and phone.");
      setLoading(false);
      return;
    }

    // ✅ Full name validation (no digits)
    if (/\d/.test(fullName)) {
      setMsg("Full name should not contain numbers.");
      setLoading(false);
      return;
    }

    // ✅ Phone validation (Sri Lankan formats)
    const phoneRegex = /^(0[1-9]\d{8}|94[1-9]\d{8}|\+94[1-9]\d{8})$/;
    if (!phoneRegex.test(phone)) {
      setMsg("Please enter a valid phone number.");
      setLoading(false);
      return;
    }

    // ✅ Email validation (if provided)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg("Invalid email format.");
      setLoading(false);
      return;
    }
      if (!date) { setMsg("Please choose an available date."); return; }
      if (roles.length === 0) { setMsg("Please select at least one role/skill."); return; }
      if (timeSlots.length === 0) { setMsg("Please choose Daytime and/or Night."); return; }
      if (!operationId) { setMsg("Please select an operation."); return; }

      const members = isTeam ? Math.max(2, Number(teamCount || 2)) : 1;
      if (isTeam && members < 2) { setMsg("Teams must have at least 2 members."); return; }
      if (typeof remainingSlots === "number" && members > remainingSlots) {
        setMsg(`Only ${remainingSlots} slot(s) remaining for this operation.`); return;
      }

      let timeForLegacy = "multiple";
      if (timeSlots.length === 2) timeForLegacy = "full";
      else if (timeSlots.length === 1) timeForLegacy = timeSlots[0] === "daytime" ? "morning" : "evening";

      const selectedOp = operations.find((o) => o._id === operationId);
      const operationName =
        selectedOp?.operationName || selectedOp?.name || selectedOp?.title || "";

      const volunteerData = {
        fullName,
        email,
        phone,
        whatsapp,
        volunteerType: volType,
        members,
        roles,
        languages,
        date,
        availableTime: convertToAvailableTime(timeSlots),
        time: timeForLegacy,
        timeSlots,
        operationId,
        operationName,
        notes,
        livingArea,
        group,
      };

      if (isEditing) {
        await volunteerApi.update(initial._id, volunteerData);
        setMsg("Volunteer updated successfully!");
      } else {
        await volunteerApi.create(volunteerData);
        setMsg("Volunteer registered successfully!");
      }

      setTimeout(() => handleCancel(), 1500);
    } catch (err) {
      console.error("Error saving volunteer:", err);
      const errorMessage = err.response?.data?.message || err.message || "Something went wrong.";
      setMsg(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------- Render -------------------------------- */
  return (
    <div className="volunteer-component">
      <form className="vol-wrap" onSubmit={submit}>
      {/* Header */}
      <header className="vol-hero">
        <div className="vol-left">
          <h1 className="vol-title">{isEditing ? "Edit Volunteer" : "Volunteer"}</h1>
          <p className="vol-sub">
            {isEditing
              ? "Update volunteer information and assignment details."
              : "Join our field teams and help keep families safe."}
          </p>
        </div>
        <div className="vol-right">
          <button type="button" className="vol-btn vol-btn-ghost" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </header>

      {msg && <div className={`vol-msg ${msg.startsWith("Error:") ? "vol-error" : "vol-success"}`}>{msg}</div>}

      {/* ===== Volunteer type (moved to top) ===== */}
      <section className="vol-panel" style={{ marginTop: 0 }}>
        <div className="vol-field">
          <label>Volunteer type</label>
          <div className="vol-seg" role="group" aria-label="Volunteer type">
            <button
              type="button"
              className={`vol-seg-btn ${volType === "individual" ? "vol-on" : ""}`}
              aria-pressed={volType === "individual"}
              disabled={loading}
              onClick={() => {
                setVolType("individual");
                setTeamCount(2);
              }}
            >
              Individual
            </button>

            <button
              type="button"
              className={`vol-seg-btn ${volType === "team" ? "vol-on" : ""}`}
              aria-pressed={volType === "team"}
              disabled={loading}
              onClick={() => {
                setVolType("team");
                setTeamCount((p) => Math.max(2, Number(p || 2)));
                setTimeout(() => {
                  alert("Team / Group selected. Please provide your group name and details in the Group field.");
                  if (groupRef.current) {
                    groupRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                    groupRef.current.focus();
                  }
                }, 0);
              }}
            >
              Team / Group
            </button>
          </div>
        </div>
      </section>

      {/* About you */}
      <section className="vol-panel">
        <h3 className="vol-section-title">About you</h3>
        <div className="vol-grid2">
          <div className="vol-field">
            <label>Full name *</label>
            <input
              className="vol-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Tharindu Perera"
              required
              disabled={loading}
            />
          </div>
          <div className="vol-field">
            <label>Phone *</label>
            <input
              className="vol-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 XX XXX XXXX"
              required
              disabled={loading}
            />
          </div>
          <div className="vol-field">
            <label>Email</label>
            <input
              className="vol-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              disabled={loading}
            />
          </div>
          <div className="vol-field">
            <label>WhatsApp (optional)</label>
            <input
              className="vol-input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+94 XX XXX XXXX"
              disabled={loading}
            />
          </div>
        </div>

        {/* Location */}
        <div className="vol-grid2">
          <div className="vol-field">
            <label>Living Area</label>
            <input
              className="vol-input"
              value={livingArea}
              onChange={(e) => setLivingArea(e.target.value)}
              placeholder="e.g., Ratnapura, Galle"
              disabled={loading}
            />
          </div>
          <div className="vol-field">
            <label>Group (optional)</label>
            <input
              ref={groupRef}
              className="vol-input"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g., Red Cross, Local Community Group"
              disabled={loading}
            />
          </div>
        </div>

        {/* Roles */}
        <div className="vol-field">
          <label>Role / skill *</label>
          <div className="vol-tagpick">
            {ROLE_OPTIONS.map((r) => {
              const on = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  className={`vol-chip ${on ? "vol-on" : ""}`}
                  onClick={() => toggleRole(r)}
                  aria-pressed={on}
                  disabled={loading}
                >
                  {r}
                </button>
              );
            })}
            <input
              className="vol-input vol-chip-input"
              placeholder="Other (type & press Enter)"
              onKeyDown={addCustomRole}
              disabled={loading}
            />
          </div>
          {roles.length === 0 && <div className="vol-hint">Pick at least one.</div>}
          {roles.length > 0 && <div className="vol-hint">Selected: {roles.join(", ")}</div>}
        </div>

        {/* Languages */}
        <div className="vol-field">
          <label>Languages you can speak</label>
          <div className="vol-tagpick">
            {LANGUAGE_OPTIONS.map((l) => {
              const on = languages.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  className={`vol-chip ${on ? "vol-on" : ""}`}
                  onClick={() => toggleLang(l)}
                  aria-pressed={on}
                  disabled={loading}
                >
                  {l}
                </button>
              );
            })}
            <input
              className="vol-input vol-chip-input"
              placeholder="Other language (type & press Enter)"
              onKeyDown={addCustomLang}
              disabled={loading}
            />
          </div>
          {languages.length > 0 && <div className="vol-hint">Selected: {languages.join(", ")}</div>}
        </div>
      </section>

      {/* Availability & assignment */}
      <section className="vol-panel">
        <h3 className="vol-section-title">Availability & assignment</h3>

        <div className="vol-grid2">
          <div className="vol-field">
            <label>Available date *</label>
            <input
              className="vol-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="vol-field">
            <label>Available time *</label>
            <div className="vol-tagpick" role="group" aria-label="Available time window(s)">
              {TIME_SLOTS.map((slot) => {
                const on = timeSlots.includes(slot);
                const label = slot === "daytime" ? "Daytime" : "Night";
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`vol-chip ${on ? "vol-on" : ""}`}
                    onClick={() => toggleTime(slot)}
                    aria-pressed={on}
                    disabled={loading}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                className={`vol-chip vol-solid ${timeSlots.length === TIME_SLOTS.length ? "vol-on" : ""}`}
                onClick={selectFullDay}
                aria-pressed={timeSlots.length === TIME_SLOTS.length}
                title="Select both (24h)"
                disabled={loading}
              >
                Both (24h)
              </button>
            </div>
            {timeSlots.length === 0 && <div className="vol-hint">Pick Daytime and/or Night.</div>}
          </div>
        </div>

        <div className="vol-grid2">
          <div className="vol-field">
            <label>Operation *</label>

            {/* Searchable suggestions */}
            <input
              list="op-suggestions"
              className="vol-input"
              placeholder={operationsLoading ? "Loading operations..." : "Type to search operations…"}
              value={operationSearch}
              onChange={(e) => onOperationSearchChange(e.target.value)}
              disabled={loading || operationsLoading}
              style={{ marginBottom: 8 }}
            />
            <datalist id="op-suggestions">
              {operations.map((op) => (
                <option key={op._id} value={opNameOf(op)} />
              ))}
            </datalist>

            {/* Fallback precise select */}
            {operationsLoading ? (
              <div className="vol-input" style={{ display: "flex", alignItems: "center", color: "#666" }}>
                Loading…
              </div>
            ) : operations.length === 0 ? (
              <div className="vol-input" style={{ display: "flex", alignItems: "center", color: "#666" }}>
                No operations available
              </div>
            ) : (
              <select
                className="vol-input"
                value={operationId}
                onChange={(e) => setOperationId(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">Select an operation</option>
                {operations.map((op) => (
                  <option key={op._id} value={op._id}>
                    {opNameOf(op)}
                    {typeof op.volunteerCount === "number" ? ` - ${op.volunteerCount} volunteers needed` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isTeam ? (
            <div className="vol-field">
              <label>Members to assign *</label>
              <input
                className="vol-input"
                type="number"
                min="2"
                step="1"
                value={teamCount}
                onChange={(e) => setTeamCount(e.target.value)}
                aria-describedby="team-members-hint"
                required
                disabled={loading}
              />
              <div id="team-members-hint" className="vol-hint">
                Minimum 2 members required
                {typeof remainingSlots === "number" ? ` • Remaining slots: ${remainingSlots}` : ""}.
              </div>
            </div>
          ) : (
            <div className="vol-field">
              <label>Members to assign</label>
              <div className="vol-chip vol-solid">Individual — counted as 1</div>
            </div>
          )}
        </div>

        <div className="vol-field">
          <label>Notes</label>
          <textarea
            className="vol-input"
            rows={3}
            placeholder="Anything we should know (health, travel, etc.)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
          />
        </div>
      </section>

      {/* Bottom actions */}
      <div className="vol-actions">
        <button type="button" className="vol-btn vol-btn-ghost" onClick={handleCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="vol-btn vol-btn-primary" disabled={loading || operationsLoading}>
          {loading ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update" : "Submit")}
        </button>
      </div>
      </form>
    </div>
  );
}
