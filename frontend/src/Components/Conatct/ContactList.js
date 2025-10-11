import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

const ContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState("");

  // Internal CSS styles
  const styles = {
    contactListContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      maxWidth: '900px',
      width: '100%',
      margin: '40px auto',
      padding: '30px',
      borderRadius: '20px',
      backgroundColor: '#ffffff',
      color: '#333',
      border: '1px solid #e0e0e0',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      boxSizing: 'border-box'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#00bfff',
      marginBottom: '20px',
      textAlign: 'center',
      position: 'relative'
    },
    titleAfter: {
      content: '""',
      display: 'block',
      width: '70px',
      height: '3px',
      background: '#00bfff',
      margin: '8px auto 0',
      borderRadius: '5px'
    },
    backBtn: {
      alignSelf: 'flex-start',
      background: 'transparent',
      border: 'none',
      color: '#00bfff',
      fontSize: '16px',
      cursor: 'pointer',
      marginBottom: '20px',
      transition: 'color 0.3s ease'
    },
    downloadAllBtn: {
      backgroundColor: '#00bfff',
      color: '#fff',
      padding: '12px 18px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginBottom: '25px',
      transition: 'background 0.3s ease'
    },
    contactList: {
      listStyle: 'none',
      width: '100%',
      padding: '0',
      margin: '0',
      display: 'grid',
      gap: '20px'
    },
    contactItem: {
      background: '#ffffff',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid rgba(200, 200, 200, 0.5)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '20px',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    },
    contactDetails: {
      flex: '1',
      minWidth: '0',
      maxWidth: 'calc(100% - 140px)',
      overflowWrap: 'break-word'
    },
    contactText: {
      margin: '6px 0',
      fontSize: '15px'
    },
    contactSmall: {
      display: 'block',
      marginTop: '8px',
      fontSize: '13px',
      color: 'rgba(0, 0, 0, 0.6)'
    },
    actions: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      flexShrink: '0',
      minWidth: '120px',
      maxWidth: '120px',
      width: '120px'
    },
    btnBase: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
      textDecoration: 'none',
      textAlign: 'center',
      display: 'block',
      margin: '0'
    },
    downloadBtn: {
      backgroundColor: 'transparent',
      border: '1px solid #00bfff',
      color: '#00bfff'
    },
    whatsappBtn: {
      backgroundColor: '#25D366',
      color: '#fff'
    },
    gmailBtn: {
      backgroundColor: '#ea4335',
      color: '#fff'
    },
    callBtn: {
      backgroundColor: '#28a745',
      color: '#fff'
    },
    deleteBtn: {
      backgroundColor: '#dc3545',
      color: '#fff'
    },
    printBtn: {
      backgroundColor: '#6c757d',
      color: '#fff'
    },
    modalOverlay: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '1000'
    },
    modalContent: {
      backgroundColor: '#fff',
      padding: '30px',
      borderRadius: '15px',
      width: '90%',
      maxWidth: '500px',
      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#333',
      marginBottom: '20px',
      textAlign: 'center'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '8px'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      resize: 'vertical',
      minHeight: '100px',
      boxSizing: 'border-box'
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    },
    modalBtnPrimary: {
      backgroundColor: '#25D366',
      color: '#fff',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.3s ease'
    },
    modalBtnSecondary: {
      backgroundColor: '#6c757d',
      color: '#fff',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.3s ease'
    }
  };
  

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/contact");
        const data = await res.json();
        setContacts(data.data || []);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchContacts();
  }, []);

  
  const normalizePhone = (phone) => {
    if (!phone) return "";

    // Remove non-digits
    let digits = phone.replace(/\D/g, "");

    // Example: If starts with 0, prepend country code (Sri Lanka = 94)
    if (digits.startsWith("0")) {
      digits = "94" + digits.substring(1);
    }

    return digits;
  };

  // Handle WhatsApp message form
  const handleWhatsAppClick = (contact) => {
    setSelectedContact(contact);
    setMessage(`Hello ${contact.name}, I'm contacting you regarding your inquiry about: ${contact.problem}`);
    setShowMessageForm(true);
  };

  // Send WhatsApp message
  const sendWhatsAppMessage = () => {
    if (selectedContact && message.trim()) {
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = normalizePhone(selectedContact.phone);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      setShowMessageForm(false);
      setMessage("");
      setSelectedContact(null);
    }
  };

  // Close message form
  const closeMessageForm = () => {
    setShowMessageForm(false);
    setMessage("");
    setSelectedContact(null);
  };

  // Download all contacts as PDF
  const downloadAllPDF = () => {
    const doc = new jsPDF();
    doc.text("Contact Submissions Report", 14, 10);

    const tableColumn = ["Name", "Email", "Phone", "Problem", "Submitted At"];
    const tableRows = contacts.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.problem,
      new Date(c.createdAt).toLocaleString(),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save("contact-submissions.pdf");
  };

  // Download single contact as PDF
  const downloadSinglePDF = (contact) => {
    const doc = new jsPDF();
    doc.text("Contact Submission", 14, 10);

    autoTable(doc, {
      startY: 20,
      head: [["Field", "Value"]],
      body: [
        ["Name", contact.name],
        ["Email", contact.email],
        ["Phone", contact.phone],
        ["Problem", contact.problem],
        ["Submitted At", new Date(contact.createdAt).toLocaleString()],
      ],
    });

    doc.save(`${contact.name}-submission.pdf`);
  };

  // Delete a contact
  const deleteContact = async (contactId) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/contact/${contactId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          // Remove the contact from the local state
          setContacts(contacts.filter(contact => contact._id !== contactId));
          alert("Contact deleted successfully!");
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error deleting contact:", error);
        alert("Error deleting contact. Please try again.");
      }
    }
  };

  // Print a contact
  const printContact = (contact) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contact Submission - ${contact.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #00bfff;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .contact-info {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .field {
              margin-bottom: 10px;
            }
            .label {
              font-weight: bold;
              color: #00bfff;
            }
            .value {
              margin-left: 10px;
            }
            .problem-section {
              background-color: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
            }
            .timestamp {
              text-align: right;
              color: #666;
              font-size: 12px;
              margin-top: 20px;
            }
            .signature-section {
              position: absolute;
              bottom: 20px;
              right: 20px;
              text-align: center;
              border-top: 1px solid #333;
              padding-top: 10px;
              width: 200px;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              width: 150px;
              margin: 0 auto 5px;
              height: 40px;
            }
            .signature-label {
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Contact Submission Report</h1>
          </div>
          
          <div class="contact-info">
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${contact.name}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span class="value">${contact.email}</span>
            </div>
            <div class="field">
              <span class="label">Phone:</span>
              <span class="value">${contact.phone}</span>
            </div>
          </div>
          
          <div class="problem-section">
            <div class="field">
              <span class="label">Problem Description:</span>
            </div>
            <div class="value">${contact.problem}</div>
          </div>
          
          <div class="timestamp">
            Submitted: ${new Date(contact.createdAt).toLocaleString()}
          </div>
          
          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="signature-label">Authorized Signature</div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div style={styles.contactListContainer}>
      

      {/*<h2>Submitted Contact Forms</h2>*/}

      {contacts.length > 0 && (
        <button 
          onClick={downloadAllPDF} 
          style={{...styles.downloadAllBtn, ':hover': {backgroundColor: '#00bfff96'}}}
        >
          Download All as PDF
        </button>
      )}

      {contacts.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <ul style={styles.contactList}>
          {contacts.map((c) => (
            <li 
              key={c._id} 
              style={{
                ...styles.contactItem,
                ':hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 6px 15px rgba(0, 191, 255, 0.2)'
                }
              }}
            >
              <div style={styles.contactDetails}>
                <p style={styles.contactText}><b>Name:</b> {c.name}</p>
                <p style={styles.contactText}><b>Email:</b> {c.email}</p>
                <p style={styles.contactText}><b>Phone:</b> {c.phone}</p>
                <p style={styles.contactText}><b>Problem:</b> {c.problem}</p>
                <small style={styles.contactSmall}>Submitted: {new Date(c.createdAt).toLocaleString()}</small>
              </div>

              <div style={styles.actions}>
                <button
                  onClick={() => downloadSinglePDF(c)}
                  style={{...styles.btnBase, ...styles.downloadBtn}}
                >
                  Download PDF
                </button>

                {/* Print button */}
                <button
                  onClick={() => printContact(c)}
                  style={{...styles.btnBase, ...styles.printBtn}}
                  title="Print this contact"
                >
                  Print
                </button>

                {/* WhatsApp button */}
                {c.phone && (
                  <button
                    onClick={() => handleWhatsAppClick(c)}
                    style={{...styles.btnBase, ...styles.whatsappBtn}}
                    title="Send WhatsApp message"
                  >
                    WhatsApp
                  </button>
                )}

                
                {/*Gmail button*/}
                {c.email && (
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                      c.email
                    )}&su=${encodeURIComponent(
                      "Regarding your contact submission"
                    )}&body=${encodeURIComponent(
                      `Hi ${c.name},\n\nI am reaching out regarding your issue: "${c.problem}".\n\n`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{...styles.btnBase, ...styles.gmailBtn}}
                    title="Send Email via Gmail"
                  >
                    Gmail
                  </a>
                )}

                {/* Call button */}
                {c.phone && (
                  <a
                    href={`tel:${normalizePhone(c.phone)}`}
                    style={{...styles.btnBase, ...styles.callBtn}}
                    title="Call this number"
                  >
                    Call
                  </a>
                )}

                

                {/* Delete button */}
                <button
                  onClick={() => deleteContact(c._id)}
                  style={{...styles.btnBase, ...styles.deleteBtn}}
                  title="Delete this contact"
                >
                  Slove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* WhatsApp Message Form Modal */}
      {showMessageForm && selectedContact && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              Send WhatsApp Message
            </h3>
            
            <div style={{ marginBottom: "15px" }}>
              <strong>To:</strong> {selectedContact.name} ({selectedContact.phone})
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Message:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                style={styles.textarea}
              />
            </div>
            
            <div style={styles.modalButtons}>
              <button
                onClick={closeMessageForm}
                style={styles.modalBtnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={sendWhatsAppMessage}
                disabled={!message.trim()}
                style={{
                  ...styles.modalBtnPrimary,
                  background: message.trim() ? "#25D366" : "#ccc",
                  cursor: message.trim() ? "pointer" : "not-allowed"
                }}
              >
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactList;
