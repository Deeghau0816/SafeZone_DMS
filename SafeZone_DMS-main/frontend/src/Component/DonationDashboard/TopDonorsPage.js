// frontend/src/Component/DonationDashboard/TopDonorsPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: `${API_BASE}/api` });

const asNumber = (v) =>
  (typeof v === "object" && v?.$numberDecimal ? Number(v.$numberDecimal) : Number(v));

const fmtMoney = (v, currency = "LKR") => {
  const n = asNumber(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
};

const normWA = (raw) => {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) return d.replace("+", "");
  return d.startsWith("0") ? "94" + d.slice(1) : d;
};
const waMsg = (d) =>
  encodeURIComponent(
    `Thank you ${d.isAnonymous ? "dear donor" : d.donorName || "dear donor"} for your generous contribution of ${fmtMoney(d.amount, d.currency)}. We truly appreciate your support!`
  );

export default function TopDonorsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/donations", {
          params: { page: 1, limit: 200, sort: "top" },
          signal: ctrl.signal,
        });
        const onlyPublic = (d) => !d.isAnonymous && !!d.allowNamePublic;
        setItems((data.items || []).filter(onlyPublic));
      } catch (e) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") {
          setErr(e?.response?.data?.message || e.message || "Network Error");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return (
    <div className="ngo-wrap">
      <div className="ngo-head">
        <h1 className="ngo-title">Top donors</h1>
        <button className="ngo-btn" onClick={() => navigate("/ngo-dashboard/donations")}>Back to list</button>
      </div>

      <div className="ngo-tablewrap">
        <table className="ngo-table">
          <thead>
            <tr>
              <th>Donor</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Channel</th>
              <th>Ref / Txn</th>
              <th className="ngo-tight">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="muted">Loading…</td></tr>
            ) : err ? (
              <tr><td colSpan="7" className="ngo-error">{err}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="7" className="ngo-empty">No donors yet.</td></tr>
            ) : (
              items.map((d) => {
                const wa = normWA(d.whatsapp || d.donorPhone);
                const waHref = wa ? `https://wa.me/${wa}?text=${waMsg(d)}` : null;
                const type = (d.donorType || "Individual").toLowerCase();

                return (
                  <tr key={d._id || d.id}>
                    <td>
                      <div className="strong">
                        {d.donorName || "-"}
                        <span className={`ngo-type ngo-type--${type}`}>{d.donorType || "Individual"}</span>
                      </div>
                    </td>
                    <td className="muted">{d.donorEmail || "—"}</td>
                    <td>
                      {d.donorPhone || "—"}
                      {d.whatsapp ? <div className="muted">WA: {d.whatsapp}</div> : null}
                    </td>
                    <td>{fmtMoney(d.amount, d.currency)}</td>
                    <td>{d.channel || "—"}</td>
                    <td>
                      <div>{d.referenceNo || "—"}</div>
                      <div className="muted">{d.transactionRef || "—"}</div>
                    </td>
                    <td className="ngo-tight">
                      {waHref ? (
                        <a className="ngo-btn ngo-btn-wa" href={waHref} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      ) : (
                        <button className="ngo-btn" disabled>WhatsApp</button>
                      )}
                      <button className="ngo-btn" onClick={() => navigate(`/ngo-dashboard/donations/${d._id || d.id}/edit`)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
