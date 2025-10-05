import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./UserProfile.css";

export default function UserProfile() {
  const nav = useNavigate();

  const [me, setMe] = useState(null);      
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    district: "",
    city: "",
    postalCode: "",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancel = false;

    (async () => {
      setLoad(true);
      setErr("");
      try {
        const r = await fetch("http://localhost:5000/auth/me", { credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          if (!cancel) setMe(data.user || null);
        } else {
          if (!cancel) setMe(null);
        }
      } catch {
        if (!cancel) setMe(null);
      } finally {
        if (!cancel) setLoad(false);
      }
    })();

    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!me) return; 
    let cancel = false;

    (async () => {
      setLoad(true);
      setErr("");
      try {
        const r = await fetch(`http://localhost:5000/users/${me.id}`, { credentials: "include" });
        const data = await r.json().catch(() => ({}));
        if (!cancel) {
          if (!r.ok) {
            setErr(data.message || "Failed to load profile");
          } else {
            setForm({
              firstName: data.user?.firstName || "",
              lastName: data.user?.lastName || "",
              contactNumber: data.user?.contactNumber || "",
              district: data.user?.district || "",
              city: data.user?.city || "",
              postalCode: data.user?.postalCode || "",
            });
          }
        }
      } catch {
        if (!cancel) {
          setErr("Network error");
        }
      } finally {
        if (!cancel) setLoad(false);
      }
    })();

    return () => { cancel = true; };
  }, [me]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!me || saving) return;
    setErr(""); setMsg(""); setSaving(true);
    try {
      const r = await fetch(`http://localhost:5000/users/${me.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(data.message || "Update failed");
      } else {
        setMsg("Saved");
      }
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!me || deleting) return;
    const sure = window.confirm("This will permanently delete your account. Continue?");
    if (!sure) return;

    setErr(""); setMsg(""); setDeleting(true);
    try {
      const r = await fetch("http://localhost:5000/users/me", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(data.message || "Delete failed");
      } else {
        alert("Account deleted.");
        nav("/Home");
      }
    } catch {
      setErr("Network error");
    } finally {
      setDeleting(false);
    }
  };

  if (load) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!me) {
    return (
      <div className="up-wrap">
        <h2>User Profile</h2>
        <div className="up-form">
          <p>You are not logged in.</p>
          <div className="up-actions">
            <Link to="/UserLogin" className="btn">login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="up-wrap">
      <h2>User Profile</h2>

      {err && <p className="up-alert up-alert--error">{err}</p>}
      {msg && <p className="up-alert up-alert--ok">{msg}</p>}

      <div className="up-meta">
        <div className="up-avatar">
          {me.firstName?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="up-id">
          <div className="name">{me.firstName} {me.lastName}</div>
          <div className="email">{me.email}</div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={onSave} className="up-form">
        <div className="up-form-grid">
          <div className="up-field">
            <label htmlFor="firstName">first name</label>
            <input id="firstName" className="up-input" name="firstName" value={form.firstName} onChange={onChange} required />
          </div>

          <div className="up-field">
            <label htmlFor="lastName">last name</label>
            <input id="lastName" className="up-input" name="lastName" value={form.lastName} onChange={onChange} required />
          </div>

          <div className="up-field">
            <label htmlFor="contactNumber">contact</label>
            <input id="contactNumber" className="up-input" name="contactNumber" value={form.contactNumber} onChange={onChange} required />
          </div>

          <div className="up-field">
            <label htmlFor="district">district</label>
            <select id="district" className="up-input" name="district" value={form.district} onChange={onChange} required>
              <option value="">-- select --</option>
              {[
                "Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota",
                "Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee",
                "Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"
              ].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="up-field">
            <label htmlFor="city">city</label>
            <input id="city" className="up-input" name="city" value={form.city} onChange={onChange} required />
          </div>

          <div className="up-field">
            <label htmlFor="postalCode">postal code</label>
            <input id="postalCode" className="up-input" name="postalCode" value={form.postalCode} onChange={onChange} required />
          </div>
        </div>

        <div className="up-actions">
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          
          <button type="button" className="deleteButton" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
            
          <button type="button" className="btn secondary" onClick={() => nav(-1)}>back</button>
        </div>
      </form>
    </div>
  );
}
