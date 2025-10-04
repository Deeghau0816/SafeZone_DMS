import React, { useState } from "react";

export default function Assign({ open, onClose, onSubmit, reportId, victim }) {
  const [form, setForm] = useState({
    team: "Army",
    teamName: "",
    contact: "",
    notes: "",
    urgent: "Medium",
    specialInstructions: "",
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

  const validate = (state) => {
    const err = {};
    const teamName = String(state.teamName || "").trim();
    const contact = String(state.contact || "").trim();
    const notes = String(state.notes || "").trim();
    const specialInstructions = String(state.specialInstructions || "").trim();

    if (teamName.length === 0) err.teamName = "Team name is required";

    // must be exactly 10 digits, no letters/special chars, not same digit repeated
    const onlyDigits = /^[0-9]{10}$/;
    const sameDigit10 = /^(\d)\1{9}$/; // 10 identical digits (e.g., 0000000000, 9999999999)
    if (contact.length === 0) err.contact = "Contact number is required";
    else if (!onlyDigits.test(contact)) err.contact = "Contact must be exactly 10 digits";
    else if (sameDigit10.test(contact)) err.contact = "Contact cannot be the same digit repeated 10 times";

    if (notes.length === 0) err.notes = "Deployment notes are required";
    else if (notes.length < 5) err.notes = "Deployment notes must be at least 5 characters";

    if (specialInstructions.length === 0) err.specialInstructions = "Special instructions are required";
    else if (specialInstructions.length < 5) err.specialInstructions = "Special instructions must be at least 5 characters";

    return err;
  };

  const submit = (e) => {
    e.preventDefault();
    const err = validate(form);
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    if (typeof onSubmit === "function") onSubmit({ ...form, reportId });
  };

  // Prefill deployment notes with victim details (excluding NIC, email, status)
  React.useEffect(() => {
    if (!victim) return;
    const prefillName = victim.name || victim.victimName || "";
    const address = victim.address || "";
    const disasterType = victim.disasterType || "";
    const locationStr = victim.locationStr || "";
    const lat = victim.lat != null ? victim.lat : victim.location?.coordinates?.[1];
    const lng = victim.lng != null ? victim.lng : victim.location?.coordinates?.[0];
    const coords = (lat != null && lng != null) ? `${lat}, ${lng}` : "";
    const occurred = victim.occurredAt || null;
    const reported = victim.createdAt || victim.date || null;
    const fmt = (d) => {
      try {
        if (!d) return "";
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d) : dt.toLocaleString();
      } catch {
        return String(d || "");
      }
    };

    const noteLines = [
      prefillName && `Victim: ${prefillName}`,
      victim.phone && `Phone: ${victim.phone}`,
      disasterType && `Disaster: ${disasterType}`,
      address && `Address: ${address}`,
      (locationStr || coords) && `Location: ${locationStr || coords}`,
      occurred && `Occurred At: ${fmt(occurred)}`,
      reported && `Reported At: ${fmt(reported)}`,
      victim.description && `Details: ${victim.description}`,
    ].filter(Boolean).join("\n");

    setForm((f) => ({ ...f, notes: f.notes || noteLines }));
  }, [victim]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={styles.backdrop}>
      <div style={styles.modal}>
        <header style={styles.header}>
          <h3 style={{ margin: 0 }}>Assign Response Team</h3>
          <button onClick={onClose} className="ra-btn ra-btn--ghost">Close</button>
        </header>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }} noValidate>
          <label style={styles.field}>
            <span style={styles.label}>Select Team</span>
            <select name="team" value={form.team} onChange={update} style={styles.input}>
              <option>Army</option>
              <option>Police</option>
              <option>Fire Brigade</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Team Name</span>
            <input
              name="teamName"
              value={form.teamName}
              onChange={update}
              style={{ ...styles.input, ...(errors.teamName ? styles.invalid : null) }}
              placeholder="e.g., Alpha Squad"
              aria-invalid={!!errors.teamName}
            />
            {errors.teamName && <span style={styles.error}>{errors.teamName}</span>}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Urgent Level</span>
            <select
              name="urgent"
              value={form.urgent}
              onChange={update}
              style={styles.input}
              aria-label="Urgent level"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>DMO Contact No</span>
            <input
              name="contact"
              value={form.contact}
              onChange={update}
              style={{ ...styles.input, ...(errors.contact ? styles.invalid : null) }}
              placeholder="e.g., 0712345678"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={!!errors.contact}
              maxLength={10}
              onKeyDown={(e) => {
                const allowed = [
                  "Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"
                ];
                if (allowed.includes(e.key)) return;
                if (/^\d$/.test(e.key)) return;
                e.preventDefault();
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData("text");
                const digits = String(text).replace(/\D/g, "").slice(0, 10);
                setForm((f) => ({ ...f, contact: digits }));
              }}
            />
            {errors.contact && <span style={styles.error}>{errors.contact}</span>}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Deployment Notes</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={update}
              style={{ ...styles.input, ...(errors.notes ? styles.invalid : null), minHeight: 96 }}
              placeholder="Brief instructions, location, supplies, etc."
              aria-invalid={!!errors.notes}
            />
            {errors.notes && <span style={styles.error}>{errors.notes}</span>}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Special Instructions</span>
            <textarea
              name="specialInstructions"
              value={form.specialInstructions}
              onChange={update}
              style={{ ...styles.input, ...(errors.specialInstructions ? styles.invalid : null), minHeight: 72 }}
              placeholder="Any special orders for the team"
              aria-invalid={!!errors.specialInstructions}
            />
            {errors.specialInstructions && <span style={styles.error}>{errors.specialInstructions}</span>}
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
              Assign
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: "#fff",
    border: "1px solid #e5e9f1",
    borderRadius: 12,
    width: "min(640px, 100%)",
    padding: 16,
    boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "#6b7280" },
  input: {
    border: "1px solid #e5e9f1",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
  },
  error: { color: "#b91c1c", fontSize: 12 },
  invalid: { borderColor: "#fca5a5", background: "#fff7f7" },
};


