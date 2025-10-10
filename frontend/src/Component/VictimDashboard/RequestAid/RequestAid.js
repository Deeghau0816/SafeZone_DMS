import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RequestAid.css";
import { validateNIC, validatePhone, validateName, validateEmail, validateAddress } from "../utils/validation";

export default function RequestAid() {
  const navigate = useNavigate(); // React Router hook for navigation

  /* ---- Form State Management ---- */
  // Main form data state - stores all user input
  const [form, setForm] = useState({
    name: "",           // Full name of the person requesting aid
    nic: "",            // National Identity Card number
    phoneDigits: "",    // Phone number digits (without country code)
    countryCode: "+94", // Default to Sri Lanka country code
    phone: "",          // Complete phone number (country code + digits)
    email: "",          // Email address for contact
    address: "",        // Home address
    location: "",       // Current location (GPS coordinates or text)
    aidType: "",        // Type of aid needed (Food, Water, Shelter, etc.)
    urgency: "Normal",  // Urgency level (Normal, High, Critical)
    description: "",    // Additional details about the request
  });

  // Error state for form validation messages
  const [errors, setErrors] = useState({});
  // Loading state during form submission
  const [submitting, setSubmitting] = useState(false);
  // Geolocation loading state
  const [geoBusy, setGeoBusy] = useState(false);
  // Geolocation status messages
  const [geoMsg, setGeoMsg] = useState("");

  /* ---- Input Handler Function ---- */
  // Handles all form input changes and updates state accordingly
  const setVal = (e) => {
    const { name, value } = e.target; // Extract field name and value from event

    setForm((f) => {
      const updated = { ...f, [name]: value }; // Create updated form object

      // Special handling for phone number: combine country code + digits
      if (name === "countryCode" || name === "phoneDigits") {
        updated.phone = `${updated.countryCode}${updated.phoneDigits}`;
      }

      return updated;
    });

    // Clear validation error for this field when user starts typing
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  /* ---- Form Validation Function ---- */
  // Validates all form fields and returns error messages
  const validate = () => {
    const er = {}; // Error object to store validation messages

    // Use enhanced validation functions
    const nameValidation = validateName(form.name);
    if (!nameValidation.isValid) er.name = nameValidation.error;
    
    const nicValidation = validateNIC(form.nic);
    if (!nicValidation.isValid) er.nic = nicValidation.error;
    
    const phoneValidation = validatePhone(form.phoneDigits);
    if (!phoneValidation.isValid) er.phone = phoneValidation.error;
    
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) er.email = emailValidation.error;
    
    const addressValidation = validateAddress(form.address);
    if (!addressValidation.isValid) er.address = addressValidation.error;
    
    // Location validation: must be provided
    if (!form.location.trim()) er.location = "Share or type your current location.";
    
    // Aid type validation: must be selected
    if (!form.aidType) er.aidType = "Select the aid type.";
    
    // Urgency validation: must be one of the valid options
    if (!["Normal", "High", "Critical"].includes(form.urgency)) er.urgency = "Choose a valid urgency.";
    
    // Description validation: if provided, must be at least 10 characters
    if (form.description && form.description.trim().length < 10)
      er.description = "Add a bit more detail (min 10 chars) or leave empty.";

    return er; // Return error object
  };

  /* ---- Individual Field Validation Function ---- */
  // Validates a single field and updates error state
  const validateField = (e) => {
    const { name, value } = e.target;
    let error = "";

    switch (name) {
      case "name":
        const nameValidation = validateName(value);
        if (!nameValidation.isValid) error = nameValidation.error;
        break;
      case "nic":
        const nicValidation = validateNIC(value);
        if (!nicValidation.isValid) error = nicValidation.error;
        break;
      case "phoneDigits":
        const phoneValidation = validatePhone(value);
        if (!phoneValidation.isValid) error = phoneValidation.error;
        break;
      case "email":
        const emailValidation = validateEmail(value);
        if (!emailValidation.isValid) error = emailValidation.error;
        break;
      case "address":
        const addressValidation = validateAddress(value);
        if (!addressValidation.isValid) error = addressValidation.error;
        break;
      case "location":
        if (!value.trim()) error = "Share or type your current location.";
        break;
      case "aidType":
        if (!value) error = "Select the aid type.";
        break;
      case "urgency":
        if (!["Normal", "High", "Critical"].includes(value)) error = "Choose a valid urgency.";
        break;
      case "description":
        if (value && value.trim().length < 10) error = "Add a bit more detail (min 10 chars) or leave empty.";
        break;
      default:
        // No validation needed for unknown fields
        break;
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  };

  /* ---- Form Submission Handler ---- */
  // Handles form submission with validation and API call
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    
    // Validate form and get errors
    const er = validate();
    setErrors(er); // Display validation errors
    
    // If there are validation errors, stop submission
    if (Object.keys(er).length) return;

    setSubmitting(true); // Set loading state

    try {
      // Clean and prepare data for API submission
      // Only send the fields that the backend expects
      const payload = {
        name: form.name.trim(),
        nic: form.nic.trim(),
        phone: form.phone.trim(), // This should be the combined countryCode + phoneDigits
        email: form.email.trim(),
        address: form.address.trim(),
        location: form.location.trim(),
        aidType: form.aidType,
        urgency: form.urgency,
        description: form.description.trim() || "",
        requestedAt: new Date().toISOString()
      };

      console.log("Form state:", form); // Debug log
      console.log("Sending payload:", payload); // Debug log

      // Send data to backend API
      await axios.post("http://localhost:5000/aid", payload);

      // Show success message
      alert("Aid request submitted successfully!");

      // Navigate back to dashboard
      navigate("/victim/dashboard");

      // Reset form to initial state (optional since user is navigating away)
      setForm({
        name: "",
        nic: "",
        phoneDigits: "",
        countryCode: "+94",
        phone: "",
        email: "",
        address: "",
        location: "",
        aidType: "",
        urgency: "Normal",
        description: "",
      });
      setErrors({}); // Clear any errors
      setGeoMsg(""); // Clear geolocation messages
    } catch (err) {
      console.error("Aid request error:", err); // Log error for debugging
      
      // Show more specific error message
      let errorMessage = "Error submitting aid request.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = "Please check your form data and try again.";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false); // Always reset loading state
    }
  };

  /* ---- Geolocation Function ---- */
  // Gets user's current location using browser geolocation API
  const useMyLocation = () => {
    // Check if geolocation is supported by the browser
    if (!("geolocation" in navigator)) {
      setGeoMsg("Geolocation not supported in this browser.");
      return;
    }

    setGeoBusy(true); // Set loading state
    setGeoMsg("Getting current position…"); // Show loading message

    // Request current position from browser
    navigator.geolocation.getCurrentPosition(
      // Success callback: location found
      (pos) => {
        const { latitude, longitude } = pos.coords; // Extract coordinates
        const asText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`; // Format as text
        setForm((f) => ({ ...f, location: asText })); // Update form with coordinates
        setErrors((er) => ({ ...er, location: "" })); // Clear location error
        setGeoMsg("Location captured."); // Show success message
        setGeoBusy(false); // Clear loading state
      },
      // Error callback: location access failed
      (err) => {
        console.error(err); // Log error for debugging
        setGeoMsg("Couldn't get location. You can type it manually."); // Show error message
        setGeoBusy(false); // Clear loading state
      },
      // Geolocation options
      { 
        enableHighAccuracy: true, // Request high accuracy
        timeout: 15000,          // 15 second timeout
        maximumAge: 0            // Don't use cached location
      }
    );
  };

  /* ---- Google Maps Integration ---- */
  // Opens the current location in Google Maps in a new tab
  const openInMaps = () => {
    const loc = form.location.trim(); // Get current location from form
    if (!loc) return; // Don't open if no location is set
    
    // Open Google Maps with the location in a new tab
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(loc)}`, "_blank", "noopener,noreferrer");
  };

  /* ---- Field Validation on Blur ---- */
  // Validates a specific field when user leaves it (onBlur event)
  const onBlurValidate = (field) => {
    const er = validate(); // Get all validation errors
    if (er[field]) setErrors((old) => ({ ...old, [field]: er[field] })); // Set error for this field only
  };

  return (
    <main className="page">
      <div className="container">
        <div className="card">
          <div className="aid-header">
            <h1 className="title">Request Aid</h1>
            <button type="button" className="btn btn-secondary back-btn" onClick={() => navigate('/victim/dashboard')}>
               Back
            </button>
          </div>

        {/* Main form for aid request submission */}
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="grid">
            {/* Name Input Field */}
            <div className={`field ${errors.name ? "invalid" : ""}`}>
              <label htmlFor="name">Your Name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={setVal}
                onBlur={() => onBlurValidate("name")}
                placeholder="e.g., Pasindi Alawatta"
                required
              />
              {errors.name && <p className="error-msg">{errors.name}</p>}
            </div>

            {/* NIC (National Identity Card) Input Field */}
            <div className={`field ${errors.nic ? "invalid" : ""}`}>
              <label htmlFor="nic">NIC</label>
              <input
                id="nic"
                name="nic"
                value={form.nic}
                onChange={setVal}
                onBlur={() => onBlurValidate("nic")}
                placeholder="123456789V or 200123456789"
                required
              />
              {errors.nic && <p className="error-msg">{errors.nic}</p>}
            </div>

            {/* Phone Number Input */}
            <div className={`field ${errors.phone ? "invalid" : ""}`}>
              <label htmlFor="phone">Phone</label>
              <div className="phone-row">
                <select
                  className="select code"
                  name="countryCode"
                  value={form.countryCode}
                  onChange={setVal}
                >
                  <option value="+94">+94 (Sri Lanka)</option>
                  <option value="+1">+1 (USA/Canada)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (India)</option>
                  <option value="+81">+81 (Japan)</option>
                  <option value="+61">+61 (Australia)</option>
                  <option value="+49">+49 (Germany)</option>
                  <option value="+33">+33 (France)</option>
                  <option value="+55">+55 (Brazil)</option>
                  <option value="+7">+7 (Russia/Kazakhstan)</option>
                  <option value="+86">+86 (China)</option>
                  <option value="+27">+27 (South Africa)</option>
                  <option value="+82">+82 (South Korea)</option>
                  <option value="+39">+39 (Italy)</option>
                  <option value="+34">+34 (Spain)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+966">+966 (Saudi Arabia)</option>
                  <option value="+64">+64 (New Zealand)</option>
                  <option value="+46">+46 (Sweden)</option>
                  <option value="+31">+31 (Netherlands)</option>
                </select>
                <input
                  className="input digits"
                  id="phone"
                  name="phoneDigits"
                  type="tel"
                  placeholder="7XXXXXXXX"
                  value={form.phoneDigits}
                  onChange={setVal}
                  onBlur={validateField}
                  required
                />
              </div>
              {errors.phone && <p className="error-msg">{errors.phone}</p>}
            </div>

            {/* Email Address Input Field */}
            <div className={`field field--full ${errors.email ? "invalid" : ""}`}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={setVal}
                onBlur={() => onBlurValidate("email")}
                placeholder="you@example.com"
                required
              />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            {/* Home Address Input Field (Full Width) */}
            <div className={`field field--full ${errors.address ? "invalid" : ""}`}>
              <label htmlFor="address">Home Address</label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={setVal}
                onBlur={() => onBlurValidate("address")}
                placeholder="No., Street, City, GN division"
                required
              />
              {errors.address && <p className="error-msg">{errors.address}</p>}
            </div>

            {/* Aid Type Selection Dropdown */}
            <div className={`field ${errors.aidType ? "invalid" : ""}`}>
              <label htmlFor="aidType">Aid Type</label>
              <select
                id="aidType"
                name="aidType"
                value={form.aidType}
                onChange={setVal}
                onBlur={() => onBlurValidate("aidType")}
                required
              >
                <option value="">Select Aid Type</option>
                <option value="Food">Food</option>
                <option value="Water">Water</option>
                <option value="Shelter">Shelter</option>
                <option value="Medical">Medical Help</option>
                <option value="Clothing">Clothing</option>
                <option value="Rescue">Rescue / Evacuation</option>
              </select>
              {errors.aidType && <p className="error-msg">{errors.aidType}</p>}
            </div>

            {/* Urgency Level Selection Dropdown */}
            <div className={`field ${errors.urgency ? "invalid" : ""}`}>
              <label htmlFor="urgency">Urgency</label>
              <select
                id="urgency"
                name="urgency"
                value={form.urgency}
                onChange={setVal}
                onBlur={() => onBlurValidate("urgency")}
                required
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              {errors.urgency && <p className="error-msg">{errors.urgency}</p>}
            </div>

            {/* Current Location Input with Geolocation Features */}
            <div className={`field field--full ${errors.location ? "invalid" : ""}`}>
              <label htmlFor="location">Current Location (auto or manual)</label>
              <div className="row">
                {/* Location Input Field */}
                <input
                  id="location"
                  name="location"
                  className="grow"
                  value={form.location}
                  onChange={setVal}
                  onBlur={() => onBlurValidate("location")}
                  placeholder="Will auto-fill as 'lat, lng' or type a place/landmark"
                  required
                />
                {/* Geolocation Button */}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={useMyLocation}
                  disabled={geoBusy}
                >
                  {geoBusy ? "Locating…" : "Use my location"}
                </button>
                {/* Google Maps Button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openInMaps}
                  disabled={!form.location.trim()}
                  title="Open current location in Google Maps"
                >
                  Open in Maps ↗
                </button>
              </div>
              {/* Geolocation Status Messages */}
              {geoMsg && <p className="hint">{geoMsg}</p>}
              {/* Location Validation Error */}
              {errors.location && <p className="error-msg">{errors.location}</p>}
            </div>

            {/* Additional Details Textarea */}
            <div className={`field field--full ${errors.description ? "invalid" : ""}`}>
              <label htmlFor="description">Additional Details</label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={form.description}
                onChange={setVal}
                onBlur={() => onBlurValidate("description")}
                placeholder="How many people? Any medical needs? Landmarks nearby?"
              />
              {errors.description && <p className="error-msg">{errors.description}</p>}
            </div>
          </div>

          {/* Form Submit Button */}
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </main>
  );
}
