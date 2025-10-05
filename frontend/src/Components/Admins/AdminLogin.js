import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../../api/axios";
import "./AdminLogin.css";

export default function AdminLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await axios.post("/admin/login", form, { withCredentials: true });
      if (res.data?.ok) nav("/AdminHome");
      else setErr(res.data?.message || "Login failed");
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Server error");
    }
  };

  return (
    <div className="al-page">
      <div className="al-card">
        <h2 className="al-title">Admin Login</h2>

        {err && <p className="al-error" role="alert">{err}</p>}

        <form className="al-form" onSubmit={onSubmit} noValidate>
          <div className="al-field">
            <label htmlFor="email" className="al-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
              placeholder="admin@example.com"
              className="al-input"
              autoComplete="email"
            />
          </div>

          <div className="al-field">
            <label htmlFor="password" className="al-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
              placeholder="••••••••"
              className="al-input"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="al-btn">Login</button>
        </form>

        <div className="al-foot">
          <small>
            No account?{" "}
            <Link className="al-link" to="/AdminHome/AdminRegitration">
              Register
            </Link>
          </small>
        </div>
      </div>
    </div>
  );
}
