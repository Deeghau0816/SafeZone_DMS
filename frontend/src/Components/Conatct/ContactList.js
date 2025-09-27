import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import "./ContactList.css"; 

const ContactList = () => {
  const [contacts, setContacts] = useState([]);
  

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
    <div className="contact-list-container">
      

      {/*<h2>Submitted Contact Forms</h2>*/}

      {contacts.length > 0 && (
        <button onClick={downloadAllPDF} className="download-all-btn">
          Download All as PDF
        </button>
      )}

      {contacts.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <ul className="contact-list">
          {contacts.map((c) => (
            <li key={c._id} className="contact-item">
              <p><b>Name:</b> {c.name}</p>
              <p><b>Email:</b> {c.email}</p>
              <p><b>Phone:</b> {c.phone}</p>
              <p><b>Problem:</b> {c.problem}</p>
              <small>Submitted: {new Date(c.createdAt).toLocaleString()}</small>

              <div className="actions">
                <button
                  onClick={() => downloadSinglePDF(c)}
                  className="download-btn"
                >
                  Download PDF
                </button>


                {/* Print button */}
                <button
                  onClick={() => printContact(c)}
                  className="print-btn"
                  title="Print this contact"
                >
                  Print
                </button>

                {/* WhatsApp button */}
                {c.phone && (
                  <a
                    href={`https://wa.me/${normalizePhone(c.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn"
                    title="Chat on WhatsApp"
                  >
                    WhatsApp
                  </a>
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
                    className="gmail-btn"
                    title="Send Email via Gmail"
                  >
                    Gmail
                  </a>
                )}

                {/* Call button */}
                {c.phone && (
                  <a
                    href={`tel:${normalizePhone(c.phone)}`}
                    className="call-btn"
                    title="Call this number"
                  >
                    Call
                  </a>
                )}

                

                {/* Delete button */}
                <button
                  onClick={() => deleteContact(c._id)}
                  className="delete-btn"
                  title="Delete this contact"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContactList;
