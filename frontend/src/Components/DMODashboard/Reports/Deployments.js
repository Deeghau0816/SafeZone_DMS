import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Deployments() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    fetch("http://localhost:5000/deployments")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setItems(data.deployments || []))
      .catch(() => setItems([]));
  }, []);

  const saveAll = (list) => setItems(list);

  const startEdit = (it) => {
    setEditingId(it.id);
    setDraft({ ...it });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const updateDraft = (e) => {
    const { name, value } = e.target;
    setDraft((d) => ({ ...d, [name]: name === "contact" ? String(value).replace(/\D/g, "").slice(0,10) : value }));
  };

  const doUpdate = (id) => {
    const errs = {};
    if (!draft.teamName?.trim()) errs.teamName = "Team name required";
    if (!/^\d{10}$/.test(String(draft.contact || ""))) errs.contact = "Contact must be 10 digits";
    if (!draft.notes || draft.notes.trim().length < 5) errs.notes = "Notes min length 5";
    if (!draft.specialInstructions || draft.specialInstructions.trim().length < 5) errs.specialInstructions = "Special instructions min length 5";
    if (Object.keys(errs).length) {
      alert(Object.values(errs).join("\n"));
      return;
    }

    fetch(`http://localhost:5000/deployments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        const next = items.map((it) => (it._id === id ? data.deployment : it));
        saveAll(next);
        cancelEdit();
      })
      .catch(() => alert("Update failed"));
  };

  const doDelete = (id) => {
    if (!window.confirm("Delete this deployment?")) return;
    fetch(`http://localhost:5000/deployments/${id}`, { method: "DELETE" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(() => saveAll(items.filter((it) => it._id !== id)))
      .catch(() => alert("Delete failed"));
  };

  const empty = items.length === 0;

  return (
    <main style={{ padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Deployment Orders</h2>
      </header>

      {empty ? (
        <div>No deployments yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((it) => (
            <section key={it._id} style={{ 
              background: "#fff", 
              border: "2px solid #d1d5db", 
              borderRadius: 12, 
              padding: 16,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              transform: "translateZ(0)",
              transition: "all 0.3s ease",
              position: "relative"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
              e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) translateZ(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
            }}>
              {editingId === it.id ? (
                <form onSubmit={(e) => { e.preventDefault(); doUpdate(it._id); }} style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Team</div>
                      <select name="team" value={draft.team} onChange={updateDraft}>
                        <option>Army</option>
                        <option>Police</option>
                        <option>Fire Brigade</option>
                      </select>
                    </label>
                    <label>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Urgent</div>
                      <select name="urgent" value={draft.urgent} onChange={updateDraft}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Team Name</div>
                    <input name="teamName" value={draft.teamName || ""} onChange={updateDraft} />
                  </label>

                  <label>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>DMO Contact</div>
                    <input name="contact" value={draft.contact || ""} onChange={updateDraft} maxLength={10} />
                  </label>

                  <label>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Deployment Notes</div>
                    <textarea name="notes" value={draft.notes || ""} onChange={updateDraft} rows={3} />
                  </label>

                  <label>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Special Instructions</div>
                    <textarea name="specialInstructions" value={draft.specialInstructions || ""} onChange={updateDraft} rows={3} />
                  </label>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="ra-btn ra-btn--ghost" type="button" onClick={cancelEdit}>Cancel</button>
                    <button className="ra-btn" type="submit">Save</button>
                  </div>
                </form>
              ) : (
                <>
                  <dl style={{ display: "grid", gridTemplateColumns: "1fr 2fr", rowGap: 12, columnGap: 16, margin: 0 }}>
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Report ID</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.reportId || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Team</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.team || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Team Name</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.teamName || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Urgent Level</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.urgent || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>DMO Contact</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.contact || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Deployment Notes</dt>
                    <dd style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, color: "#1f2937", lineHeight: 1.6, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.notes || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Special Instructions</dt>
                    <dd style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, color: "#1f2937", lineHeight: 1.6, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{it.specialInstructions || "—"}</dd>
                    
                    <dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Created</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{new Date(it.createdAt).toLocaleString()}</dd>
                    
                    {it.updatedAt && (<><dt style={{ fontWeight: 600, fontSize: 14, color: "#374151", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Updated</dt><dd style={{ margin: 0, fontSize: 14, color: "#1f2937", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{new Date(it.updatedAt).toLocaleString()}</dd></>)}
                  </dl>
                  <footer style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    <button 
                      className="ra-btn" 
                      onClick={() => startEdit(it)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#90EE90";
                        e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                        e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(144, 238, 144, 0.3), 0 4px 6px -2px rgba(144, 238, 144, 0.2)";
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
                      Update
                    </button>
                    <button 
                      className="ra-btn ra-btn--danger" 
                      onClick={() => doDelete(it._id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                        e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                      }}
                      style={{ 
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        transform: "translateZ(0)"
                      }}
                    >
                      Delete
                    </button>
                  </footer>
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}


