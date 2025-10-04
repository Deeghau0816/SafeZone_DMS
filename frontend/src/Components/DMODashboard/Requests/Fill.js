import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Fill() {
  const [filledRequests, setFilledRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Fetch filled requests data
  useEffect(() => {
    const fetchFilledRequests = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/requests");
        setFilledRequests(response.data.requests || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching filled requests:", err);
        setError("Failed to load filled requests. Please try again later.");
        setLoading(false);
      }
    };

    fetchFilledRequests();
  }, []);

  // Handle delete request
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this filled request?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/requests/${id}`);
      // Remove the deleted request from the state
      setFilledRequests(filledRequests.filter(request => request._id !== id));
      alert("Request deleted successfully");
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("Failed to delete request. Please try again.");
    }
  };
  
  // Generate report content from request data
  const generateReportContent = (request) => {
    return `
*FILLED REQUEST REPORT #${request._id.substring(0, 6)}*

*Date:* ${new Date(request.fulfilledAt || request.updatedAt).toLocaleString()}
*Organization:* ${request.org || "Not specified"}
*Priority:* ${request.priority || "Medium"}

*Victim Details:*
${request.victim || "No details provided"}

*Resources Provided:*
${request.resources || "Not specified"}

*Contact:* ${request.contact || "Not provided"}
${request.special ? `\n*Special Instructions:*\n${request.special}` : ""}

--- Generated from Disaster Management System ---
`;
  };

  // Share report via WhatsApp
  const shareViaWhatsApp = (request) => {
    const reportText = generateReportContent(request);
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return <div>Loading filled requests...</div>;
  }

  if (error) {
    return <div style={{ color: "#b91c1c" }}>{error}</div>;
  }

  if (filledRequests.length === 0) {
    return <div>No filled requests found.</div>;
  }

  return (
    <div className="filled-requests">
      <h2>Filled Requests</h2>
      
      <div className="request-list">
        {filledRequests.map((request) => (
          <div 
            key={request._id} 
            className="request-card" 
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
              e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) translateZ(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
            }}>
            <div style={styles.header}>
              <h3 style={styles.title}>Request #{request._id.substring(0, 6)}</h3>
              <span style={styles.date}>
                {new Date(request.fulfilledAt || request.updatedAt).toLocaleString()}
              </span>
            </div>
            
            <div style={styles.details}>
              <div style={styles.row}>
                <strong>Organization:</strong> {request.org || "Not specified"}
              </div>
              
              <div style={styles.row}>
                <strong>Victim Details:</strong>
                <pre style={styles.preText}>{request.victim || "No details provided"}</pre>
              </div>
              
              <div style={styles.row}>
                <strong>Priority:</strong> {request.priority || "Medium"}
              </div>
              
              <div style={styles.row}>
                <strong>Resources:</strong> {request.resources || "Not specified"}
              </div>
              
              <div style={styles.row}>
                <strong>Contact:</strong> {request.contact || "Not provided"}
              </div>
              
              {request.special && (
                <div style={styles.row}>
                  <strong>Special Instructions:</strong>
                  <p>{request.special}</p>
                </div>
              )}
            </div>
            
            <div style={styles.actions}>
              <button 
                onClick={() => shareViaWhatsApp(request)}
                className="ra-btn ra-btn--primary"
                style={styles.whatsappButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(37, 211, 102, 0.3), 0 4px 6px -2px rgba(37, 211, 102, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Share via WhatsApp
              </button>
              <button 
                onClick={() => handleDelete(request._id)}
                className="ra-btn ra-btn--danger"
                style={styles.deleteButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inline styles
const styles = {
  card: {
    background: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    padding: "16px",
    marginBottom: "16px",
    border: "2px solid #d1d5db",
    transition: "all 0.3s ease",
    transform: "translateZ(0)",
    position: "relative"
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e5e9f1"
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1f2937"
  },
  date: {
    fontSize: "14px",
    color: "#6b7280",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  row: {
    marginBottom: "16px",
    fontSize: "14px",
    color: "#374151",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  preText: {
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    fontSize: "14px",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #e5e9f1",
    marginTop: "4px"
  },
  actions: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px"
  },
  deleteButton: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
    transform: "translateZ(0)"
  },
  whatsappButton: {
    background: "#25D366",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
    transform: "translateZ(0)"
  }
};