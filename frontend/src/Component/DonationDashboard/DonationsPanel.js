import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: `${API_BASE}/api` });

const CHANNELS = ["Bank deposit", "Cash", "Online gateway", "Mobile wallet", "Cheque"];
const CURRENCIES = ["LKR", "USD", "EUR"];

const asNumber = (v) =>
  (typeof v === "object" && v?.$numberDecimal ? Number(v.$numberDecimal) : Number(v));

const fmtMoney = (v, currency = "LKR") => {
  const n = asNumber(v);
  if (!Number.isFinite(n)) return "-";
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

// Year=short can throw RangeError on some locales; keep numeric
const fmtDateOneLine = (v) => {
  const d = new Date(v);
  return v && !isNaN(d.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    : "-";
};

const badgeKind = (s) =>
  s === "RECEIVED" ? "ok" : s === "PENDING" ? "warn" : s === "FAILED" ? "err" : s === "REFUNDED" ? "info" : "neutral";

/* WhatsApp helpers */
const normWA = (raw) => {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) return d.replace("+", "");
  return d.startsWith("0") ? "94" + d.slice(1) : d;
};
const waMsg = (d) =>
  encodeURIComponent(
    `Thank you ${d.isAnonymous ? "dear donor" : (d.donorName || "dear donor")} for your generous contribution of ${fmtMoney(d.amount, d.currency)}. We truly appreciate your support!`
  );

export default function DonationsPanel() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [donorType, setDonorType] = useState(""); // "", "Individual", "Organization"  <-- NEW
  const [channel, setChannel] = useState("");
  const [currency, setCurrency] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [sort] = useState("latest");

  const pages = Math.max(1, Math.ceil(Number(total) / Number(limit)));

  // Smart typing: if the user types "organization list" etc, auto-apply donorType
  const trySmartTypeFilter = (val) => {
    const low = String(val).trim().toLowerCase();
    if (/^org(anization)?s?( list)?$/.test(low)) {
      setDonorType("Organization");
      return true;
    }
    if (/^ind(ividual)?s?( list)?$/.test(low)) {
      setDonorType("Individual");
      return true;
    }
    return false;
  };

  const fetchList = async (signal) => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/donations", {
        params: {
          page,
          limit,
          q: q || undefined,
          donorType: donorType || undefined, // <-- NEW
          channel: channel || undefined,
          currency: currency || undefined,
          sort,
        },
        signal,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.name !== "CanceledError" && e.name !== "AbortError") {
        setErr(e?.response?.data?.message || e.message || "Network Error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchList(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, q, donorType, channel, currency]);

  const resetFilters = () => {
    setQ("");
    setDonorType("");
    setChannel("");
    setCurrency("");
    setPage(1);
  };

  const exportCSV = () => {
    const header = [
      "Donor Type","Donor Name","Email","Phone","WhatsApp","Amount","Currency","Channel","Gateway",
      "Reference No","Transaction Ref","Created At","Status","Is Anonymous","Allow name public"
    ];
    const rows = items.map((d) => [
      d.donorType || "",
      d.isAnonymous ? "Anonymous" : d.donorName || "",
      d.donorEmail || "",
      d.donorPhone || "",
      d.whatsapp || "",
      asNumber(d.amount) || "",
      d.currency || "",
      d.channel || "",
      d.gateway || "",
      d.referenceNo || "",
      d.transactionRef || "",
      d.createdAt || "",
      d.status || "",
      d.isAnonymous ? "Yes" : "No",
      d.allowNamePublic ? "Yes" : "No",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donations_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this donation? This cannot be undone.")) return;
    try {
      await api.delete(`/donations/${id}`);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Delete failed");
    }
  };

  /* ------- Top scrollbar that mirrors the table (easier horizontal scroll) ------- */
  const topRef = useRef(null);
  const wrapRef = useRef(null);
  const tableRef = useRef(null);
  const [scrollW, setScrollW] = useState(0);

  useLayoutEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScrollW(el.scrollWidth));
    ro.observe(el);
    setScrollW(el.scrollWidth);
    return () => ro.disconnect();
  }, []);

  const onTopScroll = (e) => {
    if (!wrapRef.current) return;
    wrapRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };
  const onWrapScroll = (e) => {
    if (!topRef.current) return;
    topRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  return (
    <div className="ngo-wrap">
      <div className="ngo-head">
        <h1 className="adp-disaster-title">Donations Panel</h1>
        <div className="row gap8">
          <button className="ngo-btn" onClick={() => navigate("/dashboard/donations/top")}>
            Top donors
          </button>
          <button className="ngo-btn ngo-btn-primary" onClick={() => navigate("/donation/new")}>
            Open Donation Form
          </button>
        </div>
      </div>

      <div className="ngo-toolbar">
        <input
          className="ngo-input"
          placeholder="Search name / email / phone / reference…  (tip: type 'organization list')"
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setPage(1);
            if (trySmartTypeFilter(v)) {
              setQ(""); // auto-switched to donorType; keep q empty
            } else {
              setQ(v);
            }
          }}
        />

        {/* NEW: Donor Type filter */}
        <select
          className="ngo-select"
          value={donorType}
          onChange={(e) => { setDonorType(e.target.value); setPage(1); }}
          title="Filter by donor type"
        >
          <option value="">All donors</option>
          <option value="Individual">Individual</option>
          <option value="Organization">Organization</option>
        </select>

        <select
          className="ngo-select"
          value={channel}
          onChange={(e) => { setChannel(e.target.value); setPage(1); }}
        >
          <option value="">All channels</option>
          {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>

        <select
          className="ngo-select"
          value={currency}
          onChange={(e) => { setCurrency(e.target.value); setPage(1); }}
        >
          <option value="">All currencies</option>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className="ngo-select"
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>

        <button className="ngo-btn" onClick={() => fetchList()}>Refresh</button>
        <button className="ngo-btn" onClick={resetFilters}>Reset</button>
        <button className="ngo-btn" onClick={exportCSV} disabled={items.length === 0}>Export CSV</button>
      </div>

      {/* Top scrollbar */}
      <div className="ngo-hscroll" ref={topRef} onScroll={onTopScroll}>
        <div style={{ width: scrollW, height: 1 }} />
      </div>

      <div className="ngo-tablewrap" ref={wrapRef} onScroll={onWrapScroll}>
        <table className="ngo-table" ref={tableRef}>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Channel</th>
              <th>Ref / Txn</th>
              <th>Date</th>
              <th>Slip</th>
              <th className="ngo-tight">Status</th>
              <th className="ngo-tight">Visibility</th>
              <th className="ngo-tight">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="muted">Loading…</td></tr>
            ) : err ? (
              <tr><td colSpan="11" className="ngo-error">{err}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="11" className="ngo-empty">No donations found.</td></tr>
            ) : (
              items.map((d) => {
                const wa = normWA(d.whatsapp || d.donorPhone);
                const waHref = wa ? `https://wa.me/${wa}?text=${waMsg(d)}` : null;
                const type = (d.donorType || "Individual").toLowerCase();

                return (
                  <tr key={d._id || d.id}>
                    <td>
                      <div className="strong">
                        {d.isAnonymous ? "Anonymous" : d.donorName || "-"}
                        <span className={`ngo-type ngo-type--${type}`}>{d.donorType || "Individual"}</span>
                      </div>
                      <div className="muted">Donor</div>
                    </td>

                    <td className="muted">{d.donorEmail || "-"}</td>
                    <td>
                      {d.donorPhone || "-"}
                      {d.whatsapp ? <div className="muted">WA: {d.whatsapp}</div> : null}
                    </td>

                    <td>
                      <div>{fmtMoney(d.amount, d.currency)}</div>
                      {Number(d.fees) > 0 && <div className="muted">fees: {fmtMoney(d.fees, d.currency)}</div>}
                    </td>

                    <td>
                      <div>{d.channel || "-"}</div>
                      {d.gateway && <div className="muted">{d.gateway}</div>}
                    </td>

                    <td>
                      <div>{d.referenceNo || "-"}</div>
                      <div className="muted">{d.transactionRef || "-"}</div>
                    </td>

                    <td className="ngo-date">{fmtDateOneLine(d.createdAt)}</td>

                    <td className="ngo-tight">
                      {d.evidence?.path ? (
                        <a className="ngo-btn" href={`${API_BASE}${d.evidence.path}`} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : "—"}
                    </td>

                    <td className="ngo-tight">
                      <span className={`ngo-badge ngo-badge--${badgeKind(d.status)}`}>{d.status || "—"}</span>
                    </td>

                    <td className="ngo-tight">
                      {d.isAnonymous ? (
                        <span className="ngo-badge ngo-badge--neutral">Anonymous</span>
                      ) : d.allowNamePublic ? (
                        <span className="ngo-badge ngo-badge--public">Public</span>
                      ) : (
                        <span className="ngo-badge ngo-badge--hidden">Hidden</span>
                      )}
                    </td>

                    <td className="ngo-tight">
                      <div className="ngo-rowacts">
                        {waHref ? (
                          <a className="ngo-btn ngo-btn-wa" href={waHref} target="_blank" rel="noreferrer" title="Send WhatsApp thank-you">
                            WhatsApp
                          </a>
                        ) : (
                          <button className="ngo-btn" title="No number available" disabled>
                            WhatsApp
                          </button>
                        )}
                        <button className="ngoo-btn" onClick={() => navigate(`/dashboard/donations/${d._id || d.id}/edit`)}>
                          Edit
                        </button>
                        <button className="ngo-btn ngo-btn-danger" onClick={() => onDelete(d._id || d.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="ngo-pager">
        <button className="ngo-pagebtn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`ngo-pagebtn ${page === n ? "ngo-pagebtn--active" : ""}`} onClick={() => setPage(n)}>
            {n}
          </button>
        ))}
        {pages > 5 && <span className="muted" style={{ padding: "0 6px" }}>… {pages}</span>}
        <button className="ngo-pagebtn" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
          Next
        </button>
      </div>
    </div>
  );
}
