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
    <div className="dd-vols-wrap">
      {/* Header */}
      <div className="dd-vols-header row between center">
        <div>
          <h1 style={{ margin: 0 }}>Assign Volunteer</h1>
          <div className="muted">Manage volunteers, availability & assignments</div>

          {/* Stats */}
          <div className="row gap12" style={{ marginTop: 8 }}>
            <div className="dd-vols-stat">
              <span className="strong">{assignmentStats.total}</span> Total
            </div>
            <div className="dd-vols-stat">
              <span className="strong" style={{ color: "#22c55e" }}>{assignmentStats.assigned}</span> Assigned
            </div>
            <div className="dd-vols-stat">
              <span className="strong" style={{ color: "#ef4444" }}>{assignmentStats.unassigned}</span> Unassigned
            </div>
            <div className="dd-vols-stat">
              <span className="strong">{assignmentStats.assignedPercentage}%</span> Assigned Rate
            </div>
          </div>
        </div>
        <div className="row gap8">
          <button className="ngo-btn ngo-btn-primary" onClick={() => navigate(FORM_ROUTE, { state: { from: location.pathname } })}>
            + Add Volunteer
          </button>
          <button className="dd-vols-btn dd-vols-btn-ghost" type="button" onClick={() => fetchVolunteers()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginTop: 16, marginBottom: 8 }}>{error}</div>}

      {/* Toolbar */}
      <div className="dd-vols-toolbar row gap12" style={{ marginTop: 16, marginBottom: 8 }}>
        <input
          className="dd-vols-input"
          style={{ flex: 1, minWidth: 260 }}
          placeholder="Search name, phone, email, living area, operation, roles, languages, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          list="vol-suggestions"
        />
        <datalist id="vol-suggestions">
          {suggestions.map((s, i) => (
            <option key={i} value={s} />
          ))}
        </datalist>

        <select
          className="dd-vols-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          title="Filter by type"
        >
          <option value="">All types</option>
          <option value="individual">Individual</option>
          <option value="team">Team</option>
        </select>

        <select
          className="dd-vols-select"
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          title="Filter by assignment status"
        >
          <option value="">All assignments</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>

        <select
          className="dd-vols-select"
          value={operationFilter}
          onChange={(e) => setOperationFilter(e.target.value)}
          title="Filter by operation"
        >
          <option value="">All operations</option>
          {allOperations.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        <button className="dd-vols-btn dd-vols-btn-ghost" type="button" onClick={clearAll}>
          Clear All
        </button>
      </div>

      {/* Advanced filters */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="row gap12" style={{ flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Language (must have ALL selected)</div>
            <div className="dd-vols-roles">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`dd-vols-btn ${filterLanguages.includes(l) ? "dd-vols-btn-primary" : ""}`}
                  onClick={() => toggleChip(l, filterLanguages, setFilterLanguages)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 300 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Role (must have ALL selected)</div>
            <div className="dd-vols-roles">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`dd-vols-btn ${filterRoles.includes(r) ? "dd-vols-btn-primary" : ""}`}
                  onClick={() => toggleChip(r, filterRoles, setFilterRoles)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 260, flex: 1 }}>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Living area (contains)</div>
            <input
              className="dd-vols-input"
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
            <select className="dd-vols-select" value={filterTime} onChange={(e) => setFilterTime(e.target.value)}>
              <option value="">Any</option>
              <option value="day">Daytime</option>
              <option value="night">Night</option>
              <option value="both">Both (24h)</option>
            </select>
          </div>

          <div>
            <div className="strong small muted" style={{ marginBottom: 6 }}>Date from</div>
            <input type="date" className="dd-vols-input" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>

          <div className="row gap8" style={{ alignItems: "flex-end" }}>
            <button className="dd-vols-btn" type="button" onClick={clearAdvanced}>Clear advanced</button>
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
            {search && <span className="dd-vols-filter-tag">Search: "{search}"</span>}
            {typeFilter && <span className="dd-vols-filter-tag">Type: {typeFilter === "individual" ? "Individual" : "Team"}</span>}
            {assignedFilter && <span className="dd-vols-filter-tag">Status: {assignedFilter === "assigned" ? "Assigned" : "Unassigned"}</span>}
            {operationFilter && <span className="dd-vols-filter-tag">Operation: {operationFilter}</span>}
            {filterLanguages.length > 0 && <span className="dd-vols-filter-tag">Languages: {filterLanguages.join(", ")}</span>}
            {filterRoles.length > 0 && <span className="dd-vols-filter-tag">Roles: {filterRoles.join(", ")}</span>}
            {filterLivingArea && <span className="dd-vols-filter-tag">Area: {filterLivingArea}</span>}
            {filterTime && <span className="dd-vols-filter-tag">Time: {filterTime}</span>}
            {filterDateFrom && <span className="dd-vols-filter-tag">Date from: {filterDateFrom}</span>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="dd-vols-table-wrap">
        <table className="dd-vols-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Roles</th>
              <th>Languages</th>
              <th>Date</th>
              <th>Available time</th>
              <th>Living area</th>
              <th>Operation</th>
              <th>Assignment</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="muted" style={{ textAlign: "center" }}>Loading volunteers...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="muted" style={{ textAlign: "center" }}>No volunteers match your filters.</td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v._id}>
                <td>
                  <div className="strong">{v?.fullName || "—"}</div>
                  {v?.email ? <div className="muted small">{v.email}</div> : null}
                </td>
                <td>
                  <a href={`tel:${(v?.phone || "").replace(/\s+/g, "")}`}>{v?.phone || "—"}</a>
                  {v?.whatsapp && v.whatsapp !== v.phone && <div className="muted small">WA: {v.whatsapp}</div>}
                </td>
                <td>
                  <span className={`dd-vols-type-badge ${v?.volunteerType || "individual"}`}>
                    {v?.volunteerType === "team" ? `Team (${v.members || 1})` : "Individual"}
                  </span>
                </td>
                <td>
                  {(v?.roles || []).length ? (
                    <div className="dd-vols-roles">
                      {(v.roles || []).map((r, i) => (
                        <span className="dd-vols-role-chip" key={v._id + r + i}>{r}</span>
                      ))}
                    </div>
                  ) : <span className="muted">—</span>}
                </td>
                <td>{(v?.languages || []).length ? (v.languages || []).join(", ") : <span className="muted">—</span>}</td>
                <td className="ngo-date">{formatDate(v?.date)}</td>
                <td className="ngo-tight">
                  {v?.availableTime === "day" ? "Daytime"
                    : v?.availableTime === "night" ? "Night"
                    : v?.availableTime === "both" ? "Both (24h)" : "—"}
                </td>
                <td>{v?.livingArea || "—"}</td>
                <td>{getOperationName(v)}</td>

                <td>
                  <div>
                    <span className={`dd-vols-assignment-badge ${isAssigned(v) ? "assigned" : "unassigned"}`}>
                      {isAssigned(v) ? "Assigned" : "Unassigned"}
                    </span>
                    {isAssigned(v) && v?.assignedTo && (
                      <div className="muted small" style={{ marginTop: 4 }}>To: {v.assignedTo}</div>
                    )}
                    {isAssigned(v) && v?.assignedDate && (
                      <div className="muted small">Date: {formatDate(v.assignedDate)}</div>
                    )}
                  </div>
                </td>

                <td className="right">
                  <div className="row gap6 right">
                    <button
                      className="adp-btn adp-btn-outline-danger"
                      onClick={() => toggleAssignment(v._id, isAssigned(v), v)}
                      disabled={loading}
                      title={isAssigned(v) ? "Unassign volunteer" : "Assign volunteer"}
                    >
                      {isAssigned(v) ? "Unassign" : "Assign"}
                    </button>

                    <button
                      className="ngoo-btn"
                      onClick={() => navigate(`/dashboard/volunteers/${v._id}/edit`, { state: { from: location.pathname } })}
                      disabled={loading}
                      title="Edit volunteer"
                    >
                      Edit
                    </button>

                    <button
                      className="ngo-btn ngo-btn-danger"
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
                    >
                      Delete
                    </button>

                    <button
                      className="dd-vols-btn dd-vols-btn-wa"
                      onClick={() =>
                        sendWhatsAppMessage(
                          v.whatsapp || v.phone,
                          "🌟 Thanks so much for volunteering—your support means the world. If you're free to help, please message or call 07182995 for the next steps."
                        )
                      }
                      disabled={!v.phone && !v.whatsapp}
                    >
                      WhatsApp
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="row center gap12" style={{ marginTop: 16 }}>
          <button
            className="dd-vols-btn dd-vols-btn-ghost"
            onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page <= 1 || loading}
          >
            Previous
          </button>
          <span className="muted">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            className="dd-vols-btn dd-vols-btn-ghost"
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
//