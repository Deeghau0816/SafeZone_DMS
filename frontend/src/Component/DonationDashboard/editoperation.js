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
    <div className="edit-modal-overlay" onClick={handleOverlayClick}>
      <div className="edit-modal-container">
        <div className="edit-modal-header">
          <h2 className="edit-modal-title">Edit Operation</h2>
          <button 
            className="edit-modal-close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-modal-form">
          {error && (
            <div className="edit-form-error">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="edit-form-group">
            <label htmlFor="operationName" className="edit-form-label">
              Operation Name *
            </label>
            <input
              type="text"
              id="operationName"
              name="operationName"
              value={formData.operationName}
              onChange={handleInputChange}
              className="edit-form-input"
              placeholder="Enter operation name"
              disabled={loading}
              required
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="location" className="edit-form-label">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="edit-form-input"
              placeholder="Enter operation location"
              disabled={loading}
              maxLength="100"
            />
            <small className="edit-form-help">
              Optional. Maximum 100 characters.
            </small>
          </div>

          <div className="edit-form-group">
            <label htmlFor="volunteerCount" className="edit-form-label">
              Required Volunteers *
            </label>
            <input
              type="number"
              id="volunteerCount"
              name="volunteerCount"
              value={formData.volunteerCount}
              onChange={handleInputChange}
              className="edit-form-input"
              placeholder="Enter number of volunteers needed"
              min="1"
              disabled={loading}
              required
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="status" className="edit-form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="edit-form-select"
              disabled={loading}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="edit-operation-info">
            <div className="info-item">
              <span className="info-label">Operation ID:</span>
              <span className="info-value">{operation._id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">
                {new Date(operation.createdAt).toLocaleString()}
              </span>
            </div>
            {operation.updatedAt && (
              <div className="info-item">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">
                  {new Date(operation.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="edit-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="edit-btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="submit-spinner"></span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="btn-icon">💾</span>
                  Update Operation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOperation;