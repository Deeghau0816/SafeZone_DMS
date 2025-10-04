// frontend/src/Component/DonationDashboard/DonationEditPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./donationcss/donate_dashboard.css";

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

  if (err) return <div className="ngo-wrap"><p className="ngo-error">{err}</p></div>;
  if (!data) return <div className="ngo-wrap"><p className="muted">Loading…</p></div>;

  const wa = normWA(data.whatsapp || data.donorPhone);
  const waHref = wa ? `https://wa.me/${wa}?text=${waMsg(data)}` : null;

  return (
    <div className="ngo-wrap">
      <div className="ngo-head">
        <h1 className="ngo-title">Edit Donation</h1>
        <div>
          <button className="ngo-btn" onClick={() => navigate(-1)}>Back</button>
          <button className="ngo-btn ngo-btn-danger" onClick={remove}>Delete</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Deposit evidence</div>
        {data.evidence?.path ? (
          <a href={`${API_BASE}${data.evidence.path}`} target="_blank" rel="noreferrer">
            <img className="ngo-slipthumb" src={`${API_BASE}${data.evidence.path}`} alt="slip" />
          </a>
        ) : (
          <div className="muted">No file uploaded</div>
        )}
        <div style={{ marginTop: 8 }}>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      {/* Donor type */}
      <div className="row gap12" style={{marginBottom:6}}>
        <label className="strong">Donor type:</label>
        <label className="ngo-switch">
          <input
            type="radio"
            name="dtype"
            checked={(data.donorType || "Individual") === "Individual"}
            onChange={() => set("donorType", "Individual")}
          />
          <span>Individual</span>
        </label>
        <label className="ngo-switch">
          <input
            type="radio"
            name="dtype"
            checked={data.donorType === "Organization"}
            onChange={() => set("donorType", "Organization")}
          />
          <span>Organization</span>
        </label>
      </div>

      <div className="ngo-formgrid">
        <label>Donor name
          <input className="ngo-input" value={data.donorName || ""} onChange={(e) => set("donorName", e.target.value)} />
        </label>
        <label>Email
          <input className="ngo-input" value={data.donorEmail || ""} onChange={(e) => set("donorEmail", e.target.value)} />
        </label>
        <label>Phone
          <input className="ngo-input" value={data.donorPhone || ""} onChange={(e) => set("donorPhone", e.target.value)} />
        </label>
        <label>Amount
          <input type="number" className="ngo-input" value={data.amount ?? ""} onChange={(e) => set("amount", e.target.value)} />
        </label>
        <label>Currency
          <select className="ngo-select" value={data.currency || ""} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Channel
          <select className="ngo-select" value={data.channel || ""} onChange={(e) => set("channel", e.target.value)}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Gateway (if online)
          <input className="ngo-input" value={data.gateway || ""} onChange={(e) => set("gateway", e.target.value)} />
        </label>
        <label>Bank name (if deposit)
          <input className="ngo-input" value={data.bankName || ""} onChange={(e) => set("bankName", e.target.value)} />
        </label>
        <label>Branch
          <input className="ngo-input" value={data.branch || ""} onChange={(e) => set("branch", e.target.value)} />
        </label>
        <label>Reference No
          <input className="ngo-input" value={data.referenceNo || ""} onChange={(e) => set("referenceNo", e.target.value)} />
        </label>
        <label>Transaction Ref
          <input className="ngo-input" value={data.transactionRef || ""} onChange={(e) => set("transactionRef", e.target.value)} />
        </label>

        {/* Dates */}
        <label>Deposit date
          <input type="date" className="ngo-input" value={toDateValue(data.depositDate)} onChange={(e) => set("depositDate", e.target.value)} />
        </label>
        <label>Recorded at (date &amp; time)
          <input type="datetime-local" className="ngo-input" value={toDTLocalValue(data.createdAt)} onChange={(e) => set("createdAt", e.target.value)} />
        </label>

        <label>Status
          <select className="ngo-select" value={data.status || "RECEIVED"} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Note
          <textarea className="ngo-input" rows={3} value={data.note || ""} onChange={(e) => set("note", e.target.value)} />
        </label>
      </div>

      {/* Visibility toggles */}
      <div className="row gap12" style={{marginBottom:16}}>
        <label className="ngo-switch">
          <input type="checkbox" checked={!!data.isAnonymous} onChange={(e)=> set("isAnonymous", e.target.checked)} />
            <span>Make donor anonymous</span>
        </label>
        <label className="ngo-switch">
          <input type="checkbox" checked={!!data.allowNamePublic} onChange={(e)=> set("allowNamePublic", e.target.checked)} />
          <span>Allow name to be public</span>
        </label>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button disabled={saving} className="ngo-btn ngo-btn-primary" onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {waHref && (
          <a className="ngo-btn" href={waHref} target="_blank" rel="noreferrer">
            Send WhatsApp Thank-you
          </a>
        )}
      </div>
    </div>
  );
}
