import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";

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

  // Generate PDF report for all filled requests
  const generateAllRequestsReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const leftCol = margin;
    const rightCol = margin + 50;
    let yPosition = 25;

    // Header background box
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Main Title
    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Filled Requests Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Report Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(240, 240, 240);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Total count
    doc.setFontSize(10);
    doc.text(`Total Filled Requests: ${filledRequests.length}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 25;

    // Loop through all requests
    filledRequests.forEach((request, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 25;
      }

      // Request number badge
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(leftCol, yPosition - 5, 30, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`#${index + 1}`, leftCol + 15, yPosition + 2, { align: 'center' });
      yPosition += 12;

      // Request header with background
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(leftCol, yPosition - 6, pageWidth - 2 * margin, 14, 3, 3, 'F');
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Request #${request._id.substring(0, 6)}`, leftCol + 5, yPosition + 2);
      
      // Priority badge on the right
      const priorityText = request.priority || "Medium";
      const priorityColor = priorityText === "High" ? [239, 68, 68] : priorityText === "Medium" ? [251, 146, 60] : [34, 197, 94];
      doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.roundedRect(pageWidth - margin - 35, yPosition - 5, 35, 10, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(priorityText, pageWidth - margin - 17.5, yPosition + 1, { align: 'center' });
      yPosition += 10;

      // Date
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date(request.fulfilledAt || request.updatedAt).toLocaleString()}`, leftCol + 5, yPosition);
      yPosition += 10;

      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(leftCol, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Reset text color for content
      doc.setTextColor(0, 0, 0);

      // Information box background
      doc.setFillColor(250, 251, 252);
      doc.roundedRect(leftCol, yPosition - 3, pageWidth - 2 * margin, 38, 2, 2, 'F');
      yPosition += 3;

      // Organization
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Organization:', leftCol + 3, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(request.org || 'Not specified', rightCol, yPosition);
      yPosition += 7;

      // Resources
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Resources:', leftCol + 3, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(request.resources || 'Not specified', rightCol, yPosition);
      yPosition += 7;

      // Contact
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Contact:', leftCol + 3, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(request.contact || 'Not provided', rightCol, yPosition);
      yPosition += 15;

      // Victim Details section
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Victim Details:', leftCol, yPosition);
      yPosition += 6;
      doc.setFillColor(255, 251, 235);
      const victimText = request.victim || 'No details provided';
      const victimLines = doc.splitTextToSize(victimText, pageWidth - 2 * margin - 6);
      const victimHeight = victimLines.length * 5 + 6;
      doc.roundedRect(leftCol, yPosition - 3, pageWidth - 2 * margin, victimHeight, 2, 2, 'F');
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(victimLines, leftCol + 3, yPosition);
      yPosition += victimHeight + 5;

      // Check for page break before special instructions
      if (yPosition > pageHeight - 50 && request.special) {
        doc.addPage();
        yPosition = 25;
      }

      // Special Instructions
      if (request.special) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Special Instructions:', leftCol, yPosition);
        yPosition += 6;
        doc.setFillColor(254, 242, 242);
        const specialLines = doc.splitTextToSize(request.special, pageWidth - 2 * margin - 6);
        const specialHeight = specialLines.length * 5 + 6;
        doc.roundedRect(leftCol, yPosition - 3, pageWidth - 2 * margin, specialHeight, 2, 2, 'F');
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text(specialLines, leftCol + 3, yPosition);
        yPosition += specialHeight + 8;
      }

      // Add spacing between requests
      yPosition += 5;

      // Draw separator line between requests (except for last one)
      if (index < filledRequests.length - 1) {
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(1);
        doc.line(leftCol, yPosition, pageWidth - margin, yPosition);
        yPosition += 18;
      }
    });

    // Footer on last page
    const finalY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Generated from SafeZone Disaster Management System', pageWidth / 2, finalY, { align: 'center' });

    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`Filled_Requests_Report_${timestamp}.pdf`);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Filled Requests</h2>
        <button 
          onClick={generateAllRequestsReport}
          className="ra-btn ra-btn--primary"
          style={styles.generateReportButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
          }}
        >
          Generate Report
        </button>
      </div>
      
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
  },
  generateReportButton: {
    background: "#3b82f6",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
    transform: "translateZ(0)",
    fontSize: "14px",
    fontWeight: "600"
  }
};