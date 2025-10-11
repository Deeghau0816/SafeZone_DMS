// frontend/src/Component/DonationDashboard/DonationEditPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: `${API_BASE}/api` });

const CHANNELS = ["Bank deposit", "Cash", "Online gateway", "Mobile wallet", "Cheque"];
const CURRENCIES = ["LKR", "USD", "EUR"];
const STATUSES  = ["PLEDGED","PENDING","RECEIVED","FAILED","REFUNDED"];

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
const toDateValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toDTLocalValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toISODate = (v) => { // YYYY-MM-DD -> ISO midnight UTC
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y,m,d] = v.split("-").map(Number);
    return new Date(Date.UTC(y, m-1, d, 0, 0, 0)).toISOString();
  }
  return new Date(v).toISOString();
};
const num = (n, c="LKR") => new Intl.NumberFormat(undefined,{style:"currency", currency:c, maximumFractionDigits:2}).format(Number(n||0));
const normWA = (raw) => {
  const d = String(raw || "").replace(/[^\d]/g, "");
  if (!d) return "";
  return d.startsWith("0") ? ("94" + d.slice(1)) : d;
};
const waMsg = (d) =>
  encodeURIComponent(
    `Thank you ${d.isAnonymous ? "dear donor" : (d.donorName || "dear donor")} for your generous contribution of ${num(d.amount, d.currency)}. We truly appreciate your support!`
  );

