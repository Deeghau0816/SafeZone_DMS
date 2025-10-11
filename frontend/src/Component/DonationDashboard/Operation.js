// frontend/src/Component/DonationDashboard/Operation.js
import React, { useEffect, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function VolunteerOperationForm({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    operationName: "",
    volunteerCount: "",
    location: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // unique-name live check
  const [nameChecking, setNameChecking] = useState(false);
  const [nameTaken, setNameTaken] = useState(false);
  const checkTimer = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");

    if (name === "operationName") {
      setNameTaken(false);
      setNameChecking(true);
      if (checkTimer.current) clearTimeout(checkTimer.current);
      // debounce 400ms
      checkTimer.current = setTimeout(() => checkName(value), 400);
    }
  };

  // Works with your backend shape: { data: [...] }
  const checkName = async (rawName) => {
    const name = (rawName || "").trim();
    if (!name) {
      setNameChecking(false);
      setNameTaken(false);
      return;
    }
    try {
      const url = new URL(`${API_BASE}/api/operations`);
      // backend will safely ignore these, but harmless to send
      url.searchParams.set("q", name);
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Name check failed");
      const data = await res.json();

      // Accept common shapes
      const arr = Array.isArray(data)
        ? data
        : data.data || data.items || [];

      const exact = arr.some(
        (it) => (it.operationName || "").trim().toLowerCase() === name.toLowerCase()
      );
      setNameTaken(exact);
    } catch {
      // don’t block user on transient errors
      setNameTaken(false);
    } finally {
      setNameChecking(false);
    }
  };

  const handleSubmit = async () => {
    const name = formData.operationName.trim();
    const count = parseInt(formData.volunteerCount, 10);
    const location = formData.location.trim();

    if (!name || !count) {
      setError("Please fill in all required fields");
      return;
    }
    if (Number.isNaN(count) || count < 1) {
      setError("Volunteer count must be 1 or more");
      return;
    }
    if (nameTaken) {
      setError("This operation name already exists. Please choose another.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (onSubmit) {
        await onSubmit({ operationName: name, volunteerCount: count, location });
      } else {
        // default API call (in case no onSubmit is provided)
        const resp = await fetch(`${API_BASE}/api/operations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationName: name,
            volunteerCount: count,
            ...(location && { location }),
          }),
        });

        if (resp.status === 409) {
          setNameTaken(true);
          throw new Error("An operation with this name already exists");
        }
        if (!resp.ok) throw new Error("Failed to create operation");
      }

      setSuccess(true);
      setTimeout(() => onClose && onClose(), 1600);
    } catch (err) {
      setError(err.message || "Failed to create operation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => onClose && onClose();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isSubmitting) handleSubmit();
    else if (e.key === "Escape") handleClose();
  };

  // autofocus first field when open
  const nameRef = useRef(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  if (success) {
    return (
      <div className="operation-component">
        <div className="op-overlay" role="dialog" aria-modal="true">
          <div className="op-card op-card--success" aria-live="polite">
            <div className="op-header op-header--success">
              <h2 className="op-title">Success!</h2>
            </div>
            <div className="op-body op-body--center">
              <div className="op-check">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="op-success-line">
                Operation <strong>{formData.operationName}</strong> created.
              </p>
              <p className="op-success-sub">
                Volunteers needed: <strong>{formData.volunteerCount}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="operation-component">
      <div
        className="op-overlay"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="op-card" onKeyDown={handleKeyDown}>
          {/* Header */}
          <div className="op-header">
            <h2 className="op-title">New Volunteer Operation</h2>
            <button className="op-close" aria-label="Close" onClick={handleClose}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="op-body">
          {/* Operation Name */}
          <div className="op-field">
            <label htmlFor="op-operationName" className="op-label">
              Operation Name *
            </label>
            <input
              ref={nameRef}
              id="op-operationName"
              name="operationName"
              type="text"
              className={`op-input ${nameTaken ? "op-is-invalid" : ""}`}
              value={formData.operationName}
              onChange={handleInputChange}
              placeholder="e.g., Flood Relief — Ratnapura"
              disabled={isSubmitting}
            />
            <div className="op-hint">
              {nameChecking && <span className="op-spinner" aria-hidden="true" />}
              {nameChecking ? " Checking name…" : "Use a descriptive, unique name."}
            </div>
            {nameTaken && (
              <div className="op-error-inline">This operation name already exists.</div>
            )}
          </div>

          {/* Location (optional) */}
          <div className="op-field">
            <label htmlFor="op-location" className="op-label">
              Location (optional)
            </label>
            <input
              id="op-location"
              name="location"
              type="text"
              className="op-input"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Sector 7, Ratnapura"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          {/* Volunteer Count */}
          <div className="op-field">
            <label htmlFor="op-volunteerCount" className="op-label">
              Required Volunteer Count *
            </label>
            <input
              id="op-volunteerCount"
              name="volunteerCount"
              type="number"
              min="1"
              className="op-input"
              value={formData.volunteerCount}
              onChange={handleInputChange}
              placeholder="e.g., 12"
              disabled={isSubmitting}
            />
          </div>

          {/* Error banner */}
          {error && (
            <div className="op-alert" role="alert">
              <div className="op-alert-icon">!</div>
              <div>{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="op-actions">
            <button
              className="op-btn op-btn--ghost"
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="op-btn op-btn--primary"
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !formData.operationName ||
                !formData.volunteerCount ||
                nameTaken
              }
            >
              {isSubmitting ? (
                <>
                  <span className="op-spinner" aria-hidden="true" /> Submitting…
                </>
              ) : (
                "Create Operation"
              )}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
