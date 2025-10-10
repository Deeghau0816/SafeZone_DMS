// Import React hooks and dependencies
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./DS_Read.css";

// API endpoints configuration
const API = {
  list: "http://localhost:5000/damage",
  del: (id) => `http://localhost:5000/damage/${id}`,
};

// localStorage key for tracking reviewed claims
const REVIEWED_KEY = "damage_reviewed_ids_v1";

// Utility function to format dates
const fmt = (d) =>
  d ? new Date(d).toLocaleString(undefined, { hour12: true }) : "—";

// Component to display map preview using Google Maps
function MapPreview({ location }) {
  if (!location) return <div className="map-placeholder">—</div>;
  
  // Parse latitude and longitude from location string
  const parts = String(location).split(",");
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  // Render embedded Google Maps if coordinates are valid
  if (!isNaN(lat) && !isNaN(lng)) {
    return (
      <iframe
        title={`map-${lat}-${lng}`}
        src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
        width="200"
        height="140"
        style={{ borderRadius: 8, border: "none" }}
        loading="lazy"
      />
    );
  }
  
  // Fallback to showing location text if coordinates are invalid
  return <div className="map-placeholder">{location}</div>;
}

// Component to display various types of file attachments
function AttachmentGallery({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return <div className="no-attachments">No attachments</div>;
  }

  return (
    <>
      <div className="attachment-gallery">
        {attachments.map((attachment, index) => {
          // Build attachment URL from either direct URL or filename
          const attachmentUrl = attachment.url || 
            (attachment.filename ? `/uploads/damage/${encodeURIComponent(attachment.filename)}` : null);
          
          if (!attachmentUrl) return null;

          // Determine file type based on extension
          const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(attachment.filename || attachment.url || '');
          const isVideo = /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(attachment.filename || attachment.url || '');
          const isDocx = /\.docx$/i.test(attachment.filename || attachment.url || '');
          const isPdf = /\.pdf$/i.test(attachment.filename || attachment.url || '');
          const isOtherDoc = /\.(doc|txt)$/i.test(attachment.filename || attachment.url || '');

          return (
            <div key={index} className="attachment-item">
              {/* Render different attachment types based on file extension */}
              {isImage ? (
                // Image attachments - display as clickable thumbnails
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <img
                    src={attachmentUrl}
                    alt={`Attachment ${index + 1}`}
                    className="attachment-thumb"
                  />
                </a>
              ) : isVideo ? (
                // Video attachments - display with video player controls
                <div className="video-container">
                  <video
                    className="video-player"
                    controls
                    preload="metadata"
                    poster={attachmentUrl} // Use video URL as poster for now
                  >
                    <source src={attachmentUrl} type="video/mp4" />
                    <source src={attachmentUrl} type="video/webm" />
                    <source src={attachmentUrl} type="video/ogg" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="video-info">
                    <span className="video-filename">{attachment.filename || `Video ${index + 1}`}</span>
                  </div>
                </div>
              ) : isDocx ? (
                // DOCX files - display with document icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb docx-thumb">
                    <div className="docx-icon">📄</div>
                    <span className="file-name">{attachment.filename || `Document ${index + 1}`}</span>
                  </div>
                </a>
              ) : isPdf ? (
                // PDF files - display with PDF icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb pdf-thumb">
                    <div className="pdf-icon">📕</div>
                    <span className="file-name">{attachment.filename || `PDF ${index + 1}`}</span>
                  </div>
                </a>
              ) : isOtherDoc ? (
                // Other document types (DOC, TXT) - display with document icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb doc-thumb">
                    <div className="doc-icon">📄</div>
                    <span className="file-name">{attachment.filename || `Document ${index + 1}`}</span>
                  </div>
                </a>
              ) : (
                // Generic file types - display with file icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb file-thumb">
                    <div className="file-icon">📎</div>
                    <span className="file-name">{attachment.filename || `File ${index + 1}`}</span>
                  </div>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Utility functions for managing reviewed claim IDs in localStorage

// Read reviewed claim IDs from localStorage
function readReviewedIds() {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.warn("readReviewedIds error", e);
    return new Set();
  }
}

// Write reviewed claim IDs to localStorage
function writeReviewedIds(setOrArray) {
  try {
    const arr = Array.isArray(setOrArray) ? setOrArray : Array.from(setOrArray);
    localStorage.setItem(REVIEWED_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("writeReviewedIds error", e);
  }
}

// Main component for displaying and managing disaster claims
export default function ReadClaim() {
  const navigate = useNavigate();
  
  // State management
  const [rows, setRows] = useState([]); // Array of claim records
  const [q, setQ] = useState(""); // Search query
  const [loading, setLoading] = useState(true); // Loading state
  const [deleting, setDeleting] = useState(null); // ID of claim being deleted
  const [taking, setTaking] = useState(null); // ID of claim action being taken
  const [reviewedIds, setReviewedIds] = useState(() => readReviewedIds()); // Set of reviewed claim IDs
  
  // Take Action Form Modal State
  const [showActionForm, setShowActionForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionForm, setActionForm] = useState({
    actionType: '',
    subject: '',
    message: '',
    priority: 'medium',
    notes: ''
  });

  // Function to load claims data from the API
  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API.list);
      
      // Handle different response data structures
      const data =
        Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.damages)
          ? res.data.damages
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      // Merge server's reviewed flag with localStorage-reviewed IDs
      const merged = data.map((d) => ({
        ...d,
        reviewed: !!d.reviewed || reviewedIds.has(String(d._id)),
      }));
      setRows(merged);
    } catch (e) {
      console.error(e);
      alert("Failed to load claims");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    // Load reviewed IDs from localStorage once
    setReviewedIds(readReviewedIds());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep rows in sync if reviewedIds changes (e.g. from other tab)
  useEffect(() => {
    setRows((rs) => rs.map(r => ({ ...r, reviewed: !!r.reviewed || reviewedIds.has(String(r._id)) })));
  }, [reviewedIds]);

  // Filter claims based on search query
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    
    // Search across multiple fields
    return rows.filter((r) =>
      [
        r.name,
        r.nic,
        r.phone,
        r.email,
        r.address,
        r.postalCode,
        r.damageType,
        r.description,
        r.currentLocation,
        r.status,
        r.estimatedLoss ? `LKR ${Number(r.estimatedLoss).toLocaleString()}` : null,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  // Function to delete a claim
  const onDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this claim?")) return;
    
    try {
      setDeleting(id);
      await axios.delete(API.del(id));
      setRows((rs) => rs.filter((r) => r._id !== id));

      // Remove from localStorage-reviewed set if present
      const s = readReviewedIds();
      if (s.has(String(id))) {
        s.delete(String(id));
        writeReviewedIds(s);
        setReviewedIds(new Set(s));
      }
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  // Function to mark action as taken on a claim
  // Open the Take Action form modal
  const onActionTaken = (id) => {
    if (!id) return;
    
    const claim = rows.find(r => r._id === id);
    if (!claim) return;
    
    setSelectedClaim(claim);
    setActionForm({
      actionType: '',
      subject: `Action Required: Damage Claim - ${claim.name}`,
      message: `Dear ${claim.name},\n\nWe have reviewed your damage claim submitted on ${new Date(claim.reportedAt || claim.createdAt).toLocaleDateString()}.\n\nClaim Details:\n- Damage Type: ${claim.damageType}\n- Estimated Loss: ${claim.estimatedLoss}\n- Location: ${claim.currentLocation}\n\nAction taken: [Please specify the action taken]\n\nNext steps: [Please specify next steps]\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nDisaster Management Team`,
      priority: 'medium',
      notes: ''
    });
    setShowActionForm(true);
  };

  // Handle form submission
  const handleActionSubmit = (e) => {
    e.preventDefault();
    
    if (!actionForm.actionType || !actionForm.subject.trim() || !actionForm.message.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Create email URL for manual sending
    const emailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedClaim.email)}&su=${encodeURIComponent(actionForm.subject)}&body=${encodeURIComponent(actionForm.message)}`;
    
    // Open Gmail in new tab
    window.open(emailUrl, '_blank');
    
    // Mark action as taken
    setTaking(selectedClaim._id);
    
    // Update rows in UI
    setRows((rs) => rs.map((r) => (r._id === selectedClaim._id ? { ...r, reviewed: true } : r)));
    
    // Persist to localStorage
    const s = readReviewedIds();
    s.add(String(selectedClaim._id));
    writeReviewedIds(s);
    setReviewedIds(new Set(s));
    
    // Clear states
    setTaking(null);
    setShowActionForm(false);
    setSelectedClaim(null);
    setActionForm({
      actionType: '',
      subject: '',
      message: '',
      priority: 'medium',
      notes: ''
    });
    
    alert('Action form completed! Gmail opened with the email ready to send.');
  };

  // Close action form modal
  const closeActionForm = () => {
    setShowActionForm(false);
    setSelectedClaim(null);
    setActionForm({
      actionType: '',
      subject: '',
      message: '',
      priority: 'medium',
      notes: ''
    });
  };

  return (
    <main className="claim-page">
      {/* Page header with title and controls */}
      <header className="claim-header">
        <h1>Submitted Reports</h1>
        <div className="header-right">
          <button
            className="btn btn--back"
            onClick={() => navigate("/victim/reports")}
          >
            Back
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="search-inp"
          />
          <div className="count-pill">{rows.length} total</div>
          <button
            className="btn btn--ghost"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* Main data table */}
      <div className="table-wrapper">
        <table className="claim-table">
          <thead>
            <tr>
              <th>Personal Details</th>
              <th>Contact Information</th>
              <th>Damage Details</th>
              <th>Location & Timing</th>
              <th>Map Preview</th>
              <th>All Attachments</th>
              <th>Status & Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Render each claim as a table row */}
            {filtered.map((r) => (
              <tr key={r._id} className={r.reviewed ? "row-reviewed" : ""}>
                {/* Personal Details Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{r.name || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">NIC:</span>
                      <span className="detail-value">{r.nic || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{r.address || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Postal Code:</span>
                      <span className="detail-value">{r.postalCode || "—"}</span>
                    </div>
                  </div>
                </td>

                {/* Contact Information Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{r.email || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{r.phone || "—"}</span>
                    </div>
                  </div>
                </td>

                {/* Damage Details Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Damage Type:</span>
                      <span className="detail-value">{r.damageType || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Estimated Loss:</span>
                      <span className="detail-value loss-amount">
                        {r.estimatedLoss !== undefined && r.estimatedLoss !== null 
                          ? `LKR ${Number(r.estimatedLoss).toLocaleString()}` 
                          : "—"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Description:</span>
                      <span className="detail-value description-text">{r.description || "—"}</span>
                    </div>
                  </div>
                </td>

                {/* Location & Timing Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value location-text">{r.currentLocation || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Occurred At:</span>
                      <span className="detail-value">{fmt(r.occurredAt)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Reported At:</span>
                      <span className="detail-value">{fmt(r.reportedAt || r.createdAt)}</span>
                    </div>
                  </div>
                </td>

                {/* Map Preview Column */}
                <td className="map-column">
                  <MapPreview location={r.currentLocation} />
                </td>

                {/* All Attachments Column */}
                <td className="attachments-column">
                  <AttachmentGallery attachments={r.attachments} />
                </td>

                {/* Status & Actions Column */}
                <td className="actions-column">
                  <div className="action-group">
                    <div className="status-indicator">
                      <span className={`status-dot ${r.reviewed ? 'reviewed' : 'pending'}`}></span>
                      <span className="status-text">
                        {r.reviewed ? "Action Taken" : "Pending Review"}
                      </span>
                    </div>
                    <div className="action-buttons">
                      {/* Show Take Action button only for unreviewed claims */}
                      {!r.reviewed && (
                        <button
                          className="btn btn--action"
                          onClick={() => onActionTaken(r._id)}
                          disabled={taking === r._id}
                        >
                          {taking === r._id ? "Processing…" : "Take Action"}
                        </button>
                      )}
                      {/* Delete button for all claims */}
                      <button
                        className="btn btn--danger"
                        onClick={() => onDelete(r._id)}
                        disabled={deleting === r._id}
                      >
                        {deleting === r._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state message when no records found */}
      {filtered.length === 0 && !loading && (
        <div className="empty">No records</div>
      )}

      {/* Take Action Form Modal */}
      {showActionForm && selectedClaim && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#333", fontSize: "1.5rem" }}>
              Take Action on Claim
            </h3>
            
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px", 
              borderRadius: "8px", 
              marginBottom: "20px",
              border: "1px solid #e9ecef"
            }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>Claim Details:</h4>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                <strong>Name:</strong> {selectedClaim.name}
              </p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                <strong>Email:</strong> {selectedClaim.email}
              </p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                <strong>Damage Type:</strong> {selectedClaim.damageType}
              </p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                <strong>Estimated Loss:</strong> {selectedClaim.estimatedLoss}
              </p>
            </div>

            <form onSubmit={handleActionSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                  Action Type: <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <select
                  value={actionForm.actionType}
                  onChange={(e) => setActionForm({ ...actionForm, actionType: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    backgroundColor: "#fff"
                  }}
                >
                  <option value="">Select action type...</option>
                  <option value="approved">Approve Claim</option>
                  <option value="rejected">Reject Claim</option>
                  <option value="investigation">Requires Investigation</option>
                  <option value="documentation">Additional Documentation Needed</option>
                  <option value="assessment">Schedule Assessment</option>
                  <option value="compensation">Process Compensation</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                  Priority Level:
                </label>
                <select
                  value={actionForm.priority}
                  onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    backgroundColor: "#fff"
                  }}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                  Email Subject: <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <input
                  type="text"
                  value={actionForm.subject}
                  onChange={(e) => setActionForm({ ...actionForm, subject: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                  Email Message: <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <textarea
                  value={actionForm.message}
                  onChange={(e) => setActionForm({ ...actionForm, message: e.target.value })}
                  required
                  rows={8}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                  Internal Notes: (Optional)
                </label>
                <textarea
                  value={actionForm.notes}
                  onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any internal notes about this action..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end"
              }}>
                <button
                  type="button"
                  onClick={closeActionForm}
                  style={{
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#f97316",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Send Email & Complete Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
