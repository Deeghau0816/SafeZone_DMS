import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Ngodisaster.css"; // Updated import

/** API endpoints */
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const UPLOAD_URL = `${API_BASE}/api/uploads/deposit-proof`;
const DISASTERS_API = `${API_BASE}/api/activedisasters`;

const isImg = (f) => f && ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(f.type);

export default function Ngodisaster() {
  const nav = useNavigate();

  // Helper: go back if possible, otherwise go to /donation
  const goBack = () => {
    if (window.history.length > 1) {
      nav(-1);
    } else {
      nav("/donation");
    }
  };

  // ----- form state -----
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [summary, setSummary] = useState("");
  const [needsText, setNeedsText] = useState("");
  const needs = useMemo(
    () => needsText.split(",").map((s) => s.trim()).filter(Boolean),
    [needsText]
  );

  const [accent, setAccent] = useState("#16a34a");
  const [severity, setSeverity] = useState("Medium");
  const [active, setActive] = useState(true);
  const [showOnDonation, setShowOnDonation] = useState(true);

  // ----- images (only gallery) -----
  const [galleryFiles, setGalleryFiles] = useState([null, null, null, null]); // 4 slots for gallery images
  const [galPrev, setGalPrev] = useState(["", "", "", ""]); // Initializing 4 gallery slots with empty preview
  const bulkPickRef = useRef(null);

  // Loading state
  const [saving, setSaving] = useState(false);

  // Handle gallery image selection
  function pickSlot(i) {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = "image/png,image/jpeg,image/jpg,image/webp";
    el.onchange = (e) => {
      const f = e.target.files?.[0];
      if (!isImg(f)) return;
      const next = [...galleryFiles];
      const prev = [...galPrev];
      next[i] = f;
      prev[i] = URL.createObjectURL(f);
      setGalleryFiles(next);
      setGalPrev(prev);
    };
    el.click();
  }

  // Add up to 4 gallery images
  function onBulkPick(e) {
    const files = Array.from(e.target.files || []).filter(isImg).slice(0, 4); // Limit to 4 images
    if (!files.length) return;

    const nextG = [...galleryFiles];
    const nextP = [...galPrev];
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      nextG[i] = files[i];
      nextP[i] = URL.createObjectURL(files[i]);
    }
    setGalleryFiles(nextG);
    setGalPrev(nextP);
    if (bulkPickRef.current) bulkPickRef.current.value = "";
  }

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });

    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      const msg = ct.includes("application/json")
        ? (await res.json())?.message
        : await res.text();
      throw new Error(msg || "Upload failed");
    }
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (!data?.filePath) throw new Error("No file path returned by upload API");
      return data.filePath;
    }
    return await res.text();
  }

  async function handleSave(e) {
    e.preventDefault();

    // Basic validation
    if (!galleryFiles.filter(Boolean).length) {
  alert("Please upload at least one image");
  return;
}
    if (!name.trim()) {
      alert("Please enter a disaster name");
      return;
      
    }
     if (/\d/.test(name)) { alert("Disaster name should not contain numbers"); return; }
    if (!city.trim()) {
      alert("Please enter a city");
      return;
    }
if (/\d/.test(city)) { alert("City should not contain numbers"); return; }
    setSaving(true);
    try {
      // Upload all gallery images first
      const urls = await Promise.all(galleryFiles.filter(Boolean).map(uploadOne));

      const payload = {
        name: name.trim(),
        city: city.trim(),
        summary: summary.trim(),
        needs,
        accent,
        severity,
        active,
        showOnDonation,
        images: {
          gallery: urls,
        },
      };

      console.log("Creating disaster with payload:", payload);

      // POST to your disasters API
      const response = await fetch(DISASTERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Disaster created successfully:", result);

      // Navigate to the Active Disaster Panel
      nav("/dashboard/disasters/active");

    } catch (err) {
      console.error("Save error:", err);
      alert(err.message || "Something went wrong while saving the disaster");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="donation-component">
      <form className="nd-wrap" onSubmit={handleSave}>
        {/* Hero header */}
        <div className="nd-hero">
          <div className="nd-hero-left">
            <h1 className="nd-title">Create New Disaster</h1>
            <p className="nd-sub">Add a new disaster to track and manage relief efforts</p>
          </div>
          <div className="nd-hero-actions">
            <button type="button" className="btn btn-ghost" onClick={goBack} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>

        {/* Basic fields */}
        <div className="nd-grid2">
          <div className="field">
            <label>Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Flood Response"
              required
              disabled={saving}
            />
          </div>
          <div className="field">
            <label>City *</label>
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Ratnapura"
              required
              disabled={saving}
            />
          </div>
        </div>

        <div className="field">
          <label>Summary</label>
          <textarea
            className="input"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short description of the disaster and current situation…"
            disabled={saving}
          />
        </div>

        <div className="field">
          <label>Top needs (comma-separated)</label>
          <input
            className="input"
            value={needsText}
            onChange={(e) => setNeedsText(e.target.value)}
            placeholder="e.g., Water, Dry rations, Bedding, Medical supplies"
            disabled={saving}
          />
          {needs.length > 0 && (
            <div className="chips">
              {needs.map((n, i) => (
                <span key={i} className="chip">
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="nd-grid2">
          <div className="field">
            <label>Accent color</label>
            <div className="color-row">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                disabled={saving}
              />
              <span className="muted">{accent}</span>
            </div>
          </div>
          <div className="field">
            <label>Severity</label>
            <select
              className="input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              disabled={saving}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
        </div>

        <div className="field">
          <div className="nd-grid2">
            <label className="checkrow">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={saving}
              />
              <span>Active</span>
            </label>
            <label className="checkrow">
              <input
                type="checkbox"
                checked={showOnDonation}
                onChange={(e) => setShowOnDonation(e.target.checked)}
                disabled={saving}
              />
              <span>Show on Donation page</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="card">
          <div className="card-head">
            <strong>Images</strong>
            <span className="muted">PNG/JPG/WebP, ≤ 2 MB each</span>
          </div>

          {/* Bulk picker */}
          <div className="bulk-row">
            <input
              ref={bulkPickRef}
              type="file"
              className="visually-hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={onBulkPick}
              disabled={saving}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => bulkPickRef.current?.click()}
              disabled={saving}
            >
              Add up to 4 images at once
            </button>
            <span className="muted">
              First image becomes the cover, next three fill the gallery.
            </span>
          </div>

          {/* Four equal boxes - only gallery */}
          <div className="img-grid">
            {galPrev.map((p, i) => (
              <div key={i} className="img-slot">
                {p ? (
                  <img src={p} alt={`Gallery ${i + 1}`} />
                ) : (
                  <div className="img-empty">Gallery {i + 1}</div>
                )}
                <button
                  type="button"
                  className="slot-btn"
                  onClick={() => pickSlot(i)}
                  disabled={saving}
                >
                  {p ? "Replace" : "Choose image"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="nd-actions">
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={goBack}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Create Disaster"}
          </button>
        </div>
      </form>
    </div>
  );
}
