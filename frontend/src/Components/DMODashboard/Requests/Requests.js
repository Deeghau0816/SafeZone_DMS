import React, { useState } from "react";

export default function FulfillRequestDialog({ open, onClose, onSubmit, aid }) {
  const [form, setForm] = useState({
    org: "Medical Teams",
    victim: "",
    priority: "Medium",
    resources: "",
    contact: "",
    special: "",
  });
  const [errors, setErrors] = useState({});

  const update = (e) => {
    const { name, value } = e.target;
    if (name === "contact") {
      const digits = String(value).replace(/\D/g, "").slice(0, 10);
      setForm((f) => ({ ...f, contact: digits }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = (s) => {
    const err = {};
    const resources = String(s.resources || "").trim();
    const special = String(s.special || "").trim();
    const contact = String(s.contact || "").trim();
    const onlyDigits = /^[0-9]{10}$/;
    const sameDigit10 = /^(\d)\1{9}$/;
    if (!resources) err.resources = "Resource allocated is required";
    if (!special) err.special = "Special instructions are required";
    else if (special.length < 5) err.special = "Special instructions must be at least 5 characters";
    if (!contact) err.contact = "DMO contact is required";
    else if (!onlyDigits.test(contact)) err.contact = "Contact must be exactly 10 digits";
    else if (sameDigit10.test(contact)) err.contact = "Contact cannot be the same digit repeated 10 times";
    return err;
  };

  const submit = (e) => {
    e.preventDefault();
    const err = validate(form);
    setErrors(err);
    if (Object.keys(err).length) return;
    if (typeof onSubmit === "function") onSubmit({ ...form, aidId: aid?._id || aid?.id });
  };

  // Prefill victim details from the selected aid (exclude email, NIC, urgency)
  React.useEffect(() => {
    if (!aid) return;
    const name = aid.name || "";
    const phone = aid.phone || "";
    const address = aid.address || "";
    const location = aid.location || "";
    const aidType = aid.aidType || "";
    const description = aid.description || "";
    const submitted = aid.createdAt || aid.submittedAt || aid.date || "";
    const fmt = (d) => {
      try { if (!d) return ""; const dt = new Date(d); return isNaN(dt.getTime()) ? String(d) : dt.toLocaleString(); } catch { return String(d || ""); }
    };
    const prefill = [
      name && `Name: ${name}`,
      phone && `Phone: ${phone}`,
      address && `Address: ${address}`,
      location && `Location: ${location}`,
      aidType && `Aid Type: ${aidType}`,
      description && `Details: ${description}`,
      submitted && `Submitted: ${fmt(submitted)}`,
    ].filter(Boolean).join("\n");
    setForm((f) => ({ ...f, victim: f.victim || prefill }));
  }, [aid]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={styles.backdrop}>
      <div style={styles.modal}>
        <header style={styles.header}>
          <h3 style={{ margin: 0 }}>Fulfill Aid Request</h3>
          <button 
            onClick={onClose} 
            className="ra-btn ra-btn--ghost"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.color = "";
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
            }}
            style={{ 
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              transform: "translateZ(0)"
            }}
          >
            Close
          </button>
        </header>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }} noValidate>
          <label style={styles.field}>
            <span style={styles.label}>Assigned Organization</span>
            <select name="org" value={form.org} onChange={update} style={styles.input}>
              <option>Medical Teams</option>
              <option>NGO</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Details of the Victim</span>
            <textarea name="victim" value={form.victim} onChange={update} style={{ ...styles.input, minHeight: 72 }} placeholder="Brief victim details" />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Priority</span>
            <select name="priority" value={form.priority} onChange={update} style={styles.input}>
              <option>Normal</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Resource Allocated</span>
            <input name="resources" value={form.resources} onChange={update} style={{ ...styles.input, ...(errors.resources ? styles.invalid : null) }} placeholder="e.g., 2 ambulances, 5 kits" />
            {errors.resources && <span style={styles.error}>{errors.resources}</span>}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>DMO Contact Number</span>
            <input
              name="contact"
              value={form.contact}
              onChange={update}
              style={{ ...styles.input, ...(errors.contact ? styles.invalid : null) }}
              placeholder="e.g., 0712345678"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              onKeyDown={(e) => {
                const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"]; if (allowed.includes(e.key)) return; if (/^\d$/.test(e.key)) return; e.preventDefault();
              }}
              onPaste={(e) => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData("text"); const digits = String(t).replace(/\D/g, "").slice(0,10); setForm((f)=>({...f, contact: digits})); }}
            />
            {errors.contact && <span style={styles.error}>{errors.contact}</span>}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Special Instructions</span>
            <textarea name="special" value={form.special} onChange={update} style={{ ...styles.input, ...(errors.special ? styles.invalid : null), minHeight: 80 }} placeholder="Instructions for the team" />
            {errors.special && <span style={styles.error}>{errors.special}</span>}
          </label>

          <footer style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button 
              type="button" 
              className="ra-btn ra-btn--ghost" 
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
                e.currentTarget.style.color = "";
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
              style={{ 
                transition: "all 0.3s ease",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                transform: "translateZ(0)"
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="ra-btn ra-btn--primary"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#22c55e";
                e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
              style={{ 
                transition: "all 0.3s ease",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                transform: "translateZ(0)"
              }}
            >
              Submit
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", border: "1px solid #e5e9f1", borderRadius: 12, width: "min(640px, 100%)", padding: 16, boxShadow: "0 10px 24px rgba(0,0,0,0.15)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "#6b7280" },
  input: { border: "1px solid #e5e9f1", borderRadius: 8, padding: "10px 12px", fontSize: 14 },
  error: { color: "#b91c1c", fontSize: 12 },
  invalid: { borderColor: "#fca5a5", background: "#fff7f7" },
};


