import * as React from "react";
import { useState, useEffect } from "react";
import { Map as MapboxMap, Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import "./popup.css";

import LocationPinIcon from "@mui/icons-material/LocationPin";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import DeleteIcon from "@mui/icons-material/Delete";
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DirectionsIcon from "@mui/icons-material/Directions";

function Map() {
  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [pins, setPins] = useState([]);
  const [newPlace, setNewPlace] = useState(null);
  
  // Shelter-related state
  const [shelters, setShelters] = useState([]);
  const [nearestShelter, setNearestShelter] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [directions, setDirections] = useState(null);
  const [selectedShelterId, setSelectedShelterId] = useState(null);

  // form data for creating a pin
  const [createFormData, setCreateFormData] = useState({
    place: "",
    disaster: "",
    info: "",
    createdBy: "",
    severity: "",
  });

  // form data for editing a pin
  const [editFormData, setEditFormData] = useState({
    place: "",
    disaster: "",
    info: "",
    createdBy: "",
    severity: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Validation states
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload states
  const [createFiles, setCreateFiles] = useState({
    images: [],
    videos: [],
  });
  const [editFiles, setEditFiles] = useState({
    images: [],
    videos: [],
  });

  // Get user's current location with high accuracy
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          });
          setAccuracy(position.coords.accuracy);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  // Fetch pins from backend
  useEffect(() => {
    const getPins = async () => {
      try {
        const res = await axios.get("http://localhost:5000/pins");
        const pinsData = res.data.data || [];
        
        // Log for debugging
        console.log("Fetched pins:", pinsData);
        
        // Filter out invalid pins before setting state
        const validPins = pinsData.filter((pin) => {
          if (!pin || !pin._id) return false;
          
          // Check if pin has all required properties
          if (!pin.place || !pin.disaster || !pin.info || !pin.createdBy) {
            console.warn("Pin missing required properties:", pin);
            return false;
          }
          
          const hasValidCoords = 
            typeof pin.longitude === 'number' && 
            typeof pin.latitude === 'number' && 
            !isNaN(pin.longitude) && 
            !isNaN(pin.latitude) &&
            pin.longitude >= -180 && 
            pin.longitude <= 180 &&
            pin.latitude >= -90 && 
            pin.latitude <= 90;
            
          if (!hasValidCoords) {
            console.warn("Invalid pin coordinates:", pin);
            return false;
          }
          
          return true;
        });
        
        console.log("Valid pins:", validPins);
        setPins(validPins);
      } catch (err) {
        console.error("Error fetching pins:", err);
        setPins([]);
      }
    };
    getPins();
  }, []);

  // Fetch shelters from backend
  useEffect(() => {
    const getShelters = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/shelters");
        const sheltersData = res.data.data || [];
        
        console.log("Fetched shelters:", sheltersData);
        
        // Filter out invalid shelters
        const validShelters = sheltersData.filter((shelter) => {
          if (!shelter || !shelter._id) return false;
          
          const hasValidCoords = 
            typeof shelter.longitude === 'number' && 
            typeof shelter.latitude === 'number' && 
            !isNaN(shelter.longitude) && 
            !isNaN(shelter.latitude) &&
            shelter.longitude >= -180 && 
            shelter.longitude <= 180 &&
            shelter.latitude >= -90 && 
            shelter.latitude <= 90;
          
          if (!hasValidCoords) {
            console.warn("Shelter has invalid coordinates:", shelter);
            return false;
          }
          
          return true;
        });
        
        console.log("Valid shelters:", validShelters);
        setShelters(validShelters);
      } catch (err) {
        console.error("Error fetching shelters:", err);
        setShelters([]);
      }
    };
    getShelters();
  }, []);

  // Handle marker click
  const handleMarkerClick = (pinId) => {
    setSelectedPinId((prev) => (prev === pinId ? null : pinId));
    setIsEditing(false);
  };

  // Handle double-click to add location
  const handleAddClick = (e) => {
    const { lng, lat } = e.lngLat;
    setNewPlace({
      longitude: lng,
      latitude: lat,
    });
  };

  // Validation functions
  const validateForm = (formData, files = {}) => {
    const errors = {};

    // Place validation
    if (!formData.place.trim()) {
      errors.place = "Place name is required";
    } else if (formData.place.trim().length < 2) {
      errors.place = "Place name must be at least 2 characters";
    } else if (formData.place.trim().length > 50) {
      errors.place = "Place name must be less than 50 characters";
    }

    // Disaster validation
    if (!formData.disaster.trim()) {
      errors.disaster = "Disaster type is required";
    } else if (formData.disaster.trim().length < 2) {
      errors.disaster = "Disaster type must be at least 2 characters";
    } else if (formData.disaster.trim().length > 30) {
      errors.disaster = "Disaster type must be less than 30 characters";
    }

    // Info validation
    if (formData.info.trim().length > 500) {
      errors.info = "Additional info must be less than 500 characters";
    }

    // CreatedBy validation
    if (!formData.createdBy.trim()) {
      errors.createdBy = "Your name is required";
    } else if (formData.createdBy.trim().length < 2) {
      errors.createdBy = "Name must be at least 2 characters";
    } else if (formData.createdBy.trim().length > 30) {
      errors.createdBy = "Name must be less than 30 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.createdBy.trim())) {
      errors.createdBy = "Name can only contain letters and spaces";
    }

    // Severity validation
    if (!formData.severity) {
      errors.severity = "Severity level is required";
    } else if (!["Low", "Moderate", "High", "Critical"].includes(formData.severity)) {
      errors.severity = "Invalid severity level";
    }

    // File validation
    if (files.images && files.images.length > 0) {
      files.images.forEach((file, index) => {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          errors[`image_${index}`] = `Image ${index + 1} is too large (max 1MB)`;
        }
        if (!file.type.startsWith('image/')) {
          errors[`image_${index}`] = `File ${index + 1} is not a valid image`;
        }
      });
      if (files.images.length > 5) {
        errors.images = "Maximum 5 images allowed";
      }
    }

    if (files.videos && files.videos.length > 0) {
      files.videos.forEach((file, index) => {
        if (file.size > 50 * 1024 * 1024) { 
          errors[`video_${index}`] = `Video ${index + 1} is too large (max 15MB)`;
        }
        if (!file.type.startsWith('video/')) {
          errors[`video_${index}`] = `File ${index + 1} is not a valid video`;
        }
      });
      if (files.videos.length > 3) {
        errors.videos = "Maximum 3 videos allowed";
      }
    }

    return errors;
  };

  // Handle form input change (create)
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (createErrors[name]) {
      setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle form input change (edit)
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle file selection (create)
  const handleCreateFileChange = (e) => {
    const { name, files } = e.target;
    const fileArray = Array.from(files);
    setCreateFiles((prev) => ({ ...prev, [name]: fileArray }));
    
    // Validate files
    const errors = validateForm(createFormData, { ...createFiles, [name]: fileArray });
    setCreateErrors((prev) => ({ ...prev, ...errors }));
  };

  // Handle file selection (edit)
  const handleEditFileChange = (e) => {
    const { name, files } = e.target;
    const fileArray = Array.from(files);
    setEditFiles((prev) => ({ ...prev, [name]: fileArray }));
    
    // Validate files
    const errors = validateForm(editFormData, { ...editFiles, [name]: fileArray });
    setEditErrors((prev) => ({ ...prev, ...errors }));
  };

  // Handle form submit (create new pin)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate form
    const errors = validateForm(createFormData, createFiles);
    setCreateErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("place", createFormData.place.trim());
    formData.append("disaster", createFormData.disaster.trim());
    formData.append("info", createFormData.info.trim());
    formData.append("createdBy", createFormData.createdBy.trim());
    formData.append("severity", createFormData.severity);
    formData.append("longitude", newPlace.longitude);
    formData.append("latitude", newPlace.latitude);

    // Append image files
    createFiles.images.forEach((file) => {
      formData.append("images", file);
    });

    // Append video files
    createFiles.videos.forEach((file) => {
      formData.append("videos", file);
    });

    try {
      console.log("Sending pin creation request with data:", {
        place: createFormData.place,
        disaster: createFormData.disaster,
        info: createFormData.info,
        createdBy: createFormData.createdBy,
        severity: createFormData.severity,
        longitude: newPlace.longitude,
        latitude: newPlace.latitude,
        images: createFiles.images.length,
        videos: createFiles.videos.length
      });
      
      const res = await axios.post("http://localhost:5000/pins", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Validate the new pin data before adding to state
      const newPin = res.data.data;
      if (newPin && newPin._id && 
          typeof newPin.longitude === 'number' && 
          typeof newPin.latitude === 'number' && 
          !isNaN(newPin.longitude) && 
          !isNaN(newPin.latitude)) {
        setPins([...pins, newPin]);
      } else {
        console.warn("Invalid new pin data:", newPin);
        // Refresh the pins list as fallback
        const refreshPins = async () => {
          try {
            const res = await axios.get("http://localhost:5000/pins");
            const pinsData = res.data.data || [];
            const validPins = pinsData.filter((pin) => {
              if (!pin || !pin._id) return false;
              if (!pin.place || !pin.disaster || !pin.info || !pin.createdBy) return false;
              const hasValidCoords = 
                typeof pin.longitude === 'number' && 
                typeof pin.latitude === 'number' && 
                !isNaN(pin.longitude) && 
                !isNaN(pin.latitude) &&
                pin.longitude >= -180 && 
                pin.longitude <= 180 &&
                pin.latitude >= -90 && 
                pin.latitude <= 90;
              return hasValidCoords;
            });
            setPins(validPins);
          } catch (err) {
            console.error("Error refreshing pins:", err);
          }
        };
        refreshPins();
      }
      setNewPlace(null);
      setCreateFormData({ place: "", disaster: "", info: "", createdBy: "", severity: "" });
      setCreateFiles({ images: [], videos: [] });
      setCreateErrors({});
    } catch (err) {
      console.error("Error creating pin:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Error creating pin";
      alert("Error creating pin: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete pin
  const handleDelete = async (pinId) => {
    if (!window.confirm("Are you sure you want to delete this pin?")) return;
    try {
      await axios.delete(`http://localhost:5000/pins/${pinId}`);
      setPins((prevPins) => prevPins.filter((p) => p._id !== pinId));
      setSelectedPinId(null);
    } catch (err) {
      console.error("Error deleting pin:", err);
    }
  };

  // Handle delete specific file
  const handleDeleteFile = async (pinId, type, index) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      console.log(`Deleting ${type} file at index ${index} for pin ${pinId}`);
      const res = await axios.delete(
        `http://localhost:5000/pins/${pinId}/file/${type}/${index}`
      );
      
      console.log("File deletion response:", res.data);
      
      // Validate the updated pin data before updating state
      const updatedPin = res.data.data;
      if (updatedPin && updatedPin._id && 
          typeof updatedPin.longitude === 'number' && 
          typeof updatedPin.latitude === 'number' && 
          !isNaN(updatedPin.longitude) && 
          !isNaN(updatedPin.latitude)) {
        console.log("Updating pin with valid data:", updatedPin);
        setPins((prevPins) =>
          prevPins.map((p) => (p._id === pinId ? updatedPin : p))
        );
      } else {
        console.warn("Invalid updated pin data after file deletion:", updatedPin);
        // Refresh the pins list as fallback
        const refreshPins = async () => {
          try {
            console.log("Refreshing pins list as fallback...");
            const res = await axios.get("http://localhost:5000/pins");
            const pinsData = res.data.data || [];
            const validPins = pinsData.filter((pin) => {
              if (!pin || !pin._id) return false;
              if (!pin.place || !pin.disaster || !pin.info || !pin.createdBy) return false;
              const hasValidCoords = 
                typeof pin.longitude === 'number' && 
                typeof pin.latitude === 'number' && 
                !isNaN(pin.longitude) && 
                !isNaN(pin.latitude) &&
                pin.longitude >= -180 && 
                pin.longitude <= 180 &&
                pin.latitude >= -90 && 
                pin.latitude <= 90;
              return hasValidCoords;
            });
            console.log("Refreshed pins:", validPins);
            setPins(validPins);
          } catch (err) {
            console.error("Error refreshing pins after file deletion:", err);
          }
        };
        refreshPins();
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  // Handle update pin
  const handleUpdate = async (e, pinId) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate form
    const errors = validateForm(editFormData, editFiles);
    setEditErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("place", editFormData.place.trim());
    formData.append("disaster", editFormData.disaster.trim());
    formData.append("info", editFormData.info.trim());
    formData.append("createdBy", editFormData.createdBy.trim());
    formData.append("severity", editFormData.severity);

    // Append new image files
    editFiles.images.forEach((file) => {
      formData.append("images", file);
    });

    // Append new video files
    editFiles.videos.forEach((file) => {
      formData.append("videos", file);
    });

    try {
      const res = await axios.put(
        `http://localhost:5000/pins/${pinId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Validate the updated pin data before updating state
      const updatedPin = res.data.data;
      if (updatedPin && updatedPin._id && 
          typeof updatedPin.longitude === 'number' && 
          typeof updatedPin.latitude === 'number' && 
          !isNaN(updatedPin.longitude) && 
          !isNaN(updatedPin.latitude)) {
        setPins((prevPins) =>
          prevPins.map((p) => (p._id === pinId ? updatedPin : p))
        );
      } else {
        console.warn("Invalid updated pin data:", updatedPin);
        // Refresh the pins list as fallback
        const refreshPins = async () => {
          try {
            const res = await axios.get("http://localhost:5000/pins");
            const pinsData = res.data.data || [];
            const validPins = pinsData.filter((pin) => {
              if (!pin || !pin._id) return false;
              if (!pin.place || !pin.disaster || !pin.info || !pin.createdBy) return false;
              const hasValidCoords = 
                typeof pin.longitude === 'number' && 
                typeof pin.latitude === 'number' && 
                !isNaN(pin.longitude) && 
                !isNaN(pin.latitude) &&
                pin.longitude >= -180 && 
                pin.longitude <= 180 &&
                pin.latitude >= -90 && 
                pin.latitude <= 90;
              return hasValidCoords;
            });
            setPins(validPins);
          } catch (err) {
            console.error("Error refreshing pins:", err);
          }
        };
        refreshPins();
      }

      setIsEditing(false);
      setSelectedPinId(null);
      setEditFormData({ place: "", disaster: "", info: "", createdBy: "", severity: "" });
      setEditFiles({ images: [], videos: [] });
      setEditErrors({});
    } catch (err) {
      console.error("Error updating pin:", err);
      alert(
        "Error updating pin: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render media gallery
  const renderMediaGallery = (pin) => {
    return (
      <div className="media-gallery">
        {pin.images && pin.images.length > 0 && (
          <div className="images-section">
            <h4>Images:</h4>
            <div className="media-grid">
              {pin.images.map((img, index) => (
                <div key={index} className="media-item">
                  <img
                    src={`http://localhost:5000/pins/${pin._id}/image/${index}`}
                    alt={img.originalName}
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    onClick={() => handleDeleteFile(pin._id, "image", index)}
                    className="delete-file-btn"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pin.videos && pin.videos.length > 0 && (
          <div className="videos-section">
            <h4>Videos:</h4>
            <div className="media-grid">
              {pin.videos.map((vid, index) => (
                <div key={index} className="media-item">
                  <video
                    width="100"
                    height="100"
                    controls
                    style={{ objectFit: "cover" }}
                  >
                    <source
                      src={`http://localhost:5000/pins/${pin._id}/video/${index}`}
                      type={vid.contentType}
                    />
                    Your browser does not support the video tag.
                  </video>
                  <button
                    onClick={() => handleDeleteFile(pin._id, "video", index)}
                    className="delete-file-btn"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Find nearest shelter to user location
  const findNearestShelter = () => {
    if (!userLocation || shelters.length === 0) return null;
    
    let nearest = null;
    let minDistance = Infinity;
    
    shelters.forEach(shelter => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        shelter.latitude,
        shelter.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...shelter, distance };
      }
    });
    
    return nearest;
  };

  // Update nearest shelter when user location or shelters change
  useEffect(() => {
    if (userLocation && shelters.length > 0) {
      const nearest = findNearestShelter();
      setNearestShelter(nearest);
    }
  }, [userLocation, shelters]);

  // Get directions to nearest shelter using Mapbox Directions API
  const getDirectionsToShelter = async (shelter) => {
    if (!userLocation || !shelter) return;
    
    try {
      const accessToken = "pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w";
      const start = `${userLocation.longitude},${userLocation.latitude}`;
      const end = `${shelter.longitude},${shelter.latitude}`;
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?geometries=geojson&access_token=${accessToken}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        setDirections(data.routes[0].geometry);
        setShowDirections(true);
      }
    } catch (error) {
      console.error("Error getting directions:", error);
    }
  };

  // Handle shelter marker click
  const handleShelterClick = (shelterId) => {
    setSelectedShelterId(selectedShelterId === shelterId ? null : shelterId);
  };

  // Handle get directions button click
  const handleGetDirections = () => {
    if (nearestShelter) {
      getDirectionsToShelter(nearestShelter);
    }
  };

  return (
    <div style={{ position: "relative", width: 900, height: 900 }}>
      <MapboxMap
        mapboxAccessToken="pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w"
        initialViewState={{
          longitude: 80.8156111,
          latitude: 7.60552778,
          zoom: 7,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/navoda123/cmf0ny1k100cd01sb5fu2g8zd"
        onDblClick={handleAddClick}
      >
        {/* Existing Pins */}
        {pins
          .filter((pin) => 
            pin && 
            pin._id && 
            typeof pin.longitude === 'number' && 
            typeof pin.latitude === 'number' && 
            !isNaN(pin.longitude) && 
            !isNaN(pin.latitude) &&
            pin.longitude >= -180 && 
            pin.longitude <= 180 &&
            pin.latitude >= -90 && 
            pin.latitude <= 90
          )
          .map((pin) => (
            <Marker
              key={pin._id}
              longitude={pin.longitude}
              latitude={pin.latitude}
              anchor="bottom"
            >
              <LocationPinIcon
                style={{ cursor: "pointer", color: "red",fontSize:58 }}
                onClick={() => {
                  handleMarkerClick(pin._id);
                  setEditFormData({
                    place: pin.place,
                    disaster: pin.disaster,
                    info: pin.info,
                    createdBy: pin.createdBy,
                    severity: pin.severity || "",
                  });
                }}
              />
            </Marker>
          ))}

        {/* Shelter Markers */}
        {shelters
          .filter((shelter) => 
            shelter && 
            shelter._id && 
            typeof shelter.longitude === 'number' && 
            typeof shelter.latitude === 'number' && 
            !isNaN(shelter.longitude) && 
            !isNaN(shelter.latitude) &&
            shelter.longitude >= -180 && 
            shelter.longitude <= 180 &&
            shelter.latitude >= -90 && 
            shelter.latitude <= 90
          )
          .map((shelter) => (
            <Marker
              key={shelter._id}
              longitude={shelter.longitude}
              latitude={shelter.latitude}
              anchor="bottom"
            >
              <HealthAndSafetyIcon
                style={{ 
                  cursor: "pointer", 
                  color: "blue", 
                  fontSize: 48 
                }}
                onClick={() => handleShelterClick(shelter._id)}
              />
            </Marker>
          ))}

        {/* Shelter Popup */}
        {selectedShelterId &&
          (() => {
            const selectedShelter = shelters.find((s) => s && s._id === selectedShelterId);
            if (!selectedShelter) return null;
            return (
              <Popup
                longitude={selectedShelter.longitude}
                latitude={selectedShelter.latitude}
                anchor="left"
                closeOnClick={false}
                onClose={() => setSelectedShelterId(null)}
              >
                <div className="popup-card">
                  <h2 style={{ color: "green" }}>{selectedShelter.name}</h2>
                  <p><b>Description:</b> {selectedShelter.description}</p>
                  {selectedShelter.capacity > 0 && (
                    <p><b>Capacity:</b> {selectedShelter.capacity} people</p>
                  )}
                  {selectedShelter.facilities && selectedShelter.facilities.length > 0 && (
                    <p><b>Facilities:</b> {selectedShelter.facilities.join(", ")}</p>
                  )}
                  {selectedShelter.contact && (selectedShelter.contact.phone || selectedShelter.contact.email) && (
                    <div>
                      <p><b>Contact:</b></p>
                      {selectedShelter.contact.phone && <p>Phone: {selectedShelter.contact.phone}</p>}
                      {selectedShelter.contact.email && <p>Email: {selectedShelter.contact.email}</p>}
                    </div>
                  )}
                </div>
              </Popup>
            );
          })()}

        {/* Selected Pin Popup with Update/Delete */}
        {selectedPinId &&
          (() => {
            const selectedPin = pins.find((p) => p && p._id === selectedPinId);
            if (!selectedPin) return null;
            return (
              <Popup
                longitude={selectedPin.longitude}
                latitude={selectedPin.latitude}
                anchor="left"
                closeOnClick={false}
                onClose={() => {
                  setSelectedPinId(null);
                  setIsEditing(false);
                }}
              >
                {!isEditing ? (
                  <div className="popup-card">
                    <h2>{selectedPin.place}</h2>
                    <p>
                      <b>Disaster:</b> {selectedPin.disaster}
                    </p>
                    <p>{selectedPin.info}</p>
                    <p>
                      <i>By: {selectedPin.createdBy}</i>
                    </p>

                    {renderMediaGallery(selectedPin)}

                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        marginTop: "8px",
                        background: "orange",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Update
                    </button>

                    <button
                      onClick={() => handleDelete(selectedPin._id)}
                      style={{
                        marginTop: "8px",
                        marginLeft: "5px",
                        background: "red",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => handleUpdate(e, selectedPin._id)}
                    className="popup-form"
                  >
                    <div className="form-group">
                      <input
                        type="text"
                        name="place"
                        placeholder="Place Name"
                        value={editFormData.place}
                        onChange={handleEditChange}
                        className={editErrors.place ? "error" : ""}
                        required
                      />
                      {editErrors.place && <span className="error-message">{editErrors.place}</span>}
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        name="disaster"
                        placeholder="Disaster Type"
                        value={editFormData.disaster}
                        onChange={handleEditChange}
                        className={editErrors.disaster ? "error" : ""}
                        required
                      />
                      {editErrors.disaster && <span className="error-message">{editErrors.disaster}</span>}
                    </div>

                    <div className="form-group">
                      <select
                        name="severity"
                        value={editFormData.severity}
                        onChange={handleEditChange}
                        className={editErrors.severity ? "error" : ""}
                        placeholder="Select Severity Level"
                      >
                        <option value="">Select Severity Level</option>
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                      {editErrors.severity && <span className="error-message">{editErrors.severity}</span>}
                    </div>

                    <div className="form-group">
                      <textarea
                        name="info"
                        placeholder="Additional Information"
                        value={editFormData.info}
                        onChange={handleEditChange}
                        className={editErrors.info ? "error" : ""}
                        maxLength="500"
                      />
                      <div className="char-count">{editFormData.info.length}/500</div>
                      {editErrors.info && <span className="error-message">{editErrors.info}</span>}
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        name="createdBy"
                        placeholder="Your Name"
                        value={editFormData.createdBy}
                        onChange={handleEditChange}
                        className={editErrors.createdBy ? "error" : ""}
                        required
                      />
                      {editErrors.createdBy && <span className="error-message">{editErrors.createdBy}</span>}
                    </div>

                    <div className="file-upload-section">
                      <label>
                        <PhotoCameraIcon /> Add Images (1MB maxCount):
                        <input
                          type="file"
                          name="images"
                          multiple
                          accept="image/*"
                          onChange={handleEditFileChange}
                        />
                        {editErrors.images && <span className="error-message">{editErrors.images}</span>}
                        {editFiles.images.length > 0 && (
                          <div className="file-list">
                            {editFiles.images.map((file, index) => (
                              <div key={index} className="file-item">
                                <span>{file.name}</span>
                                {editErrors[`image_${index}`] && (
                                  <span className="error-message">{editErrors[`image_${index}`]}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </label>

                      <label>
                        <VideocamIcon /> Add Videos (15MB each):
                        <input
                          type="file"
                          name="videos"
                          multiple
                          accept="video/*"
                          onChange={handleEditFileChange}
                        />
                        {editErrors.videos && <span className="error-message">{editErrors.videos}</span>}
                        {editFiles.videos.length > 0 && (
                          <div className="file-list">
                            {editFiles.videos.map((file, index) => (
                              <div key={index} className="file-item">
                                <span>{file.name}</span>
                                {editErrors[`video_${index}`] && (
                                  <span className="error-message">{editErrors[`video_${index}`]}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>

                    <div className="form-actions">
                      <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditErrors({});
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </Popup>
            );
          })()}

        {/* New Pin Form */}
        {newPlace && (
          <Popup
            longitude={newPlace.longitude}
            latitude={newPlace.latitude}
            anchor="left"
            closeOnClick={false}
            onClose={() => {
              setNewPlace(null);
              setCreateErrors({});
            }}
          >
            <form onSubmit={handleCreateSubmit} className="popup-form">
              <div className="form-group">
                <input
                  type="text"
                  name="place"
                  placeholder="Place Name"
                  value={createFormData.place}
                  onChange={handleCreateChange}
                  className={createErrors.place ? "error" : ""}
                  required
                />
                {createErrors.place && <span className="error-message">{createErrors.place}</span>}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="disaster"
                  placeholder="Disaster Type"
                  value={createFormData.disaster}
                  onChange={handleCreateChange}
                  className={createErrors.disaster ? "error" : ""}
                  required
                />
                {createErrors.disaster && <span className="error-message">{createErrors.disaster}</span>}
              </div>

              <div className="form-group">
                <select
                  name="severity"
                  value={createFormData.severity}
                  onChange={handleCreateChange}
                  className={createErrors.severity ? "error" : ""}
                  placeholder="Select Severity Level"
                >
                  <option value="">Select Severity Level</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                {createErrors.severity && <span className="error-message">{createErrors.severity}</span>}
              </div>

              <div className="form-group">
                <textarea
                  name="info"
                  placeholder="Additional Information"
                  value={createFormData.info}
                  onChange={handleCreateChange}
                  className={createErrors.info ? "error" : ""}
                  maxLength="500"
                />
                <div className="char-count">{createFormData.info.length}/500</div>
                {createErrors.info && <span className="error-message">{createErrors.info}</span>}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="createdBy"
                  placeholder="Your Name"
                  value={createFormData.createdBy}
                  onChange={handleCreateChange}
                  className={createErrors.createdBy ? "error" : ""}
                  required
                />
                {createErrors.createdBy && <span className="error-message">{createErrors.createdBy}</span>}
              </div>

              <div className="file-upload-section">
                <label>
                  <PhotoCameraIcon /> Add Images (1MB max):
                  <input
                    type="file"
                    name="images"
                    multiple
                    accept="image/*"
                    onChange={handleCreateFileChange}
                  />
                  {createErrors.images && <span className="error-message">{createErrors.images}</span>}
                  {createFiles.images.length > 0 && (
                    <div className="file-list">
                      {createFiles.images.map((file, index) => (
                        <div key={index} className="file-item">
                          <span>{file.name}</span>
                          {createErrors[`image_${index}`] && (
                            <span className="error-message">{createErrors[`image_${index}`]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </label>

                <label>
                  <VideocamIcon /> Add Videos (15MB max):
                  <input
                    type="file"
                    name="videos"
                    multiple
                    accept="video/*"
                    onChange={handleCreateFileChange}
                  />
                  {createErrors.videos && <span className="error-message">{createErrors.videos}</span>}
                  {createFiles.videos.length > 0 && (
                    <div className="file-list">
                      {createFiles.videos.map((file, index) => (
                        <div key={index} className="file-item">
                          <span>{file.name}</span>
                          {createErrors[`video_${index}`] && (
                            <span className="error-message">{createErrors[`video_${index}`]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewPlace(null);
                    setCreateErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Popup>
        )}

        {/* User's Live Location */}
        {userLocation && 
         typeof userLocation.longitude === 'number' && 
         typeof userLocation.latitude === 'number' && 
         !isNaN(userLocation.longitude) && 
         !isNaN(userLocation.latitude) &&
         userLocation.longitude >= -180 && 
         userLocation.longitude <= 180 &&
         userLocation.latitude >= -90 && 
         userLocation.latitude <= 90 && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="bottom"
          >
            <MyLocationIcon style={{ color: "blue" , fontSize:40, }} />
          </Marker>
        )}

        {/* Directions Layer */}
        {showDirections && directions && (
          <Source
            id="route"
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: directions
            }}
          >
            <Layer
              id="route"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 4,
                "line-opacity": 0.8
              }}
            />
          </Source>
        )}
      </MapboxMap>


    </div>
  );
}

export default Map;
