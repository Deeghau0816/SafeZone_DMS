import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./Volunteer.css";

/* ----------------------- storage + helpers ----------------------- */
const LS_VOL = "volunteers_dashboard_v1";
const uid = () => Math.random().toString(36).slice(2, 9);

function readVols() {
  try {
    const raw = localStorage.getItem(LS_VOL);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeVols(list) {
  localStorage.setItem(LS_VOL, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("volunteers:updated", { detail: list }));
}

/* lists (tweak later) */
const OPERATIONS = [
  {
    id: "op-1",
    name: "Sector 7 Distribution — Colombo / Gampaha",
    remaining: 12,
  },
  { id: "op-2", name: "Medical camp — Kalutara", remaining: 4 },
  { id: "op-3", name: "Kitchen & packing — Matara", remaining: 20 },
];
const ROLE_OPTIONS = ["Driver", "Medic", "Logistics", "Cooking", "Translator"];

/* --------------------------- validation --------------------------- */
const phoneRe = /^[+()\-.\s\d]{9,20}$/; // pragmatic
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields, isTeam, remainingSlots) {
  const errs = {};

  // Required
  if (!fields.fullName?.trim()) errs.fullName = "Name is required.";
  else if (fields.fullName.trim().length < 2)
    errs.fullName = "Use at least 2 characters.";

  if (!fields.phone?.trim()) errs.phone = "Phone is required.";
  else if (!phoneRe.test(fields.phone.trim()))
    errs.phone = "Enter a valid phone number.";

  if (!fields.city?.trim()) errs.city = "City is required.";

  if (!fields.date) errs.date = "Please choose a date.";

  if (!fields.roles?.length) errs.roles = "Pick at least one role.";

  // Optional + format checks
  if (fields.email?.trim() && !emailRe.test(fields.email.trim())) {
    errs.email = "Email looks invalid.";
  }
  if (fields.whatsapp?.trim() && !phoneRe.test(fields.whatsapp.trim())) {
    errs.whatsapp = "WhatsApp number looks invalid.";
  }

  // Team constraints
  if (isTeam) {
    const n = Number(fields.members || 0);
    if (!Number.isInteger(n) || n < 2)
      errs.members = "Teams must have ≥ 2 members.";
    if (typeof remainingSlots === "number" && n > remainingSlots) {
      errs.members = `Only ${remainingSlots} slot(s) remaining for this operation.`;
    }
  }

  // Operation required (defensive, should always exist)
  if (!fields.operationId) errs.operationId = "Select an operation.";

  return errs;
}

/* ------------------------------- component ------------------------------- */
export default function Volunteeredit() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || "/dashboard/admin/volunteers";

  const all = readVols();
  const original = all.find((v) => v.id === id);

  // if not found, go back
  useEffect(() => {
    if (!original) nav(backTo, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ---------- fields (prefill) ---------- */
  const [fullName, setFullName] = useState(original?.fullName || "");
  const [email, setEmail] = useState(original?.email || "");
  const [phone, setPhone] = useState(original?.phone || "");
  const [whatsapp, setWhatsapp] = useState(original?.whatsapp || "");
  const [city, setCity] = useState(original?.city || "");
  const [group, setGroup] = useState(original?.group || "");

  const [volType, setVolType] = useState(
    (original?.members || 1) > 1 ? "team" : "individual"
  );
  const isTeam = volType === "team";
  const [members, setMembers] = useState(
    (original?.members || 1) > 1 ? Number(original?.members) : 2
  );

  const [roles, setRoles] = useState(original?.roles || []);
  const [date, setDate] = useState(original?.date || "");
  const [time, setTime] = useState(original?.time || "full");
  const [operationId, setOperationId] = useState(
    original?.operationId || OPERATIONS[0].id
  );
  const [notes, setNotes] = useState(original?.notes || "");

  const remainingSlots = useMemo(
    () => OPERATIONS.find((o) => o.id === operationId)?.remaining ?? null,
    [operationId]
  );

  /* ---------- validation state ---------- */
  const [touched, setTouched] = useState({});
  const fields = {
    fullName,
    email,
    phone,
    whatsapp,
    city,
    group,
    volunteerType: volType,
    members: isTeam ? Number(members || 2) : 1,
    roles,
    date,
    time,
    operationId,
    notes,
  };
  const errors = validate(fields, isTeam, remainingSlots);
  const show = (k) => touched[k] && errors[k];

  /* For scrolling to first error on submit */
  const refs = {
    fullName: useRef(null),
    phone: useRef(null),
    email: useRef(null),
    whatsapp: useRef(null),
    city: useRef(null),
    date: useRef(null),
    roles: useRef(null),
    members: useRef(null),
    operationId: useRef(null),
  };
  useEffect(() => {
    // When errors change after submit-touch-all, scroll to first error
    const firstKey = Object.keys(errors)[0];
    if (firstKey && touched.__submitted) {
      const el = refs[firstKey]?.current;
      if (el?.scrollIntoView)
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errors, touched, refs]);

  /* ---------- role helpers ---------- */
  function toggleRole(r) {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }
  function addCustomRole(e) {
    const val = e.target.value.trim();
    if (e.key === "Enter" && val) {
      if (!roles.includes(val)) setRoles((prev) => [...prev, val]);
      e.target.value = "";
      e.preventDefault();
    }
  }

  /* ---------- save / cancel ---------- */
  function cancel() {
    nav(backTo);
  }

  function save(e) {
    e.preventDefault();

    // mark all as touched + submission flag
    setTouched({
      fullName: true,
      phone: true,
      email: true,
      whatsapp: true,
      city: true,
      date: true,
      roles: true,
      members: true,
      operationId: true,
      __submitted: true,
    });

    if (Object.keys(errors).length) return; // block save

    const next = {
      ...original,
      id: original?.id || uid(),
      fullName,
      email,
      phone,
      whatsapp,
      city,
      group,
      volunteerType: volType,
      members: isTeam ? Number(members || 2) : 1,
      roles,
      date,
      time,
      operationId,
      notes,
    };

    const list = readVols();
    const i = list.findIndex((v) => v.id === next.id);
    if (i >= 0) list[i] = next;
    else list.unshift(next);

    writeVols(list);
    nav(backTo);
  }

  /* ---------- UI ---------- */
  if (!original) return null;

  return (
    <form className="vl-wrap" onSubmit={save}>
      {/* Header */}
      <header className="vl-hero">
        <div className="left">
          <h1 className="vl-title">Edit volunteer</h1>
          <p className="vl-sub">
            Update contact, roles, availability and assignment.
          </p>
        </div>
        <div className="right">
          <button type="button" className="btn btn-ghost" onClick={cancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </header>

      {/* Contact */}
      <section className="vl-panel">
        <h3 className="section-title">Contact</h3>
        <div className="grid2">
          <div className="field">
            <label>Full name *</label>
            <input
              ref={refs.fullName}
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              placeholder="e.g., Tharindu Perera"
              required
            />
            {show("fullName") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.fullName}
              </div>
            )}
          </div>

          <div className="field">
            <label>Phone *</label>
            <input
              ref={refs.phone}
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="+94 XX XXX XXXX"
              required
            />
            {show("phone") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.phone}
              </div>
            )}
          </div>

          <div className="field">
            <label>Email</label>
            <input
              ref={refs.email}
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="name@email.com"
            />
            {show("email") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.email}
              </div>
            )}
          </div>

          <div className="field">
            <label>WhatsApp (optional)</label>
            <input
              ref={refs.whatsapp}
              className="input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, whatsapp: true }))}
              placeholder="+94 XX XXX XXXX"
            />
            {show("whatsapp") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.whatsapp}
              </div>
            )}
          </div>

          <div className="field">
            <label>City *</label>
            <input
              ref={refs.city}
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, city: true }))}
              placeholder="e.g., Ratnapura"
              required
            />
            {show("city") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.city}
              </div>
            )}
          </div>

          <div className="field">
            <label>Group</label>
            <input
              className="input"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g., Medical / Logistics / Kitchen"
            />
          </div>
        </div>
      </section>

      {/* Type */}
      <section className="vl-panel">
        <h3 className="section-title">Type</h3>
        <div className="field">
          <div className="seg" role="group" aria-label="Volunteer type">
            <button
              type="button"
              className={`seg-btn ${volType === "individual" ? "on" : ""}`}
              aria-pressed={volType === "individual"}
              onClick={() => {
                setVolType("individual");
                setMembers(2);
              }}
            >
              Individual
            </button>
            <button
              type="button"
              className={`seg-btn ${volType === "team" ? "on" : ""}`}
              aria-pressed={volType === "team"}
              onClick={() => {
                setVolType("team");
                setMembers((m) => Number(m || 2));
              }}
            >
              Team / Group
            </button>
          </div>
        </div>

        {isTeam ? (
          <div className="field" style={{ marginTop: 8 }}>
            <label>Members to assign *</label>
            <input
              ref={refs.members}
              className="input"
              type="number"
              min="2"
              step="1"
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, members: true }))}
            />
            {show("members") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.members}
              </div>
            )}
            {typeof remainingSlots === "number" && !errors.members && (
              <div className="hint">
                Remaining slots in this operation: {remainingSlots}
              </div>
            )}
          </div>
        ) : (
          <div className="hint">Individual — counted as 1</div>
        )}
      </section>

      {/* Roles */}
      <section className="vl-panel">
        <h3 className="section-title">Roles / skills *</h3>
        <div className="field" ref={refs.roles}>
          <div className="tagpick">
            {ROLE_OPTIONS.map((r) => {
              const on = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  className={`chip ${on ? "on" : ""}`}
                  onClick={() =>
                    setRoles((prev) =>
                      on ? prev.filter((x) => x !== r) : [...prev, r]
                    )
                  }
                  aria-pressed={on}
                >
                  {r}
                </button>
              );
            })}
            <input
              className="input chip-input"
              placeholder="Other (type & press Enter)"
              onKeyDown={addCustomRole}
            />
          </div>
          {show("roles") && (
            <div className="hint" style={{ color: "#b91c1c" }}>
              {errors.roles}
            </div>
          )}
          {!errors.roles && roles.length > 0 && (
            <div className="hint">Selected: {roles.join(", ")}</div>
          )}
        </div>
      </section>

      {/* Availability & assignment */}
      <section className="vl-panel">
        <h3 className="section-title">Availability & assignment</h3>

        <div className="grid2">
          <div className="field">
            <label>Available date *</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]} // Prevent selecting previous dates
            />

            {show("date") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.date}
              </div>
            )}
          </div>

          <div className="field">
            <label>Time</label>
            <div className="seg" role="group" aria-label="Time of day">
              {["morning", "afternoon", "evening", "full"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`seg-btn ${time === t ? "on" : ""}`}
                  aria-pressed={time === t}
                  onClick={() => setTime(t)}
                >
                  {t === "full" ? "Full day" : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 8 }}>
          <div className="field">
            <label>Operation *</label>
            <select
              ref={refs.operationId}
              className="input"
              value={operationId}
              onChange={(e) => setOperationId(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, operationId: true }))}
              required
            >
              {OPERATIONS.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
            {show("operationId") && (
              <div className="hint" style={{ color: "#b91c1c" }}>
                {errors.operationId}
              </div>
            )}
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Health, travel, languages, equipment…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* bottom sticky actions */}
      <div className="vl-actions">
        <button type="button" className="btn btn-ghost" onClick={cancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
