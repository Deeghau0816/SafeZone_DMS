// frontend/src/Component/DonationDashboard/EditOperation.js
import React, { useState, useEffect } from "react";
import "./donationcss/donate_dashboard.css";

const EditOperation = ({ operation, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    operationName: "",
    volunteerCount: "",
    location: "",
    status: "pending"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize form with operation data
  useEffect(() => {
    if (operation) {
      setFormData({
        operationName: operation.operationName || "",
        volunteerCount: operation.volunteerCount?.toString() || "",
        location: operation.location || "",
        status: operation.status || "pending"
      });
    }
  }, [operation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.operationName.trim()) {
      setError("Operation name is required");
      return;
    }

    if (!formData.volunteerCount || formData.volunteerCount < 1) {
      setError("Please enter a valid volunteer count (minimum 1)");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        id: operation._id,
        operationName: formData.operationName.trim(),
        volunteerCount: parseInt(formData.volunteerCount, 10),
        location: formData.location.trim(),
        status: formData.status
      });
    } catch (err) {
      setError(err.message || "Failed to update operation");
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!operation) return null;

  return (
    <div className="editoperation-component">
      <div className="eo-modal-overlay" onClick={handleOverlayClick}>
        <div className="eo-modal-container">
        <div className="eo-modal-header">
          <h2 className="eo-modal-title">Edit Operation</h2>
          <button 
            className="eo-modal-close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="eo-modal-form">
          {error && (
            <div className="eo-form-error">
              <span className="eo-error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="eo-form-group">
            <label htmlFor="operationName" className="eo-form-label">
              Operation Name *
            </label>
            <input
              type="text"
              id="operationName"
              name="operationName"
              value={formData.operationName}
              onChange={handleInputChange}
              className="eo-form-input"
              placeholder="Enter operation name"
              disabled={loading}
              required
            />
          </div>

          <div className="eo-form-group">
            <label htmlFor="location" className="eo-form-label">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="eo-form-input"
              placeholder="Enter operation location"
              disabled={loading}
              maxLength="100"
            />
            <small className="eo-form-help">
              Optional. Maximum 100 characters.
            </small>
          </div>

          <div className="eo-form-group">
            <label htmlFor="volunteerCount" className="eo-form-label">
              Required Volunteers *
            </label>
            <input
              type="number"
              id="volunteerCount"
              name="volunteerCount"
              value={formData.volunteerCount}
              onChange={handleInputChange}
              className="eo-form-input"
              placeholder="Enter number of volunteers needed"
              min="1"
              disabled={loading}
              required
            />
          </div>

          <div className="eo-form-group">
            <label htmlFor="status" className="eo-form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="eo-form-select"
              disabled={loading}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="eo-operation-info">
            <div className="eo-info-item">
              <span className="eo-info-label">Operation ID:</span>
              <span className="eo-info-value">{operation._id}</span>
            </div>
            <div className="eo-info-item">
              <span className="eo-info-label">Created:</span>
              <span className="eo-info-value">
                {new Date(operation.createdAt).toLocaleString()}
              </span>
            </div>
            {operation.updatedAt && (
              <div className="eo-info-item">
                <span className="eo-info-label">Last Updated:</span>
                <span className="eo-info-value">
                  {new Date(operation.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="eo-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="eo-btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="eo-btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="eo-submit-spinner"></span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="eo-btn-icon">💾</span>
                  Update Operation
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default EditOperation;