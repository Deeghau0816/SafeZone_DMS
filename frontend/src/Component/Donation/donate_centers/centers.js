import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./centers.css";

export default function AddCenterForm() {
  const navigate = useNavigate();

  // API base URL
  const API_BASE = "http://localhost:5000/api";

  // Form state
  const emptyDraft = {
    name: "",
    address: "",
    city: "",
    phone: "",
    tags: [],
    hours: "",
    lat: "",
    lng: "",
  };

  const [draft, setDraft] = useState(emptyDraft);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validatePhoneNumber(phone) {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, "");

    // Regex for Sri Lankan 10-digit domestic (0xx xxxxxxx) or 11-digit international (94xx xxxxxxx)
    // Domestic: Must start with 0, followed by a non-zero digit, and 8 more digits (total 10).
    // International: Must start with 94, followed by a non-zero digit, and 8 more digits (total 11).
    const phoneRegex = /^(0[1-9]{1}[0-9]{8}|94[1-9]{1}[0-9]{8})$/;

    // The input value (0312230175) is 10 digits. We test it against the regex.
    // The cleanPhone must be exactly 10 digits for the domestic pattern (0XX XXXXXXX)
    // OR exactly 11 digits for the international pattern (94 XX XXXXXXX).

    return (
      phoneRegex.test(cleanPhone) &&
      (cleanPhone.length === 10 || cleanPhone.length === 11)
    );
  }
  async function submitForm(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");

    const lat = Number(draft.lat);
    const lng = Number(draft.lng);

    // Validation
    if (!draft.name || !draft.city || !draft.address || !draft.phone) {
      setMsg("Please complete all required fields (*)");
      setSubmitting(false);
      return;
    }
    if (/\d/.test(draft.name)) {
      setMsg("Center name should not contain numbers");
      setSubmitting(false);
      return;
    }
    if (/\d/.test(draft.city)) {
      setMsg("City name should not contain numbers");
      setSubmitting(false);
      return;
    }

    if (!validatePhoneNumber(draft.phone)) {
      setMsg("Phone number must be a valid Sri Lankan number with 10 digits");
      setSubmitting(false);
      return;
    }

    const payload = {
      name: draft.name,
      address: draft.address,
      city: draft.city,
      phone: draft.phone,
      tags: draft.tags || [],
      hours: draft.hours,
      lat,
      lng,
    };

    try {
      const response = await fetch(`${API_BASE}/collectingcenters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const savedCenter = await response.json();

      alert("Center added successfully!");

      // Reset form
      setDraft(emptyDraft);
      setMsg("");

      // Navigate back or to centers list
      navigate("/dashboard/centers");
    } catch (err) {
      console.error("Error saving center:", err);
      setMsg(err.message || "Failed to save center. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeForm() {
    // Navigate back
    navigate(-1);
  }

  return (
    <div className="cc-page wrap">
      {/* Header */}
      <div className="cc-hero">
        <div>
          <h1 className="cc-title">Add New Collection Center</h1>
          <p className="cc-sub">
            Create a new drop-off location for donations.
          </p>
        </div>
        <div className="cc-hero-actions">
          <button className="btn btn-ghost" type="button" onClick={closeForm}>
            Back
          </button>
        </div>
      </div>

      {/* Form */}
      <div
        className="cc-drawer"
        style={{
          position: "static",
          transform: "none",
          width: "100%",
          height: "auto",
          background: "transparent",
          boxShadow: "none",
          display: "flex",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <form
          className="cc-form"
          onSubmit={submitForm}
          style={{
            maxWidth: "900px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div className="cc-form-head">
            <h3>Center Details</h3>
          </div>

          {/* Display Error Message */}
          {msg && (
            <div
              className="cc-msg"
              style={{ color: "red", fontWeight: "bold" }}
            >
              {msg}
            </div>
          )}

          <div className="grid2">
            <div className="field">
              <label>Name *</label>
              <input
                className="input"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                required
                placeholder="Enter center name"
              />
            </div>

            <div className="field">
              <label>Phone * (10 digits)</label>
              <input
                className="input"
                value={draft.phone}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, phone: e.target.value }))
                }
                required
                placeholder="Enter phone number"
              />
            </div>

            <div className="field field-wide">
              <label>Address *</label>
              <input
                className="input"
                value={draft.address}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, address: e.target.value }))
                }
                required
                placeholder="Enter full address"
              />
            </div>

            <div className="field">
              <label>City / hometown *</label>
              <input
                className="input"
                value={draft.city}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, city: e.target.value }))
                }
                required
                placeholder="Enter city name"
              />
            </div>

            <div className="field">
              <label>Opening hours</label>
              <input
                className="input"
                placeholder="e.g., 9.00 AM – 5.00 PM"
                value={draft.hours}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, hours: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Latitude *</label>
              <input
                className="input"
                type="number"
                step="any"
                value={draft.lat}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lat: e.target.value }))
                }
                placeholder="e.g., 6.9271"
              />
            </div>

            <div className="field">
              <label>Longitude *</label>
              <input
                className="input"
                type="number"
                step="any"
                value={draft.lng}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lng: e.target.value }))
                }
                placeholder="e.g., 79.8612"
              />
            </div>
          </div>

          <div className="field">
            <label>Categories</label>
            <div className="cc-tagpick">
              {["Food", "Medical", "Clothing", "Shelter", "Water"].map((t) => {
                const on = draft.tags?.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`chip ${on ? "on" : ""}`}
                    onClick={() =>
                      setDraft((d) => {
                        const s = new Set(d.tags || []);
                        on ? s.delete(t) : s.add(t);
                        return { ...d, tags: Array.from(s) };
                      })
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cc-form-actions">
            <button className="btn btn-ghost" type="button" onClick={closeForm}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Adding Center..." : "Save Center"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
