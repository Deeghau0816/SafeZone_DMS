import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import "./donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API = `${API_BASE}/api/activedisasters`;

const toAbs = (u) => (!u ? "" : /^https?:/i.test(u) ? u : `${API_BASE}${u}`);

/* ---------- Safe data processing utilities ---------- */
const safeStringSplit = (str, delimiter = ',') => {
  if (!str || typeof str !== 'string') {
    return [];
  }
  return str.split(delimiter).map(item => item.trim()).filter(item => item !== '');
};

const safeGetProperty = (obj, property, defaultValue = '') => {
  return obj && obj[property] !== undefined && obj[property] !== null 
    ? obj[property] 
    : defaultValue;
};

const normalizeDisasterData = (disaster) => {
  if (!disaster) return disaster;
  
  // Safely handle needs data
  let needs = [];
  if (Array.isArray(disaster.needs)) {
    needs = disaster.needs.filter(n => n && typeof n === 'string');
  } else if (typeof disaster.needs === 'string') {
    needs = safeStringSplit(disaster.needs);
  }

  // FIXED: More robust boolean handling for showOnDonation
  let showOnDonation = false;
  if (disaster.showOnDonation === true || 
      disaster.showOnDonation === 'true' || 
      disaster.showOnDonation === 1 || 
      disaster.showOnDonation === '1') {
    showOnDonation = true;
  }

  // Handle active status
  let active = true; // Default to true if not specified
  if (disaster.active === false || 
      disaster.active === 'false' || 
      disaster.active === 0 || 
      disaster.active === '0') {
    active = false;
  }

  console.log('Admin Panel - normalizing disaster:', disaster._id, {
    name: disaster.name,
    original_showOnDonation: disaster.showOnDonation,
    normalized_showOnDonation: showOnDonation,
    original_active: disaster.active,
    normalized_active: active
  });

  return {
    ...disaster,
    needs: needs,
    showOnDonation: showOnDonation,
    active: active,
    name: safeGetProperty(disaster, 'name', ''),
    city: safeGetProperty(disaster, 'city', ''),
    summary: safeGetProperty(disaster, 'summary', ''),
    severity: safeGetProperty(disaster, 'severity', 'Medium'),
    accentColor: safeGetProperty(disaster, 'accentColor', '#16a34a')
  };
};

const emptyEdit = (x) => {
  // Create a 4-slot gallery array, filling with existing images or null
  const createGalleryArray = (existingGallery) => {
    const gallery = [null, null, null, null];
    if (existingGallery && Array.isArray(existingGallery)) {
      existingGallery.forEach((img, index) => {
        if (index < 4 && img) {
          gallery[index] = img;
        }
      });
    }
    return gallery;
  };

  const normalized = normalizeDisasterData(x);

  return normalized
    ? {
        _id: normalized._id,
        name: normalized.name,
        city: normalized.city,
        summary: normalized.summary,
        needsCSV: Array.isArray(normalized.needs) ? normalized.needs.join(", ") : "",
        accentColor: normalized.accentColor,
        severity: normalized.severity,
        showOnDonation: normalized.showOnDonation,
        active: normalized.active,
        coverFile: null,
        galleryFiles: [null, null, null, null],
        existingImages: {
          gallery: createGalleryArray(normalized.images?.gallery)
        },
        removedImages: []
      }
    : {
        _id: "",
        name: "",
        city: "",
        summary: "",
        needsCSV: "",
        accentColor: "#16a34a",
        severity: "Medium",
        showOnDonation: true,
        active: true,
        coverFile: null,
        galleryFiles: [null, null, null, null],
        existingImages: {
          gallery: [null, null, null, null]
        },
        removedImages: []
      };
};

