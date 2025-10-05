import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "./AdminRegistration.css";

/* Simple validators (email + Sri Lankan mobile) */
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const phoneRx = /^(?:\+?94[-\s]?(7\d{1})[-\s]?\d{3}[-\s]?\d{4}|0?7\d{8})$/;

/* Tiny password strength scoring (0..4) */
function scorePassword(pw = "") {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function AdminRegistration() {
  const nav = useNavigate();

  // form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    contactNumber: "",
    adminName: "System Admin",
    password: "",
  });

  // ui state
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // update helper
  const setField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // derive inline errors
  const fieldErrors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!emailRx.test(form.email)) e.email = "Enter a valid email address.";
    if (!phoneRx.test(form.contactNumber))
      e.contactNumber = "Enter a valid Sri Lankan mobile (07xxxxxxxx or +94…).";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters.";
    return e;
  }, [form]);

  const isValid = Object.keys(fieldErrors).length === 0;
  const pwScore = scorePassword(form.password);

  // submit
  const submit = async (ev) => {
    ev.preventDefault();
    setErr("");
    setOkMsg("");
    // mark all as touched to reveal errors
    setTouched({ name: true, email: true, contactNumber: true, password: true });
    if (!isValid) return;

    try {
      setSubmitting(true);
      const res = await axios.post("/admin/register", form);
      if (res.data?.ok) {
        setOkMsg("Admin registered. Redirecting to login…");
        setTimeout(() => nav("/AdminLogin"), 600);
      } else {
        setErr(res.data?.message || "Registration failed");
      }
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ar-page">
      <div className="ar-card">
        <h2 className="ar-title">Admin Registration</h2>

        {/* top alerts */}
        {err && <p className="ar-error">{err}</p>}
        {okMsg && <p className="ar-success">{okMsg}</p>}

        <form className="ar-form" onSubmit={submit} noValidate>
          {/* ===== Name ===== */}
          <div className={`ar-field ${touched.name && fieldErrors.name ? "error" : ""} ${touched.name && !fieldErrors.name ? "success" : ""}`}>
            <label className="ar-label" htmlFor="name">Name</label>
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                {/* user icon */}
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                id="name"
                name="name"
                type="text"
                className="ar-input has-left"
                value={form.name}
                onChange={setField}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder="Your full name"
                aria-invalid={!!(touched.name && fieldErrors.name)}
                aria-describedby="name-help"
                autoComplete="name"
              />
            </div>
            <div id="name-help" className="ar-help">Use your official name.</div>
            {touched.name && fieldErrors.name && <div className="ar-error-text">{fieldErrors.name}</div>}
          </div>

          {/* ===== Email ===== */}
          <div className={`ar-field ${touched.email && fieldErrors.email ? "error" : ""} ${touched.email && !fieldErrors.email ? "success" : ""}`}>
            <label className="ar-label" htmlFor="email">Email</label>
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                {/* mail icon */}
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                className="ar-input has-left"
                value={form.email}
                onChange={setField}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="admin@example.com"
                aria-invalid={!!(touched.email && fieldErrors.email)}
                aria-describedby="email-help"
                autoComplete="email"
              />
            </div>
            <div id="email-help" className="ar-help">We’ll send verification here.</div>
            {touched.email && fieldErrors.email && <div className="ar-error-text">{fieldErrors.email}</div>}
          </div>

          {/* ===== Contact Number ===== */}
          <div className={`ar-field ${touched.contactNumber && fieldErrors.contactNumber ? "error" : ""} ${touched.contactNumber && !fieldErrors.contactNumber ? "success" : ""}`}>
            <label className="ar-label" htmlFor="contactNumber">Contact Number</label>
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                {/* phone icon */}
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.33 2.3.52 3.5.52a1 1 0 0 1 1 1v3.25a1 1 0 0 1-1 1A18 18 0 0 1 3 6a1 1 0 0 1 1-1h3.25a1 1 0 0 1 1 1c0 1.2.19 2.4.52 3.5a1 1 0 0 1-.25 1l-2.92 2.3Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                id="contactNumber"
                name="contactNumber"
                type="tel"
                className="ar-input has-left"
                value={form.contactNumber}
                onChange={setField}
                onBlur={() => setTouched((t) => ({ ...t, contactNumber: true }))}
                placeholder="+94 7x xxx xxxx"
                aria-invalid={!!(touched.contactNumber && fieldErrors.contactNumber)}
                aria-describedby="phone-help"
                autoComplete="tel"
              />
            </div>
            <div id="phone-help" className="ar-help">Use +94… or 07xxxxxxxx.</div>
            {touched.contactNumber && fieldErrors.contactNumber && <div className="ar-error-text">{fieldErrors.contactNumber}</div>}
          </div>

          {/* ===== Admin Type (Select) ===== */}
          <div className={`ar-field ${touched.adminName && !form.adminName ? "error" : ""} ${touched.adminName && form.adminName ? "success" : ""}`}>
            <label className="ar-label" htmlFor="adminName">Admin Type</label>
            <div className="ar-input-wrap">
              <select
                id="adminName"
                name="adminName"
                className="ar-select"
                value={form.adminName}
                onChange={setField}
                onBlur={() => setTouched((t) => ({ ...t, adminName: true }))}
                aria-describedby="role-help"
              >
                <option value="System Admin">System Admin</option>
                <option value="Disaster Management Officer">Disaster Management Officer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div id="role-help" className="ar-help">Choose the closest role.</div>
          </div>

          {/* ===== Password ===== */}
          <div className={`ar-field ${touched.password && fieldErrors.password ? "error" : ""} ${touched.password && !fieldErrors.password ? "success" : ""}`}>
            <label className="ar-label" htmlFor="password">Password</label>
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                {/* lock icon */}
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>

              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                className="ar-input has-left has-right"
                value={form.password}
                onChange={setField}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="At least 8 characters"
                aria-invalid={!!(touched.password && fieldErrors.password)}
                aria-describedby="pw-help"
                autoComplete="new-password"
              />

              <span className="ar-right">
                <button
                  type="button"
                  className="ar-icon-btn"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </span>
            </div>

            {/* strength bars */}
            <div className="ar-strength" data-score={pwScore}>
              <span></span><span></span><span></span><span></span>
            </div>

            <div id="pw-help" className="ar-help">
              Use upper & lower case, a number, and a symbol for a strong password.
            </div>
            {touched.password && fieldErrors.password && (
              <div className="ar-error-text">{fieldErrors.password}</div>
            )}
          </div>

          {/* submit */}
          <button type="submit" className="ar-btn" disabled={!isValid || submitting}>
            {submitting ? "Creating…" : "Create Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
