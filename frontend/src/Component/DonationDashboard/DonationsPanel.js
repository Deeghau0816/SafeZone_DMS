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

  const exportPDF = () => {
    // Create a simple PDF export functionality
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Donations Report - Page ${page}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .amount { color: #059669; font-weight: bold; }
            .status-received { color: #166534; background-color: #dcfce7; padding: 2px 6px; border-radius: 4px; }
            .status-pending { color: #92400e; background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; }
            .status-failed { color: #991b1b; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px; }
            .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>💰 Donations Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Page:</strong> ${page} of ${pages}</p>
          <p><strong>Total Records:</strong> ${items.length}</p>
          
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Channel</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Status</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((d) => `
                <tr>
                  <td>${d.isAnonymous ? "Anonymous" : d.donorName || "-"} (${d.donorType || "Individual"})</td>
                  <td>${d.donorEmail || "-"}</td>
                  <td>${d.donorPhone || "-"}</td>
                  <td class="amount">${fmtMoney(d.amount, d.currency)}</td>
                  <td>${d.channel || "-"}</td>
                  <td>${d.referenceNo || "-"}</td>
                  <td>${fmtDateOneLine(d.createdAt)}</td>
                  <td><span class="status-${badgeKind(d.status)}">${d.status || "-"}</span></td>
                  <td>${d.isAnonymous ? "Anonymous" : d.allowNamePublic ? "Public" : "Hidden"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated by SafeZone DMS - Donations Management System</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
    <div className="ngo-wrap" style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div className="ngo-head" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
      }}>
        <h1 className="adp-disaster-title" style={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1f2937',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}> Donations Panel</h1>
        <div className="row gap8" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="ngo-btn" onClick={() => navigate("/dashboard/top-donors")} style={{
            padding: '10px 16px',
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            🏆 Top donors
          </button>
          <button className="ngo-btn ngo-btn-primary" onClick={() => navigate("/donation/new")} style={{
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
          }}>
            ➕ Open Donation Form
          </button>
        </div>
      </div>

      <div className="ngo-toolbar" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          className="ngo-input"
          placeholder="🔍 Search name / email / phone / reference…  (tip: type 'organization list')"
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
          style={{
            flex: '1',
            minWidth: '300px',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            backgroundColor: '#f9fafb'
          }}
        />

        {/* NEW: Donor Type filter */}
        <select
          className="ngo-select"
          value={donorType}
          onChange={(e) => { setDonorType(e.target.value); setPage(1); }}
          title="Filter by donor type"
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          <option value="">👥 All donors</option>
          <option value="Individual">👤 Individual</option>
          <option value="Organization">🏢 Organization</option>
        </select>

        <select
          className="ngo-select"
          value={channel}
          onChange={(e) => { setChannel(e.target.value); setPage(1); }}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          <option value="">💳 All channels</option>
          {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>

        <select
          className="ngo-select"
          value={currency}
          onChange={(e) => { setCurrency(e.target.value); setPage(1); }}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="">💰 All currencies</option>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className="ngo-select"
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '100px'
          }}
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>

        <button className="ngo-btn" onClick={() => fetchList()} style={{
          padding: '10px 16px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>🔄 Refresh</button>
        <button className="ngo-btn" onClick={resetFilters} style={{
          padding: '10px 16px',
          backgroundColor: '#f59e0b',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>🔄 Reset</button>
        <button className="ngo-btn" onClick={exportPDF} disabled={items.length === 0} style={{
          padding: '10px 16px',
          backgroundColor: items.length === 0 ? '#9ca3af' : '#dc2626',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: items.length === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>📄 Export PDF</button>
      </div>

      {/* Top scrollbar */}
      <div className="ngo-hscroll" ref={topRef} onScroll={onTopScroll} style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        marginBottom: '8px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        height: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ width: scrollW, height: 1 }} />
      </div>
      
      {/* Scroll indicator */}
      <div style={{
        textAlign: 'center',
        marginBottom: '8px',
        fontSize: '12px',
        color: '#6b7280',
        fontStyle: 'italic'
      }}>
        💡 Table is scrollable horizontally and vertically
      </div>

      <div className="ngo-tablewrap" ref={wrapRef} onScroll={onWrapScroll} style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        overflow: 'auto',
        maxHeight: '70vh',
        minHeight: '400px',
        position: 'relative'
      }}>
        <table className="ngo-table" ref={tableRef} style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          minWidth: '1200px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '150px' }}>👤 Donor</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '200px' }}>📧 Email</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '120px' }}>📱 Phone</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '100px' }}>💰 Amount</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '100px' }}>💳 Channel</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '120px' }}>🔗 Ref / Txn</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '150px' }}>📅 Date</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '80px' }}>📄 Slip</th>
              <th className="ngo-tight" style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '100px' }}>✅ Status</th>
              <th className="ngo-tight" style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '100px' }}>👁️ Visibility</th>
              <th className="ngo-tight" style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '200px' }}>⚙️ Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="muted" style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>⏳ Loading…</td></tr>
            ) : err ? (
              <tr><td colSpan="11" className="ngo-error" style={{ padding: '40px', textAlign: 'center', color: '#dc2626', fontSize: '16px' }}>❌ {err}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="11" className="ngo-empty" style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>📭 No donations found.</td></tr>
            ) : (
              items.map((d) => {
                const wa = normWA(d.whatsapp || d.donorPhone);
                const waHref = wa ? `https://wa.me/${wa}?text=${waMsg(d)}` : null;
                const type = (d.donorType || "Individual").toLowerCase();

                return (
                  <tr key={d._id || d.id} style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '12px' }}>
                      <div className="strong" style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {d.isAnonymous ? "👤 Anonymous" : d.donorName || "-"}
                        <span className={`ngo-type ngo-type--${type}`} style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '500',
                          backgroundColor: type === 'organization' ? '#dbeafe' : '#f3e8ff',
                          color: type === 'organization' ? '#1e40af' : '#7c3aed'
                        }}>{d.donorType || "Individual"}</span>
                      </div>
                      <div className="muted" style={{ color: '#6b7280', fontSize: '12px' }}>Donor</div>
                    </td>

                    <td className="muted" style={{ padding: '12px', color: '#6b7280' }}>{d.donorEmail || "-"}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ color: '#1f2937' }}>{d.donorPhone || "-"}</div>
                      {d.whatsapp ? <div className="muted" style={{ color: '#6b7280', fontSize: '12px' }}>📱 WA: {d.whatsapp}</div> : null}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#059669', fontSize: '15px' }}>{fmtMoney(d.amount, d.currency)}</div>
                      {Number(d.fees) > 0 && <div className="muted" style={{ color: '#6b7280', fontSize: '12px' }}>fees: {fmtMoney(d.fees, d.currency)}</div>}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ color: '#1f2937' }}>{d.channel || "-"}</div>
                      {d.gateway && <div className="muted" style={{ color: '#6b7280', fontSize: '12px' }}>{d.gateway}</div>}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ color: '#1f2937' }}>{d.referenceNo || "-"}</div>
                      <div className="muted" style={{ color: '#6b7280', fontSize: '12px' }}>{d.transactionRef || "-"}</div>
                    </td>

                    <td className="ngo-date" style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{fmtDateOneLine(d.createdAt)}</td>

                    <td className="ngo-tight" style={{ padding: '12px' }}>
                      {d.evidence?.path ? (
                        <a className="ngo-btn" href={`${API_BASE}${d.evidence.path}`} target="_blank" rel="noreferrer" style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'inline-block'
                        }}>
                          📄 View
                        </a>
                      ) : "—"}
                    </td>

                    <td className="ngo-tight" style={{ padding: '12px' }}>
                      <span className={`ngo-badge ngo-badge--${badgeKind(d.status)}`} style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: badgeKind(d.status) === 'ok' ? '#dcfce7' : 
                                        badgeKind(d.status) === 'warn' ? '#fef3c7' : 
                                        badgeKind(d.status) === 'err' ? '#fee2e2' : '#f3f4f6',
                        color: badgeKind(d.status) === 'ok' ? '#166534' : 
                               badgeKind(d.status) === 'warn' ? '#92400e' : 
                               badgeKind(d.status) === 'err' ? '#991b1b' : '#374151'
                      }}>{d.status || "—"}</span>
                    </td>

                    <td className="ngo-tight" style={{ padding: '12px' }}>
                      {d.isAnonymous ? (
                        <span className="ngo-badge ngo-badge--neutral" style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }}>👤 Anonymous</span>
                      ) : d.allowNamePublic ? (
                        <span className="ngo-badge ngo-badge--public" style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#dcfce7',
                          color: '#166534'
                        }}>🌐 Public</span>
                      ) : (
                        <span className="ngo-badge ngo-badge--hidden" style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>🔒 Hidden</span>
                      )}
                    </td>

                    <td className="ngo-tight" style={{ padding: '12px', minWidth: '200px' }}>
                      <div className="ngo-rowacts" style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        flexWrap: 'nowrap',
                        justifyContent: 'flex-start',
                        alignItems: 'center'
                      }}>
                        {waHref ? (
                          <a className="ngo-btn ngo-btn-wa" href={waHref} target="_blank" rel="noreferrer" title="Send WhatsApp thank-you" style={{
                            padding: '4px 8px',
                            backgroundColor: '#25d366',
                            color: '#ffffff',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            minWidth: '80px',
                            textAlign: 'center'
                          }}>
                            📱 WhatsApp
                          </a>
                        ) : (
                          <button className="ngo-btn" title="No number available" disabled style={{
                            padding: '4px 8px',
                            backgroundColor: '#9ca3af',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500',
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap',
                            minWidth: '80px'
                          }}>
                            📱 WhatsApp
                          </button>
                        )}
                        <button className="ngoo-btn" onClick={() => navigate(`/dashboard/donations/${d._id || d.id}/edit`)} style={{
                          padding: '4px 8px',
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          minWidth: '50px'
                        }}>
                          ✏️ Edit
                        </button>
                        <button className="ngo-btn ngo-btn-danger" onClick={() => onDelete(d._id || d.id)} style={{
                          padding: '4px 8px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          minWidth: '50px'
                        }}>
                          🗑️ Del
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

      <div className="ngo-pager" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
      }}>
        <button className="ngo-pagebtn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{
          padding: '8px 16px',
          backgroundColor: page <= 1 ? '#f3f4f6' : '#ffffff',
          color: page <= 1 ? '#9ca3af' : '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}>
          ← Prev
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`ngo-pagebtn ${page === n ? "ngo-pagebtn--active" : ""}`} onClick={() => setPage(n)} style={{
            padding: '8px 16px',
            backgroundColor: page === n ? '#3b82f6' : '#ffffff',
            color: page === n ? '#ffffff' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: page === n ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : 'none'
          }}>
            {n}
          </button>
        ))}
        {pages > 5 && <span className="muted" style={{ padding: "0 6px", color: '#6b7280' }}>… {pages}</span>}
        <button className="ngo-pagebtn" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} style={{
          padding: '8px 16px',
          backgroundColor: page >= pages ? '#f3f4f6' : '#ffffff',
          color: page >= pages ? '#9ca3af' : '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: page >= pages ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}>
          Next →
        </button>
      </div>
    </div>
  );
}
