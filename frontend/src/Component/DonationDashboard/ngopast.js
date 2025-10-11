import React, { useState, useEffect } from "react";
import "./donationcss/ngopast.css";

const API_BASE = "http://localhost:5000/api";
const UPLOAD_BASE = "http://localhost:5000";

export default function NgoPastForm() {
  const [note, setNote] = useState("");
  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [editImages, setEditImages] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [newEditImages, setNewEditImages] = useState([]);
  const [newEditImagePreviews, setNewEditImagePreviews] = useState([]);

  useEffect(() => {
    loadRecords();
  }, []);

  // -------- REPORT HELPERS --------
  const downloadTextFile = (filename, text) => {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toCsv = (rows) => {
    const escape = (v) => {
      const s = v == null ? "" : String(v).replace(/\r?\n|\r/g, " ");
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    return rows.map((r) => r.map(escape).join(",")).join("\n");
  };

  const handleExportCsv = () => {
    const header = ["Date", "Note", "Image Count", "Image URLs"]; 
    const rows = records.map((r) => [
      r.date ? new Date(r.date).toLocaleString() : "",
      r.note || "",
      (r.images || []).length,
      (r.images || []).map((img) => `${UPLOAD_BASE}${img.imageUrl}`).join(" | "),
    ]);
    const csv = toCsv([header, ...rows]);
    downloadTextFile(`ngopast_report_${new Date().toISOString().slice(0,10)}.csv`, csv);
  };

  const handlePrint = () => {
    window.print();
  };

  const loadRecords = async () => {
    try {
      const res = await fetch(`${API_BASE}/ngopast`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load records");
    }
  };

  // -------- ADD NEW validations --------
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 2) {
      alert("You can only upload a maximum of 2 images.");
      return;
    }
     for (const file of files) {
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image size must be under 5MB.");
      return;
    }
  }
    setImages([...images, ...files]);
    setImagePreviewUrls((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImages(images.filter((_, i) => i !== index));
    setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("note", note);
      images.forEach((image) => formData.append("images", image));

      const res = await fetch(`${API_BASE}/ngopast`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setRecords([data, ...records]);
        setNote("");
        setImages([]);
        setImagePreviewUrls([]);
        alert("Record saved successfully!");
      } else {
        alert(data.message || "Error saving record");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------- DELETE --------
  const deleteRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      const res = await fetch(`${API_BASE}/ngopast/${recordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecords(records.filter((r) => r._id !== recordId));
        alert("Record deleted successfully!");
      } else {
        alert("Failed to delete record");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting record");
    }
  };

  // -------- EDIT --------
  const startEdit = (record) => {
    setEditingRecord(record._id);
    setEditNote(record.note);
    setEditImages(record.images || []);
    setEditImagePreviews(
      record.images ? record.images.map((img) => `${UPLOAD_BASE}${img.imageUrl}`) : []
    );
    setNewEditImages([]);
    setNewEditImagePreviews([]);
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditNote("");
    setEditImages([]);
    setEditImagePreviews([]);
    newEditImagePreviews.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setNewEditImages([]);
    setNewEditImagePreviews([]);
  };

  const handleEditImageChange = (e) => {
  const files = Array.from(e.target.files);

  if (files.length + editImages.length + newEditImages.length > 2) {
    alert("You can only upload a maximum of 2 images.");
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image size must be under 5MB.");
      return;
    }
  }

  setNewEditImages([...newEditImages, ...files]);
  setNewEditImagePreviews((prev) => [
    ...prev,
    ...files.map((file) => URL.createObjectURL(file)),
  ]);
};


  const removeEditImage = (index, isExisting = true) => {
    if (isExisting) {
      setEditImages(editImages.filter((_, i) => i !== index));
      setEditImagePreviews(editImagePreviews.filter((_, i) => i !== index));
    } else {
      if (newEditImagePreviews[index]?.startsWith("blob:")) {
        URL.revokeObjectURL(newEditImagePreviews[index]);
      }
      setNewEditImages(newEditImages.filter((_, i) => i !== index));
      setNewEditImagePreviews(newEditImagePreviews.filter((_, i) => i !== index));
    }
  };

  const replaceEditImage = (file, index) => {
    const newUrl = URL.createObjectURL(file);
    const updatedPreviews = [...editImagePreviews];
    updatedPreviews[index] = newUrl;

    const updatedImages = [...newEditImages];
    updatedImages[index] = file;

    setEditImagePreviews(updatedPreviews);
    setNewEditImages(updatedImages);
  };

  const saveEdit = async (recordId) => {
    try {
      const formData = new FormData();
      formData.append("note", editNote);

      // keep unremoved images
      editImages.forEach((img) => {
        formData.append("existingImages", JSON.stringify(img));
      });

      // add new/replace images
      newEditImages.forEach((img) => {
        formData.append("images", img);
      });

      const res = await fetch(`${API_BASE}/ngopast/${recordId}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        setRecords(records.map((r) => (r._id === recordId ? updated : r)));
        cancelEdit();
        alert("Record updated successfully!");
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to update record");
      }
    } catch (err) {
      console.error("Edit error:", err);
      alert("Error updating record");
    }
  };

  // -------- RENDER --------
  return (
    <div className="ngopast-component">
      <div className="ngo-container">
        <div className="ngo-wrapper">
        <div className="ngo-header" style={{ position: "relative" }}>
          <div style={{ position: "absolute", right: 0, top: 0, display: "flex", gap: 8 }}>
            <button onClick={handleExportCsv} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e0", background: "#fff", cursor: "pointer" }}>⬇️ Export CSV</button>
            <button onClick={handlePrint} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e0", background: "#fff", cursor: "pointer" }}>🖨️ Print</button>
          </div>
          <h1 className="ngo-title">NGO Past Records</h1>
          <p className="ngo-subtitle">
            Document and preserve your organization's impactful moments
          </p>
        </div>

        {/* ADD FORM */}
        <div className="ngo-form-card">
          <div className="ngo-form-header">
            <span className="ngo-icon">📝</span>
            <h2 className="ngo-form-title">Add New Record</h2>
          </div>
          <div className="ngo-form-content">
            <div className="ngo-input-group">
              <label className="ngo-label">Record Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="4"
                className="ngo-textarea"
                placeholder="Describe activities or events..."
              />
            </div>

            <div className="ngo-upload-section">
              <label className="ngo-label">Upload Images (Maximum 2)</label>
              {images.length < 2 && (
                <div className="ngo-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="ngo-file-input"
                  />
                  <div className="ngo-upload-box">
                    <span className="ngo-upload-icon">📤</span>
                    <p className="ngo-upload-text">Click to upload</p>
                  </div>
                </div>
              )}

              {imagePreviewUrls.length > 0 && (
                <div className="ngo-image-grid">
                  {imagePreviewUrls.map((url, i) => (
                    <div key={i} className="ngo-image-preview">
                      <img src={url} alt="" className="ngo-preview-img" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="ngo-remove-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || images.length === 0}
              className={`ngo-submit-btn ${
                isSubmitting || images.length === 0 ? "disabled" : ""
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </div>

        {/* RECORDS */}
        <div className="ngo-records-card">
          <div className="ngo-records-header">
            <span className="ngo-icon">📅</span>
            <h2 className="ngo-records-title">Past Records</h2>
          </div>

          {error && <div className="ngo-error">{error}</div>}

          {records.length > 0 ? (
            <div className="ngo-records-list">
              {records.map((record) => (
                <div key={record._id} className="ngo-record-item">
                  <div className="ngo-record-header">
                    <div className="ngo-record-date">
                      📅 {record.date ? new Date(record.date).toLocaleString() : ""}
                    </div>
                    <div className="ngo-record-actions">
                      {editingRecord === record._id ? (
                        <>
                          <button onClick={() => saveEdit(record._id)}>💾</button>
                          <button onClick={cancelEdit}>❌</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(record)}>✏️</button>
                          <button onClick={() => deleteRecord(record._id)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingRecord === record._id ? (
                    <>
                      <textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="ngo-edit-textarea"
                      />

                      <div className="ngo-images-grid">
                        {editImagePreviews.map((url, i) => (
                          <div key={i} className="ngo-image-wrapper">
                            <img src={url} alt="" className="ngo-record-img" />
                            <div className="ngo-image-overlay">
                              <label className="ngo-replace-btn">
                                🔄 Replace
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    e.target.files[0] &&
                                    replaceEditImage(e.target.files[0], i)
                                  }
                                  style={{ display: "none" }}
                                />
                              </label>
                              <button onClick={() => removeEditImage(i, true)}>✕</button>
                            </div>
                          </div>
                        ))}

                        {newEditImagePreviews.map((url, i) => (
                          <div key={i} className="ngo-image-wrapper">
                            <img src={url} alt="" className="ngo-record-img" />
                            <button onClick={() => removeEditImage(i, false)}>✕</button>
                          </div>
                        ))}

                        {editImages.length + newEditImages.length < 2 && (
                          <div className="ngo-add-more">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleEditImageChange}
                              className="ngo-file-input"
                            />
                            <div className="ngo-add-more-box">➕ Add image</div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{record.note}</p>
                      {record.images && (
                        <div className="ngo-images-grid">
                          {record.images.map((img, i) => (
                            <img
                              key={i}
                              src={`${UPLOAD_BASE}${img.imageUrl}`}
                              alt=""
                              className="ngo-record-img"
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>No records yet.</div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
