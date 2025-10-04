/**
 * VictimProfile.js - Advanced Light Theme UI Component
 * 
 * This component displays detailed information about a disaster victim report
 * with a modern, responsive light theme design.
 * 
 * Features:
 * - Clean, modern UI with light theme
 * - Responsive design for all devices
 * - Interactive elements with smooth animations
 * - Media gallery with hover effects
 * - Location mapping integration
 * - Status-based styling
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./VictimProfile.css";

// API endpoint for victim data
const API = "http://localhost:5000/victims";

/**
 * Builds a full URL for uploaded media files
 * Handles both complete URLs and filename-only objects
 * @param {Object|string} x - Media object or URL string
 * @returns {string|null} - Full URL or null if invalid
 */
function toUrl(x) {
  if (!x) return null;
  
  // If it's already a complete URL, return as-is
  if (typeof x === "string" && /^https?:\/\//i.test(x)) return x;
  
  // If object has a complete URL, use it
  if (x.url && /^https?:\/\//i.test(x.url)) return x.url;
  
  // Build URL from filename
  return x.filename ? `http://localhost:5000/uploads/${x.filename}` : null;
}

/**
 * Extracts and normalizes coordinates from various data formats
 * Supports both GeoJSON Point format and plain lat/lng fields
 * @param {Object} v - Victim data object
 * @returns {Object} - Normalized coordinates {lat, lng}
 */
function getCoords(v) {
  // Check for GeoJSON Point format first
  if (v?.location?.type === "Point" && Array.isArray(v.location.coordinates)) {
    const [lng, lat] = v.location.coordinates;
    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  }
  
  // Fallback to plain lat/lng fields
  const lat = v?.lat != null ? Number(v.lat) : null;
  const lng = v?.lng != null ? Number(v.lng) : null;
  
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

/**
 * Formats date strings into a readable format
 * Handles invalid dates gracefully
 * @param {string|Date} dt - Date to format
 * @returns {string} - Formatted date string or "—" if invalid
 */
function fmt(dt) {
  try {
    if (!dt) return "—";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

/**
 * Determines the appropriate status badge class based on risk level
 * @param {string} status - Risk status (High, Medium, Low)
 * @returns {string} - CSS class name for styling
 */
function getStatusClass(status) {
  const normalizedStatus = (status || "").toLowerCase();
  if (normalizedStatus.includes("high")) return "high";
  if (normalizedStatus.includes("medium")) return "medium";
  if (normalizedStatus.includes("low")) return "low";
  return "medium"; // Default fallback
}

/**
 * Main VictimProfile component
 * Displays comprehensive victim information with modern UI
 */
export default function VictimProfile() {
  // Router hooks for navigation and URL parameters
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Component state management
  const [victim, setVictim] = useState(null);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches victim data from the API
   * Handles both success and error states
   */
  useEffect(() => {
    const fetchVictimData = async () => {
      try {
        setIsLoading(true);
        setErr("");
        
        const { data } = await axios.get(`${API}/${id}`);
        setVictim(data.victim || data);
      } catch (error) {
        console.error("Error fetching victim data:", error);
        setErr(error?.response?.data?.message || "Failed to load victim profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchVictimData();
    }
  }, [id]);

  /**
   * Handles victim profile deletion
   * Includes confirmation dialog and error handling
   */
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this victim profile? This action cannot be undone."
    );
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/${id}`);
      alert("✅ Victim profile deleted successfully");
      navigate("/victim/dashboard");
    } catch (error) {
      console.error("Error deleting victim:", error);
      alert(error?.response?.data?.message || "Failed to delete profile");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="profile container">
        <div className="loading">Loading victim profile...</div>
      </main>
    );
  }

  // Error state
  if (err) {
    return (
      <main className="profile container">
        <div className="banner error">
          <strong>Error:</strong> {err}
        </div>
      </main>
    );
  }

  // No victim data
  if (!victim) {
    return (
      <main className="profile container">
        <div className="banner">
          No victim data found for the specified ID.
        </div>
      </main>
    );
  }

  // Destructure victim data with fallback values
  const {
    name,
    nic,
    email,
    phone,
    address,
    description,
    occurredAt,
    status,          // High | Medium | Low
    disasterType,    // Required field for disaster classification
    createdAt,       // Report submission timestamp
    date,            // Legacy fallback for createdAt
    locationStr,     // Human-readable location description
    media = [],      // Array of media attachments
  } = victim;

  // Extract coordinates for mapping
  const { lat, lng } = getCoords(victim);
  
  // Determine status styling
  const statusClass = getStatusClass(status);

  return (
    <main className="profile container">
      {/* Header with title and action buttons */}
      <header className="profile-head">
        <h1>User Panel</h1>
        <div className="actions">
          <Link to={`/victim/profile/${id}/edit`} className="btn primary">
            ✏️ Edit Report
          </Link>
          <button className="btn danger" onClick={handleDelete}>
            🗑️ Delete Report
          </button>
          <Link to="/victim/dashboard" className="btn ghost">
             Back 
          </Link>
        </div>
      </header>

      {/* Main content grid */}
      <section className="profile-grid">
        {/* Personal Details Card */}
        <div className="card">
          <h3 className="card-title">Personal Information</h3>
          <dl className="kv">
            <dt>Full Name</dt>
            <dd>{name || "—"}</dd>
            
            <dt>NIC Number</dt>
            <dd>{nic || "—"}</dd>
            
            <dt>Email Address</dt>
            <dd>{email || "—"}</dd>
            
            <dt>Phone Number</dt>
            <dd>{phone || "—"}</dd>
            
            <dt>Home Address</dt>
            <dd>{address || "—"}</dd>
            
            <dt>Risk Status</dt>
            <dd>
              <span className={`status-badge ${statusClass}`}>
                {status || "Medium"}
              </span>
            </dd>
            
            <dt>Disaster Type</dt>
            <dd>{disasterType || "—"}</dd>
            
            <dt>Incident Date</dt>
            <dd>{fmt(occurredAt)}</dd>
            
            <dt>Reported At</dt>
            <dd>{fmt(createdAt || date)}</dd>
            
            <dt>Description</dt>
            <dd>{description || "—"}</dd>
            
            {/* Location coordinates if available */}
            {lat != null && lng != null && (
              <>
                <dt>Coordinates</dt>
                <dd>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                  {locationStr && (
                    <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                      📍 {locationStr}
                    </span>
                  )}
                </dd>
              </>
            )}
          </dl>
        </div>

        {/* Location Map Card */}
        <div className="card">
          <h3 className="card-title">Incident Location</h3>
          {lat != null && lng != null ? (
            <iframe
              title="Incident location map"
              src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
              loading="lazy"
              allowFullScreen
            />
          ) : (
            <div className="blank">
              📍 No location data available
            </div>
          )}
        </div>

        {/* Media Attachments Card */}
        <div className="card media-card">
          <h3 className="card-title">Media Attachments</h3>
          {media.length > 0 ? (
            <div className="media-grid">
              {media.map((mediaItem, index) => {
                const url = toUrl(mediaItem);
                const type = mediaItem?.mimetype || url || "";
                const isImage = /image/i.test(type);
                const isVideo = /video/i.test(type);
                
                return (
                  <a 
                    key={url || mediaItem.filename || index} 
                    className="tile" 
                    href={url || "#"} 
                    target="_blank" 
                    rel="noreferrer"
                    title={mediaItem.filename || `Media ${index + 1}`}
                  >
                    {isImage ? (
                      <img src={url} alt={`Attachment ${index + 1}`} />
                    ) : isVideo ? (
                      <video src={url} controls />
                    ) : (
                      <div className="doc">
                        📄 {mediaItem.filename || `File ${index + 1}`}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="blank">
              📎 No media attachments available
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
