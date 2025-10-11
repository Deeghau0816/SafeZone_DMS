import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

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

  // Function to generate PDF report
  const generateReport = async () => {
    try {
      // Filter only items that are shown on donation page with safe handling
      const visibleItems = items.filter(item => item && item.showOnDonation === true);
      const hiddenItems = items.filter(item => item && item.showOnDonation === false);
      
      // Create PDF report using browser print functionality
      const printWindow = window.open('', '_blank');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Active Disasters Report - ${new Date().toLocaleDateString()}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                line-height: 1.6;
              }
              h1 { 
                color: #2563eb; 
                text-align: center; 
                margin-bottom: 10px;
              }
              .report-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background-color: #f8fafc;
                border-radius: 8px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 30px;
              }
              .stat-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .stat-number {
                font-size: 2rem;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 5px;
              }
              .stat-label {
                color: #6b7280;
                font-size: 0.9rem;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px; 
                font-size: 0.9rem;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left; 
              }
              th { 
                background-color: #f8fafc; 
                font-weight: bold; 
                color: #374151;
              }
              .severity-high { 
                color: #dc2626; 
                background-color: #fee2e2; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-weight: bold;
              }
              .severity-medium { 
                color: #d97706; 
                background-color: #fef3c7; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-weight: bold;
              }
              .severity-low { 
                color: #059669; 
                background-color: #dcfce7; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-weight: bold;
              }
              .needs-tag {
                background-color: #e0e7ff;
                color: #3730a3;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.8rem;
                margin-right: 4px;
                display: inline-block;
                margin-bottom: 2px;
              }
              .section-title {
                font-size: 1.2rem;
                font-weight: bold;
                color: #374151;
                margin: 30px 0 15px 0;
                padding-bottom: 5px;
                border-bottom: 2px solid #e5e7eb;
              }
              .footer { 
                margin-top: 40px; 
                text-align: center; 
                color: #6b7280; 
                font-size: 12px; 
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
              @media print {
                body { margin: 0; }
                .stats-grid { grid-template-columns: repeat(3, 1fr); }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>🚨 Active Disasters Report</h1>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Report Period:</strong> Current Active Disasters</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${items.length}</div>
                <div class="stat-label">Total Disasters</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${visibleItems.length}</div>
                <div class="stat-label">Visible on Website</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${hiddenItems.length}</div>
                <div class="stat-label">Hidden from Website</div>
              </div>
            </div>
            
            ${visibleItems.length > 0 ? `
              <div class="section-title">🌐 Disasters Visible on Donation Website</div>
              <table>
                <thead>
                  <tr>
                    <th>Disaster Name</th>
                    <th>City</th>
                    <th>Severity</th>
                    <th>Needs</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  ${visibleItems.map(item => {
                    const needsArray = item.needs ? (Array.isArray(item.needs) ? item.needs : item.needs.split(',')) : [];
                    const needsTags = needsArray.map(need => `<span class="needs-tag">${need.trim()}</span>`).join('');
                    
                    return `
                      <tr>
                        <td><strong>${safeGetProperty(item, 'name', 'Untitled')}</strong></td>
                        <td>${safeGetProperty(item, 'city', 'Unknown')}</td>
                        <td><span class="severity-${safeGetProperty(item, 'severity', 'medium').toLowerCase()}">${safeGetProperty(item, 'severity', 'Medium').toUpperCase()}</span></td>
                        <td>${needsTags || '-'}</td>
                        <td>${safeGetProperty(item, 'summary', 'No summary available')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : ''}
            
            ${hiddenItems.length > 0 ? `
              <div class="section-title">🔒 Hidden Disasters (Not Shown on Website)</div>
              <table>
                <thead>
                  <tr>
                    <th>Disaster Name</th>
                    <th>City</th>
                    <th>Severity</th>
                    <th>Needs</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  ${hiddenItems.map(item => {
                    const needsArray = item.needs ? (Array.isArray(item.needs) ? item.needs : item.needs.split(',')) : [];
                    const needsTags = needsArray.map(need => `<span class="needs-tag">${need.trim()}</span>`).join('');
                    
                    return `
                      <tr>
                        <td><strong>${safeGetProperty(item, 'name', 'Untitled')}</strong></td>
                        <td>${safeGetProperty(item, 'city', 'Unknown')}</td>
                        <td><span class="severity-${safeGetProperty(item, 'severity', 'medium').toLowerCase()}">${safeGetProperty(item, 'severity', 'Medium').toUpperCase()}</span></td>
                        <td>${needsTags || '-'}</td>
                        <td>${safeGetProperty(item, 'summary', 'No summary available')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : ''}
            
            <div class="footer">
              <p>Generated by SafeZone DMS - Disaster Management System</p>
              <p>This report contains ${items.length} total disaster entries as of ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
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
      <div style={{
        padding: '24px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header and Search */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1e293b',
              margin: '0 0 8px 0',
              lineHeight: '1.2'
            }}>Active Disasters</h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0',
              lineHeight: '1.5'
            }}>
              Create, edit, and manage items shown on the Donation page. Use the toggle to show/hide disasters without deleting data.
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={openCreateForm}
              style={{
                padding: '12px 20px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2563eb';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '16px' }}>+</span>
              New disaster
            </button>

            {/* Report Button */}
            <button
              onClick={generateReport}
              style={{
                padding: '12px 20px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#059669';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#10b981';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '16px' }}>📊</span>
              Generate Report
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              placeholder="Search by name, city, summary, or need…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                minWidth: '300px',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
              }}
            />
            <button
              onClick={() => setQ("")}
              aria-label="Reset Search"
              style={{
                padding: '12px 16px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f1f5f9';
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {err && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b',
            fontSize: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '12px'
            }}></div>
            Loading disasters…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b',
            fontSize: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            {q ? "No disasters match your search." : "No disasters found."}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            {/* Top mirrored horizontal scrollbar */}
            {showTopScroll && (
              <div
                ref={topScrollRef}
                aria-hidden="true"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  height: '17px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <div ref={topInnerRef} style={{ height: '1px' }} />
              </div>
            )}

            <div ref={tableWrapRef} style={{
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: '70vh'
            }}>
              <table style={{
                width: '100%',
                minWidth: '1200px',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '200px'
                    }}>Name</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '120px'
                    }}>City</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '200px'
                    }}>Needs</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '100px'
                    }}>Severity</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '150px'
                    }}>Actions</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '120px'
                    }}>Gallery Image 1</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '120px'
                    }}>Gallery Image 2</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '120px'
                    }}>Gallery Image 3</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '120px'
                    }}>Gallery Image 4</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => {
                    const needsArray = Array.isArray(x.needs) ? x.needs : [];
                    
                    return (
                      <tr key={x._id} style={{
                        backgroundColor: x.showOnDonation === false ? '#fef3c7' : '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = x.showOnDonation === false ? '#fde68a' : '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = x.showOnDonation === false ? '#fef3c7' : '#ffffff';
                      }}>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {safeGetProperty(x, 'name', 'Untitled')}
                            {x.showOnDonation === false && (
                              <span style={{
                                backgroundColor: '#f59e0b',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>Hidden</span>
                            )}
                          </div>
                          <div style={{
                            color: '#64748b',
                            fontSize: '13px',
                            lineHeight: '1.4'
                          }}>{safeGetProperty(x, 'summary', '')}</div>
                        </td>
                        <td style={{
                          padding: '16px 12px',
                          color: '#374151'
                        }}>{safeGetProperty(x, 'city', 'Unknown')}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px'
                          }}>
                            {needsArray.slice(0, 3).map((n, i) => (
                              <span key={i} style={{
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                {n}
                              </span>
                            ))}
                            {needsArray.length > 3 && (
                              <span style={{
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                +{needsArray.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              ...(getSeverityClass(x.severity) === 'critical' ? {
                                backgroundColor: '#fee2e2',
                                color: '#991b1b'
                              } : getSeverityClass(x.severity) === 'high' ? {
                                backgroundColor: '#fef3c7',
                                color: '#92400e'
                              } : getSeverityClass(x.severity) === 'medium' ? {
                                backgroundColor: '#dbeafe',
                                color: '#1e40af'
                              } : {
                                backgroundColor: '#dcfce7',
                                color: '#166534'
                              })
                            }}
                          >
                            {safeGetProperty(x, 'severity', 'Medium')}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                          }}>
                            <button
                              onClick={() => openEdit(x)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#2563eb';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#3b82f6';
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(x._id)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#dc2626';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#ef4444';
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          {x.images?.gallery?.[0] ? (
                            <img
                              src={toAbs(x.images.gallery[0])}
                              alt={`Gallery Image 1 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              style={{
                                width: '80px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '80px',
                              height: '60px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: '12px'
                            }}>No Image</div>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          {x.images?.gallery?.[1] ? (
                            <img
                              src={toAbs(x.images.gallery[1])}
                              alt={`Gallery Image 2 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              style={{
                                width: '80px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '80px',
                              height: '60px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: '12px'
                            }}>No Image</div>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          {x.images?.gallery?.[2] ? (
                            <img
                              src={toAbs(x.images.gallery[2])}
                              alt={`Gallery Image 3 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              style={{
                                width: '80px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '80px',
                              height: '60px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: '12px'
                            }}>No Image</div>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          {x.images?.gallery?.[3] ? (
                            <img
                              src={toAbs(x.images.gallery[3])}
                              alt={`Gallery Image 4 for ${safeGetProperty(x, 'name', 'disaster')}`}
                              style={{
                                width: '80px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '80px',
                              height: '60px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: '12px'
                            }}>No Image</div>
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
          onClick={scrollToTop}
          aria-label="Scroll to top"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '48px',
            height: '48px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s ease',
            opacity: showScrollTop ? 1 : 0,
            visibility: showScrollTop ? 'visible' : 'hidden',
            transform: showScrollTop ? 'translateY(0)' : 'translateY(10px)',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2563eb';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
            e.target.style.transform = showScrollTop ? 'translateY(0)' : 'translateY(10px)';
          }}
        >
          ↑
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div onClick={closeEdit} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '24px 24px 0 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0
              }}>Edit disaster</h3>
              <button
                onClick={closeEdit}
                aria-label="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '20px',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#64748b';
                }}
              >
                ×
              </button>
            </div>

            <form
              ref={formRef}
              onSubmit={saveEdit}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px'
              }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>Name</label>
                  <input
                    ref={firstInputRef}
                    value={safeGetProperty(edit, 'name', '')}
                    onChange={(e) =>
                      setEdit((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>City</label>
                  <input
                    value={safeGetProperty(edit, 'city', '')}
                    onChange={(e) =>
                      setEdit((p) => ({ ...p, city: e.target.value }))
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>Summary</label>
                <textarea
                  rows={3}
                  value={safeGetProperty(edit, 'summary', '')}
                  onChange={(e) =>
                    setEdit((p) => ({ ...p, summary: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Top needs (comma-separated)
                </label>
                <input
                  value={safeGetProperty(edit, 'needsCSV', '')}
                  onChange={(e) =>
                    setEdit((p) => ({ ...p, needsCSV: e.target.value }))
                  }
                  placeholder="e.g., Water, Food, Medical supplies"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>Accent color</label>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="color"
                      value={safeGetProperty(edit, 'accentColor', '#16a34a')}
                      onChange={(e) =>
                        setEdit((p) => ({ ...p, accentColor: e.target.value }))
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      value={safeGetProperty(edit, 'accentColor', '#16a34a')}
                      onChange={(e) =>
                        setEdit((p) => ({ ...p, accentColor: e.target.value }))
                      }
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>Severity</label>
                  <select
                    value={safeGetProperty(edit, 'severity', 'Medium')}
                    onChange={(e) =>
                      setEdit((p) => ({ ...p, severity: e.target.value }))
                    }
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={edit.active === true}
                    onChange={(e) =>
                      setEdit((p) => ({
                        ...p,
                        active: e.target.checked,
                      }))
                    }
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Disaster is active</span>
                </label>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={edit.showOnDonation === true}
                    onChange={(e) =>
                      setEdit((p) => ({
                        ...p,
                        showOnDonation: e.target.checked,
                      }))
                    }
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Show on Donation page</span>
                </label>
                <div style={{
                  fontSize: '13px',
                  color: '#64748b',
                  marginLeft: '24px',
                  lineHeight: '1.4'
                }}>
                  When unchecked, this disaster will be hidden from the public donation page but all data and images will be preserved.
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '16px'
                }}>
                  Gallery Images (up to 4)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  {[0, 1, 2, 3].map((i) => {
                    const existingImage = edit.existingImages?.gallery?.[i];
                    const newFile = edit.galleryFiles?.[i];
                    const hasExistingImage = existingImage && existingImage !== null;
                    const hasNewFile = newFile && newFile !== null;
                    
                    return (
                      <div key={i} style={{
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: '#f8fafc'
                      }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '12px'
                        }}>Image {i + 1}</label>
                        
                        {/* Current/Preview Image */}
                        <div style={{ marginBottom: '12px' }}>
                          {hasNewFile ? (
                            // Show preview of new file
                            <div style={{ position: 'relative' }}>
                              <img 
                                src={URL.createObjectURL(newFile)}
                                alt={`New gallery ${i + 1}`}
                                style={{
                                  width: '100%',
                                  height: '120px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0'
                                }}
                                onLoad={(e) => {
                                  // Clean up object URL to prevent memory leaks
                                  setTimeout(() => URL.revokeObjectURL(e.target.src), 1000);
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  console.error('Failed to load new file preview');
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>New Upload</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEdit((p) => {
                                    const g = [...(p.galleryFiles || [])];
                                    g[i] = null;
                                    return { ...p, galleryFiles: g };
                                  });
                                }}
                                aria-label={`Remove new image ${i + 1}`}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  width: '24px',
                                  height: '24px',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : hasExistingImage ? (
                            // Show existing image
                            <div style={{ position: 'relative' }}>
                              <img 
                                src={toAbs(existingImage)}
                                alt={`Gallery ${i + 1}`}
                                style={{
                                  width: '100%',
                                  height: '120px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  console.error('Failed to load existing image');
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                backgroundColor: '#3b82f6',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>Current</div>
                              <button
                                type="button"
                                onClick={() => removeExistingImage(i)}
                                aria-label={`Remove gallery image ${i + 1}`}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  width: '24px',
                                  height: '24px',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            // Show placeholder
                            <div style={{
                              width: '100%',
                              height: '120px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}>
                              No Image
                            </div>
                          )}
                        </div>

                        {/* File Input */}
                        <div>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
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
                            style={{ display: 'none' }}
                          />
                          <label htmlFor={`gallery-${i}`} style={{
                            display: 'block',
                            padding: '8px 12px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#3b82f6';
                          }}>
                            {hasExistingImage || hasNewFile ? 'Replace Image' : 'Choose Image'}
                          </label>
                          {hasNewFile && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#64748b',
                              textAlign: 'center',
                              wordBreak: 'break-all'
                            }}>{newFile.name}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            <div style={{
              padding: '24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: saving ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = '#f8fafc';
                    e.target.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="disaster-edit-form"
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: saving ? '#94a3b8' : '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {saving ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Saving…
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '16px' }}>💾</span>
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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