export default function DonationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ---- theme (auto light/dark) ----
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const theme = useMemo(
    () => ({
      pageBg: prefersDark ? "#0b0f14" : "#ffffff",
      cardBg: prefersDark ? "#111827" : "#ffffff",
      text: prefersDark ? "#e5e7eb" : "#111827",
      muted: prefersDark ? "#9ca3af" : "#6b7280",
      border: prefersDark ? "#1f2937" : "#e5e7eb",
      brand: prefersDark ? "#60a5fa" : "#3b82f6",
      brandText: "#ffffff",
      danger: prefersDark ? "#ef4444" : "#dc2626",
      chipBg: prefersDark ? "#1f2937" : "#f3f4f6",
      inputBg: prefersDark ? "#0b0f14" : "#ffffff",
      panelTint: prefersDark ? "#0f172a" : "#f8fafc",
      shadow: prefersDark
        ? "0 10px 30px rgba(0,0,0,.55)"
        : "0 10px 30px rgba(0,0,0,.12)"
    }),
    [prefersDark]
  );

  const styles = useMemo(() => {
    const baseField = {
      width: "100%",
      height: 40,
      borderRadius: 8,
      padding: "0 12px",
      border: `1px solid ${theme.border}`,
      background: theme.inputBg,
      color: theme.text,
      outline: "none",
    };
    return {
      wrap: {
        maxWidth: 1000,
        margin: "0 auto",
        padding: "24px 16px 48px",
        color: theme.text,
        background: theme.pageBg,
      },
      head: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
        borderBottom: `1px solid ${theme.border}`,
        paddingBottom: 8,
      },
      title: { margin: 0, fontSize: 26, fontWeight: 800, color: theme.text },
      btn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 38,
        padding: "0 14px",
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        background: theme.inputBg,
        color: theme.text,
        cursor: "pointer",
        textDecoration: "none",
      },
      btnPrimary: {
        background: theme.brand,
        border: `1px solid ${theme.brand}`,
        color: theme.brandText,
      },
      btnDanger: {
        background: prefersDark ? "#7f1d1d" : "#fee2e2",
        border: `1px solid ${theme.danger}`,
        color: theme.danger,
      },
      row: { display: "flex", alignItems: "center", gap: 12 },
      muted: { color: theme.muted },
      thumb: {
        display: "block",
        width: 220,
        maxHeight: 180,
        objectFit: "cover",
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
        boxShadow: theme.shadow,
      },
      formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
        background: theme.cardBg,
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        marginBottom: 16,
      },
      label: { display: "grid", gap: 6, fontSize: 13, color: theme.text },
      input: baseField,
      select: baseField,
      textarea: {
        ...baseField,
        height: "auto",
        minHeight: 96,
        padding: 12,
        lineHeight: 1.4,
        resize: "vertical",
      },
      switchesRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: theme.panelTint,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 12,
      },
      switch: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
        color: theme.text,
        cursor: "pointer",
      },
    };
  }, [theme, prefersDark]);

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/donations/${id}`);
        setData(data.donation);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message);
      }
    })();
  }, [id]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true); setErr("");
    try {
      // Normalize dates to ISO strings
      const payload = { ...data };
      if (payload.depositDate) payload.depositDate = toISODate(payload.depositDate);
      if (payload.createdAt)  payload.createdAt  = new Date(payload.createdAt).toISOString();

      const fd = new FormData();
      [
        "donorType","donorName","donorEmail","donorPhone","amount","currency","channel","gateway",
        "bankName","branch","referenceNo","transactionRef","status","note",
        "depositDate","createdAt",
        "isAnonymous","allowNamePublic"
      ].forEach((k) => {
        const v = payload[k];
        if (v !== undefined && v !== null && v !== "") fd.append(k, v);
      });
      if (file) fd.append("evidence", file);

      await api.put(`/donations/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Updated");
      navigate("/dashboard/donations");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this donation?")) return;
    try {
      await api.delete(`/donations/${id}`);
      navigate("/dashboard/donations");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  if (err) {
    return (
      <div style={styles.wrap}>
        <p style={{ ...styles.muted, color: theme.danger, fontWeight: 600 }}>{err}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={styles.wrap}>
        <p style={styles.muted}>Loading…</p>
      </div>
    );
  }

  const wa = normWA(data.whatsapp || data.donorPhone);
  const waHref = wa ? `https://wa.me/${wa}?text=${waMsg(data)}` : null;

  return (
    <div style={styles.wrap}>
      {/* header */}
      <div style={styles.head}>
        <h1 style={styles.title}>Edit Donation</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btn} onClick={() => navigate(-1)}>Back</button>
          <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={remove}>Delete</button>
        </div>
      </div>

      {/* evidence */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: theme.text }}>Deposit evidence</div>
        {data.evidence?.path ? (
          <a href={`${API_BASE}${data.evidence.path}`} target="_blank" rel="noreferrer">
            <img
              src={`${API_BASE}${data.evidence.path}`}
              alt="slip"
              style={styles.thumb}
            />
          </a>
        ) : (
          <div style={styles.muted}>No file uploaded</div>
        )}
        <div style={{ marginTop: 8 }}>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      {/* Donor type */}
      <div style={{ ...styles.row, marginBottom: 6 }}>
        <label style={{ fontWeight: 700, color: theme.text }}>Donor type:</label>
        <label style={styles.switch}>
          <input
            type="radio"
            name="dtype"
            checked={(data.donorType || "Individual") === "Individual"}
            onChange={() => set("donorType", "Individual")}
          />
          <span>Individual</span>
        </label>
        <label style={styles.switch}>
          <input
            type="radio"
            name="dtype"
            checked={data.donorType === "Organization"}
            onChange={() => set("donorType", "Organization")}
          />
          <span>Organization</span>
        </label>
      </div>

      {/* form grid */}
      <div style={styles.formGrid}>
        <label style={styles.label}>Donor name
          <input style={styles.input} value={data.donorName || ""} onChange={(e) => set("donorName", e.target.value)} />
        </label>
        <label style={styles.label}>Email
          <input style={styles.input} value={data.donorEmail || ""} onChange={(e) => set("donorEmail", e.target.value)} />
        </label>
        <label style={styles.label}>Phone
          <input style={styles.input} value={data.donorPhone || ""} onChange={(e) => set("donorPhone", e.target.value)} />
        </label>
        <label style={styles.label}>Amount
          <input type="number" style={styles.input} value={data.amount ?? ""} onChange={(e) => set("amount", e.target.value)} />
        </label>
        <label style={styles.label}>Currency
          <select style={styles.select} value={data.currency || ""} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={styles.label}>Channel
          <select style={styles.select} value={data.channel || ""} onChange={(e) => set("channel", e.target.value)}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={styles.label}>Gateway (if online)
          <input style={styles.input} value={data.gateway || ""} onChange={(e) => set("gateway", e.target.value)} />
        </label>
        <label style={styles.label}>Bank name (if deposit)
          <input style={styles.input} value={data.bankName || ""} onChange={(e) => set("bankName", e.target.value)} />
        </label>
        <label style={styles.label}>Branch
          <input style={styles.input} value={data.branch || ""} onChange={(e) => set("branch", e.target.value)} />
        </label>
        <label style={styles.label}>Reference No
          <input style={styles.input} value={data.referenceNo || ""} onChange={(e) => set("referenceNo", e.target.value)} />
        </label>
        <label style={styles.label}>Transaction Ref
          <input style={styles.input} value={data.transactionRef || ""} onChange={(e) => set("transactionRef", e.target.value)} />
        </label>

        {/* Dates */}
        <label style={styles.label}>Deposit date
          <input type="date" style={styles.input} value={toDateValue(data.depositDate)} onChange={(e) => set("depositDate", e.target.value)} />
        </label>
        <label style={styles.label}>Recorded at (date &amp; time)
          <input type="datetime-local" style={styles.input} value={toDTLocalValue(data.createdAt)} onChange={(e) => set("createdAt", e.target.value)} />
        </label>

        <label style={styles.label}>Status
          <select style={styles.select} value={data.status || "RECEIVED"} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ ...styles.label, gridColumn: "1 / -1" }}>Note
          <textarea style={styles.textarea} rows={3} value={data.note || ""} onChange={(e) => set("note", e.target.value)} />
        </label>
      </div>

      {/* Visibility toggles */}
      <div style={{ ...styles.switchesRow, marginBottom: 16 }}>
        <label style={styles.switch}>
          <input type="checkbox" checked={!!data.isAnonymous} onChange={(e)=> set("isAnonymous", e.target.checked)} />
          <span>Make donor anonymous</span>
        </label>
        <label style={styles.switch}>
          <input type="checkbox" checked={!!data.allowNamePublic} onChange={(e)=> set("allowNamePublic", e.target.checked)} />
          <span>Allow name to be public</span>
        </label>
      </div>

      {/* actions */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          disabled={saving}
          onClick={save}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            opacity: saving ? 0.8 : 1,
            pointerEvents: saving ? "none" : "auto",
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            style={styles.btn}
          >
            Send WhatsApp Thank-you
          </a>
        )}
      </div>
    </div>
  );
}