export default function ActiveDisasterPanel() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(emptyEdit());
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Refs for mirrored horizontal scrollbar
  const tableWrapRef = useRef(null);
  const topScrollRef = useRef(null);
  const topInnerRef = useRef(null);
  const rafRef = useRef(0);
  const syncingRef = useRef(false);
  const [showTopScroll, setShowTopScroll] = useState(false);

  // Refs for modal usability
  const formRef = useRef(null);
  const firstInputRef = useRef(null);

  // Scroll to top functionality
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock page scroll + keyboard shortcuts when modal open
  useEffect(() => {
    if (showEdit) {
      document.body.style.overflow = "hidden";
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowEdit(false);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      };
      window.addEventListener("keydown", onKey);
      // Focus first input
      setTimeout(() => firstInputRef.current?.focus(), 100);

      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [showEdit]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((x) => {
      const needs = Array.isArray(x.needs) ? x.needs.join(" ") : (x.needs || "");
      return (
        safeGetProperty(x, 'name', '').toLowerCase().includes(k) ||
        safeGetProperty(x, 'city', '').toLowerCase().includes(k) ||
        safeGetProperty(x, 'summary', '').toLowerCase().includes(k) ||
        needs.toLowerCase().includes(k)
      );
    });
  }, [q, items]);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      
      // ADMIN PANEL: Load ALL disasters (both visible and hidden)
      // Don't filter by showOnDonation here - we want to see everything in admin
      const res = await fetch(API);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      const disasters = Array.isArray(data) ? data : [];
      
      console.log('Admin panel loaded disasters:', disasters.length);
      
      // Normalize all disaster data
      const normalizedDisasters = disasters.map(normalizeDisasterData);
      setItems(normalizedDisasters);
    } catch (e) {
      console.error("Failed to load disasters:", e);
      setErr(e.message || "Failed to fetch disasters");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openCreateForm = () => nav("/donation/active-disasters");

  const openEdit = (x) => {
    setEdit(emptyEdit(x));
    setShowEdit(true);
    // Scroll to top when opening modal
    setTimeout(() => {
      document.querySelector(".adp-modal-content")?.scrollTo(0, 0);
    }, 100);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEdit(emptyEdit());
  };

  const removeExistingImage = (index) => {
    setEdit((prev) => {
      const imageToRemove = prev.existingImages.gallery[index];
      const newGallery = [...prev.existingImages.gallery];
      newGallery[index] = null; // Set to null instead of removing
      
      const newRemovedImages = imageToRemove && imageToRemove !== null 
        ? [...prev.removedImages, imageToRemove]
        : prev.removedImages;
      
      return {
        ...prev,
        existingImages: {
          ...prev.existingImages,
          gallery: newGallery
        },
        removedImages: newRemovedImages
      };
    });
  };

  async function remove(id) {
    if (!window.confirm("Delete this disaster? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      await load();
      scrollToTop();
    } catch (e) {
      console.error("Failed to delete disaster:", e);
      alert("Failed to delete: " + e.message);
    }
  }

  // FIXED: Enhanced updateFlags function for toggle functionality
  async function updateFlags(id, patch) {
    try {
      console.log('Updating flags for disaster:', id, 'with patch:', patch);
      
      const fd = new FormData();
      Object.entries(patch).forEach(([k, v]) => {
        const stringValue = String(v);
        fd.append(k, stringValue);
        console.log(`Added to form data: ${k} = ${stringValue}`);
      });

      const res = await fetch(`${API}/${id}`, { 
        method: "PUT", 
        body: fd 
      });
      
      if (!res.ok) {
        let msg = "Update failed";
        try {
          const errorData = await res.json();
          msg = errorData?.message || `HTTP ${res.status}: ${res.statusText}`;
          console.error("Update error response:", errorData);
        } catch (parseError) {
          msg = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(msg);
      }
      
      const result = await res.json();
      console.log("Toggle update successful:", result);
      
      if (result.success === false) {
        throw new Error(result.message || "Update failed");
      }
      
      return result;
    } catch (error) {
      console.error("Update flags error:", error);
      throw error;
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    
    try {
      const id = edit._id;
      if (!id) {
        throw new Error("No disaster ID found");
      }
      
      // Validate required fields before sending
      const name = safeGetProperty(edit, 'name', '').trim();
      const city = safeGetProperty(edit, 'city', '').trim();
      
      if (!name) {
        alert("Name is required and cannot be empty");
        setSaving(false);
        return;
      }
      
      if (!city) {
        alert("City is required and cannot be empty");
        setSaving(false);
        return;
      }
      
      const fd = new FormData();
      
      // Basic fields with validation and safe handling
      fd.append("name", name);
      fd.append("city", city);
      fd.append("summary", safeGetProperty(edit, 'summary', ''));
      fd.append("needs", safeGetProperty(edit, 'needsCSV', ''));
      fd.append("accentColor", safeGetProperty(edit, 'accentColor', '#16a34a'));
      fd.append("severity", safeGetProperty(edit, 'severity', 'Medium'));
      fd.append("active", String(edit.active === true));
      fd.append("showOnDonation", String(edit.showOnDonation === true));
      
      console.log('Sending form data:', {
        name: name,
        city: city,
        summary: safeGetProperty(edit, 'summary', ''),
        needs: safeGetProperty(edit, 'needsCSV', ''),
        accentColor: safeGetProperty(edit, 'accentColor', '#16a34a'),
        severity: safeGetProperty(edit, 'severity', 'Medium'),
        active: String(edit.active === true),
        showOnDonation: String(edit.showOnDonation === true)
      });
      
      // Create final gallery array - this will be the complete new gallery
      const finalGallery = [];
      for (let i = 0; i < 4; i++) {
        if (edit.galleryFiles[i]) {
          // New file being uploaded for this position - backend will handle this
          finalGallery[i] = `NEW_FILE_${i}`;
        } else if (edit.existingImages.gallery[i]) {
          // Keep existing image (not removed)
          finalGallery[i] = edit.existingImages.gallery[i];
        } else {
          // Empty slot or removed image
          finalGallery[i] = null;
        }
      }
      
      // Send the final gallery structure
      fd.append("finalGallery", JSON.stringify(finalGallery));
      
      // Send removed images list for cleanup
      fd.append("removedImages", JSON.stringify(edit.removedImages || []));
      
      // Add cover file if selected
      if (edit.coverFile) {
        fd.append("cover", edit.coverFile);
      }
      
      // Add new gallery files with their intended positions
      edit.galleryFiles.forEach((file, index) => {
        if (file) {
          fd.append(`gallery_${index}`, file);
        }
      });

      console.log('Making PUT request to:', `${API}/${id}`);
      
      const res = await fetch(`${API}/${id}`, { 
        method: "PUT", 
        body: fd 
      });
      
      if (!res.ok) {
        let msg = "Save failed";
        try {
          const errorData = await res.json();
          msg = errorData?.message || `HTTP ${res.status}: ${res.statusText}`;
          console.error("Save error response:", errorData);
        } catch (parseError) {
          msg = `HTTP ${res.status}: ${res.statusText}`;
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(msg);
      }
      
      const result = await res.json();
      console.log("Save successful:", result);
      
      // Check if the response indicates success
      if (result.success === false) {
        throw new Error(result.message || "Save failed");
      }
      
      closeEdit();
      await load();
      scrollToTop();
    } catch (e) {
      console.error("Save error:", e);
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // Function to generate report
  const generateReport = async () => {
    try {
      // Filter only items that are shown on donation page with safe handling
      const visibleItems = items.filter(item => item && item.showOnDonation === true);
      const hiddenItems = items.filter(item => item && item.showOnDonation === false);
      
      // Create report data
      const reportData = {
        totalDisasters: items.length,
        visibleDisasters: visibleItems.length,
        hiddenDisasters: hiddenItems.length,
        visibleDisastersData: visibleItems.map(item => {
          // Safely handle needs data
          let needsText = '';
          if (item && item.needs) {
            if (Array.isArray(item.needs)) {
              needsText = item.needs.join(', ');
            } else if (typeof item.needs === 'string') {
              needsText = item.needs;
            }
          }
          
          return {
            name: safeGetProperty(item, 'name', 'Untitled'),
            city: safeGetProperty(item, 'city', 'Unknown'),
            severity: safeGetProperty(item, 'severity', 'Medium'),
            needs: needsText,
            summary: safeGetProperty(item, 'summary', ''),
            status: 'Visible on website'
          };
        }),
        hiddenDisastersData: hiddenItems.map(item => {
          let needsText = '';
          if (item && item.needs) {
            if (Array.isArray(item.needs)) {
              needsText = item.needs.join(', ');
            } else if (typeof item.needs === 'string') {
              needsText = item.needs;
            }
          }
          
          return {
            name: safeGetProperty(item, 'name', 'Untitled'),
            city: safeGetProperty(item, 'city', 'Unknown'),
            severity: safeGetProperty(item, 'severity', 'Medium'),
            needs: needsText,
            summary: safeGetProperty(item, 'summary', ''),
            status: 'Hidden from website'
          };
        }),
        generatedAt: new Date().toISOString()
      };

      // Create and download the report as JSON
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disaster-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Report generated successfully!\nTotal disasters: ${reportData.totalDisasters}\nVisible on website: ${reportData.visibleDisasters}\nHidden from website: ${reportData.hiddenDisasters}`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report: ' + error.message);
    }
  };

  /** ------- Top horizontal scrollbar sync ------- */
  function measureAndSyncBars() {
    const wrap = tableWrapRef.current;
    const top = topScrollRef.current;
    const topInner = topInnerRef.current;
    if (!wrap || !top || !topInner) return;

    // Show top bar only when overflow exists
    const hasOverflow = wrap.scrollWidth > wrap.clientWidth + 5;
    setShowTopScroll(hasOverflow);

    // Mirror width and position
    topInner.style.width = `${wrap.scrollWidth}px`;
    top.scrollLeft = wrap.scrollLeft;
  }

  useEffect(() => {
    const wrap = tableWrapRef.current;
    const top = topScrollRef.current;
    if (!wrap || !top) return;

    const onTopScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        wrap.scrollLeft = top.scrollLeft;
        syncingRef.current = false;
      });
    };

    const onBottomScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        top.scrollLeft = wrap.scrollLeft;
        syncingRef.current = false;
      });
    };

    top.addEventListener("scroll", onTopScroll);
    wrap.addEventListener("scroll", onBottomScroll);
    window.addEventListener("resize", measureAndSyncBars);

    // Initial measure with delay to ensure DOM is ready
    setTimeout(measureAndSyncBars, 100);

    return () => {
      top.removeEventListener("scroll", onTopScroll);
      wrap.removeEventListener("scroll", onBottomScroll);
      window.removeEventListener("resize", measureAndSyncBars);
    };
  }, [items, q]);

  return (
    <>
      <div className="adp-disaster-wrap">
        {/* Header and Search */}
        <div className="adp-disaster-head">
          <div>
            <h1 className="adp-disaster-title">Active Disasters</h1>
            <p className="adp-disaster-subtitle">
              Create, edit, and manage items shown on the Donation page. Use the toggle to show/hide disasters without deleting data.
            </p>
          </div>
          <div className="adp-disaster-actions">
            <button
              className="ngo-btn ngo-btn-primary"
              onClick={openCreateForm}
            >
              + New disaster
            </button>

            {/* Report Button */}
            <button
              className="ngo-btn ngo-btn-secondary"
              onClick={generateReport}
            >
              Generate Report
            </button>
          </div>
        </div>

        <div className="adp-search-panel">
          <div className="adp-search-container">
            <input
              className="adp-search-input"
              placeholder="Search by name, city, summary, or need…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              className="adp-reset-btn"
              onClick={() => setQ("")}
              aria-label="Reset Search"
            >
              Reset
            </button>
          </div>
        </div>

        {err && <div className="adp-alert adp-alert-error">{err}</div>}

        {loading ? (
          <div className="adp-loading">Loading disasters…</div>
        ) : filtered.length === 0 ? (
          <div className="adp-empty-panel">
            {q ? "No disasters match your search." : "No disasters found."}
          </div>
        ) : (
          <div className="adp-table-panel">
            {/* Top mirrored horizontal scrollbar */}
            {showTopScroll && (
              <div
                className="adp-top-scroll"
                ref={topScrollRef}
                aria-hidden="true"
              >
                <div className="adp-top-scroll-inner" ref={topInnerRef} />
              </div>
            )}

            <div className="adp-table-wrap" ref={tableWrapRef}>
              <table className="adp-disaster-table">
                <thead>
                  <tr>
                    <th className="adp-col-name">Name</th>
                    <th className="adp-col-city">City</th>
                    <th className="adp-col-needs">Needs</th>
                    <th className="adp-col-severity">Severity</th>
                  
                    <th className="adp-col-actions">Actions</th>
                    <th className="adp-col-gallery1">Gallery Image 1</th>
                    <th className="adp-col-gallery2">Gallery Image 2</th>
                    <th className="adp-col-gallery3">Gallery Image 3</th>
                    <th className="adp-col-gallery4">Gallery Image 4</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => {
                    const needsArray = Array.isArray(x.needs) ? x.needs : [];
                    
                    return (
                      <tr key={x._id} className={x.showOnDonation === false ? "adp-hidden-row" : ""}>
                        <td>
                          <div className="adp-disaster-name">
                            {safeGetProperty(x, 'name', 'Untitled')}
                            {x.showOnDonation === false && (
                              <span className="adp-hidden-badge">Hidden</span>
                            )}
                          </div>
                          <div className="adp-disaster-summary">{safeGetProperty(x, 'summary', '')}</div>
                        </td>
                        <td>{safeGetProperty(x, 'city', 'Unknown')}</td>
                        <td>
                          <div className="adp-needs-chips">
                            {needsArray.slice(0, 3).map((n, i) => (
                              <span key={i} className="adp-need-chip">
                                {n}
                              </span>
                            ))}
                            {needsArray.length > 3 && (
                              <span className="adp-need-chip">
                                +{needsArray.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`adp-severity-badge ${getSeverityClass(
                              x.severity
                            )}`}
                          >
                            {safeGetProperty(x, 'severity', 'Medium')}
                          </span>
                        </td>
                        
                        <td>
                          <div className="adp-row-actions">
                            <button
                              className="ngoo-btn"
                              onClick={() => openEdit(x)}
                            >
                              Edit
                            </button>
                            <button
                              className="adp-btn adp-btn-outline-danger"
                              onClick={() => remove(x._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                        <td>
                          {x.images?.gallery?.[0] ? (
                            <img
                              src={toAbs(x.images.gallery[0])}
                              alt={`Gallery Image 1 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              className="adp-gallery-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="adp-gallery-placeholder" />
                          )}
                        </td>
                        <td>
                          {x.images?.gallery?.[1] ? (
                            <img
                              src={toAbs(x.images.gallery[1])}
                              alt={`Gallery Image 2 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              className="adp-gallery-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="adp-gallery-placeholder" />
                          )}
                        </td>
                        <td>
                          {x.images?.gallery?.[2] ? (
                            <img
                              src={toAbs(x.images.gallery[2])}
                              alt={`Gallery Image 3 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              className="adp-gallery-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="adp-gallery-placeholder" />
                          )}
                        </td>
                        <td>
                          {x.images?.gallery?.[3] ? (
                            <img
                              src={toAbs(x.images.gallery[3])}
                              alt={`Gallery Image 4 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              className="adp-gallery-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="adp-gallery-placeholder" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scroll to top button */}
        <button
          className={`adp-scroll-top ${showScrollTop ? "visible" : ""}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="adp-modal-backdrop" onClick={closeEdit}>
          <div className="adp-modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="adp-modal-header">
              <h3 className="adp-modal-title">Edit disaster</h3>
              <button
                className="adp-btn adp-btn-ghost"
                onClick={closeEdit}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              ref={formRef}
              onSubmit={saveEdit}
              className="adp-modal-content"
            >
              <div className="adp-form-grid">
                <div className="adp-form-field">
                  <label className="adp-form-label">Name</label>
                  <input
                    ref={firstInputRef}
                    className="adp-form-input"
                    value={safeGetProperty(edit, 'name', '')}
                    onChange={(e) =>
                      setEdit((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="adp-form-field">
                  <label className="adp-form-label">City</label>
                  <input
                    className="adp-form-input"
                    value={safeGetProperty(edit, 'city', '')}
                    onChange={(e) =>
                      setEdit((p) => ({ ...p, city: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="adp-form-field adp-form-field-full">
                <label className="adp-form-label">Summary</label>
                <textarea
                  rows={3}
                  className="adp-form-textarea"
                  value={safeGetProperty(edit, 'summary', '')}
                  onChange={(e) =>
                    setEdit((p) => ({ ...p, summary: e.target.value }))
                  }
                />
              </div>

              <div className="adp-form-field adp-form-field-full">
                <label className="adp-form-label">
                  Top needs (comma-separated)
                </label>
                <input
                  className="adp-form-input"
                  value={safeGetProperty(edit, 'needsCSV', '')}
                  onChange={(e) =>
                    setEdit((p) => ({ ...p, needsCSV: e.target.value }))
                  }
                  placeholder="e.g., Water, Food, Medical supplies"
                />
              </div>

              <div className="adp-form-grid">
                <div className="adp-form-field">
                  <label className="adp-form-label">Accent color</label>
                  <div className="adp-color-picker">
                    <input
                      type="color"
                      value={safeGetProperty(edit, 'accentColor', '#16a34a')}
                      onChange={(e) =>
                        setEdit((p) => ({ ...p, accentColor: e.target.value }))
                      }
                    />
                    <input
                      className="adp-form-input"
                      value={safeGetProperty(edit, 'accentColor', '#16a34a')}
                      onChange={(e) =>
                        setEdit((p) => ({ ...p, accentColor: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="adp-form-field">
                  <label className="adp-form-label">Severity</label>
                  <select
                    className="adp-form-select"
                    value={safeGetProperty(edit, 'severity', 'Medium')}
                    onChange={(e) =>
                      setEdit((p) => ({ ...p, severity: e.target.value }))
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="adp-form-field">
                <label className="adp-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={edit.active === true}
                    onChange={(e) =>
                      setEdit((p) => ({
                        ...p,
                        active: e.target.checked,
                      }))
                    }
                  />
                  <span>Disaster is active</span>
                </label>
              </div>

              <div className="adp-form-field">
                <label className="adp-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={edit.showOnDonation === true}
                    onChange={(e) =>
                      setEdit((p) => ({
                        ...p,
                        showOnDonation: e.target.checked,
                      }))
                    }
                  />
                  <span>Show on Donation page</span>
                </label>
                <div className="adp-form-help">
                  When unchecked, this disaster will be hidden from the public donation page but all data and images will be preserved.
                </div>
              </div>

              <div className="adp-form-field adp-form-field-full">
                <label className="adp-form-label">
                  Gallery Images (up to 4)
                </label>
                <div className="adp-gallery-manager-grid">
                  {[0, 1, 2, 3].map((i) => {
                    const existingImage = edit.existingImages?.gallery?.[i];
                    const newFile = edit.galleryFiles?.[i];
                    const hasExistingImage = existingImage && existingImage !== null;
                    const hasNewFile = newFile && newFile !== null;
                    
                    return (
                      <div key={i} className="adp-gallery-slot">
                        <label className="adp-form-label">Image {i + 1}</label>
                        
                        {/* Current/Preview Image */}
                        <div className="adp-image-preview-container">
                          {hasNewFile ? (
                            // Show preview of new file
                            <div className="adp-image-preview-wrapper">
                              <img 
                                src={URL.createObjectURL(newFile)}
                                alt={`New gallery ${i + 1}`}
                                className="adp-image-preview"
                                onLoad={(e) => {
                                  // Clean up object URL to prevent memory leaks
                                  setTimeout(() => URL.revokeObjectURL(e.target.src), 1000);
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  console.error('Failed to load new file preview');
                                }}
                              />
                              <div className="adp-image-label">New Upload</div>
                              <button
                                type="button"
                                className="adp-remove-image-btn"
                                onClick={() => {
                                  setEdit((p) => {
                                    const g = [...(p.galleryFiles || [])];
                                    g[i] = null;
                                    return { ...p, galleryFiles: g };
                                  });
                                }}
                                aria-label={`Remove new image ${i + 1}`}
                              >
                                ×
                              </button>
                            </div>
                          ) : hasExistingImage ? (
                            // Show existing image
                            <div className="adp-image-preview-wrapper">
                              <img 
                                src={toAbs(existingImage)}
                                alt={`Gallery ${i + 1}`}
                                className="adp-image-preview"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  console.error('Failed to load existing image');
                                }}
                              />
                              <div className="adp-image-label">Current</div>
                              <button
                                type="button"
                                className="adp-remove-image-btn"
                                onClick={() => removeExistingImage(i)}
                                aria-label={`Remove gallery image ${i + 1}`}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            // Show placeholder
                            <div className="adp-image-placeholder">
                              <span>No Image</span>
                            </div>
                          )}
                        </div>

                        {/* File Input */}
                        <div className="adp-image-upload-section">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="adp-file-input"
                            id={`gallery-${i}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setEdit((p) => {
                                const g = [...(p.galleryFiles || [])];
                                g[i] = file;
                                return { ...p, galleryFiles: g };
                              });
                              // Clear the input value so the same file can be selected again
                              e.target.value = '';
                            }}
                          />
                          <label htmlFor={`gallery-${i}`} className="adp-file-input-label">
                            {hasExistingImage || hasNewFile ? 'Replace Image' : 'Choose Image'}
                          </label>
                          {hasNewFile && (
                            <span className="adp-file-name">{newFile.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            <div className="adp-modal-actions">
              <button
                type="button"
                className="adp-btn adp-btn-ghost"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="adp-btn adp-btn-primary"
                type="submit"
                form="disaster-edit-form"
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getSeverityClass(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "medium";
  }
}
//