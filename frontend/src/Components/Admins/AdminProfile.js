import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "./AdminProfile.css";

export default function AdminProfile() {
  const nav = useNavigate();

  const [load, setLoad] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // admin profile
  const [form, setForm] = useState({
    name: "",
    email: "",
    contactNumber: "",
    adminName: "System Admin",
  });

  // password form
  const [pw, setPw] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // load admin profile
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoad(true);
      setErr("");
      setMsg("");
      try {
        const { data } = await axios.get("/admin/me", { withCredentials: true });
        if (!cancel) {
          if (data?.ok && data.admin) {
            const { name, email, contactNumber, adminName } = data.admin;
            setForm({
              name: name || "",
              email: email || "",
              contactNumber: contactNumber || "",
              adminName: adminName || "System Admin",
            });
          } else {
            setErr(data?.message || "Failed to load admin profile");
          }
        }
      } catch (e) {
        if (!cancel) setErr("Network error");
      } finally {
        if (!cancel) setLoad(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  const onPwChange = (e) => setPw((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setErr(""); setMsg(""); setSaving(true);
    try {
      const { data } = await axios.put("/admin/me", form, { withCredentials: true });
      if (data?.ok) setMsg("Saved");
      else setErr(data?.message || "Update failed");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (changingPw) return;
    if (!pw.currentPassword || !pw.newPassword) {
      setErr("Enter both current and new password");
      return;
    }
    setErr(""); setMsg(""); setChangingPw(true);
    try {
      const { data } = await axios.put("/admin/me/password", pw, { withCredentials: true });
      if (data?.ok) {
        setMsg("Password updated");
        setPw({ currentPassword: "", newPassword: "" });
      } else {
        setErr(data?.message || "Password update failed");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Password update failed");
    } finally {
      setChangingPw(false);
    }
  };

  const onDeleteAdmin = async () => {
    if (deleting) return;
    const sure = window.confirm(
      "This will permanently delete your ADMIN account and log you out. Continue?"
    );
    if (!sure) return;

    setErr(""); setMsg(""); setDeleting(true);
    try {
      const { data } = await axios.delete("/admin/me", { withCredentials: true });
      if (data?.ok) {
        alert("Admin account deleted.");
        nav("/AdminLogin"); // adjust if your login route differs
      } else {
        setErr(data?.message || "Delete failed");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (load) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div className="up-wrap">
      <h2>Admin Profile</h2>

      {err && <p className="up-alert up-alert--error">{err}</p>}
      {msg && <p className="up-alert up-alert--ok">{msg}</p>}

      {/* Header meta (avatar + name/email) */}
      <div className="up-meta">
        <div className="up-avatar">
          {form.name?.charAt(0)?.toUpperCase() || "A"}
        </div>
        <div className="up-id">
          <div className="name">{form.name || "Admin"}</div>
          <div className="email">{form.email || "—"}</div>
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={onSave} className="up-form">
        <div className="up-form-grid">
          <div className="up-field">
            <label htmlFor="name">name</label>
            <input
              id="name"
              className="up-input"
              name="name"
              value={form.name}
              onChange={onChange}
              required
            />
          </div>

          <div className="up-field">
            <label htmlFor="email">email</label>
            <input
              id="email"
              className="up-input"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="up-field">
            <label htmlFor="contactNumber">contact</label>
            <input
              id="contactNumber"
              className="up-input"
              name="contactNumber"
              value={form.contactNumber}
              onChange={onChange}
              placeholder="+94 7X XXX XXXX or 07XXXXXXXX"
            />
          </div>

          <div className="up-field">
            <label htmlFor="adminName">admin type</label>
            <select
              id="adminName"
              className="up-input"
              name="adminName"
              value={form.adminName}
              onChange={onChange}
            >
              <option value="System Admin">System Admin</option>
              <option value="Disaster Management Officer">Disaster Management Officer</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="up-actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Updating..." : "Update"}
          </button>
          <button type="button" className="btn secondary" onClick={() => nav(-1)}>
            back
          </button>
          <button
            type="button"
            className="deleteButton"
            onClick={onDeleteAdmin}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={onChangePassword} className="up-form" style={{ marginTop: 16 }}>
        <div className="up-form-grid">
          <div className="up-field">
            <label htmlFor="currentPassword">current password</label>
            <input
              id="currentPassword"
              className="up-input"
              type="password"
              name="currentPassword"
              value={pw.currentPassword}
              onChange={onPwChange}
              required
            />
          </div>

          <div className="up-field">
            <label htmlFor="newPassword">new password</label>
            <input
              id="newPassword"
              className="up-input"
              type="password"
              name="newPassword"
              value={pw.newPassword}
              onChange={onPwChange}
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="up-actions">
          <button type="submit" className="btn" disabled={changingPw}>
            {changingPw ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
