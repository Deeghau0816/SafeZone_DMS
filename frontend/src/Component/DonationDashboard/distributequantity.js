import React, { useState } from "react";
import "./distributequantity.css";  // External CSS

export default function DistributeQuantity({ onClose }) {
  // Initial state for form fields
  const [familiesAssisted, setFamiliesAssisted] = useState(0);
  const [resourcesDistributed, setResourcesDistributed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [date] = useState(new Date().toISOString().slice(0, 10)); // auto-fill current date (YYYY-MM-DD)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validation: resources <= families
    if (parseInt(resourcesDistributed) > parseInt(familiesAssisted)) {
      setMessage("Error: Resources distributed cannot exceed families assisted.");
      setLoading(false);
      return;
    }

    const requestBody = {
      familiesAssisted: parseInt(familiesAssisted),
      resourcesDistributed: parseInt(resourcesDistributed),
      date, // optional: send to backend
    };

    try {
      const response = await fetch("http://localhost:5000/api/distributionrecords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("Distribution record created successfully!");
        setFamiliesAssisted(0);
        setResourcesDistributed(0);
      } else {
        setMessage(`Error: ${data.message || "Failed to create record"}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error("Error creating record:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1>Track Distribution Quantities</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-item">
          <label>Enter Families Assisted</label>
          <input
            type="number"
            value={familiesAssisted}
            onChange={(e) => setFamiliesAssisted(e.target.value)}
            placeholder="Enter number of families assisted"
            min="0"
            required
          />
        </div>

        <div className="form-item">
          <label>Enter Resources Distributed</label>
          <input
            type="number"
            value={resourcesDistributed}
            onChange={(e) => setResourcesDistributed(e.target.value)}
            placeholder="Enter number of resources distributed"
            min="0"
            required
          />
        </div>

        <div className="form-item">
          <label>Date</label>
          <input type="date" value={date} readOnly />
        </div>

        <div className="form-item">
          <button 
            type="submit" 
            className="submit-button" 
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>

        {message && (
          <div
            className={`message ${message.includes("Error") ? "error" : "success"}`}
            style={{ marginTop: "20px" }}
          >
            {message}
          </div>
        )}
      </form>

      {/* Close Button */}
      <button className="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
