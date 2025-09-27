import React, { useState, useEffect } from 'react';
import { Map as MapboxMap, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import './ShelterManagement.css';

const ShelterManagement = () => {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null);
  const [newShelterLocation, setNewShelterLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    capacity: '',
    facilities: '',
    contact: {
      phone: '',
      email: ''
    }
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch shelters from API
  useEffect(() => {
    fetchShelters();
  }, []);

  const fetchShelters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/shelters');
      setShelters(response.data.data || []);
    } catch (error) {
      console.error('Error fetching shelters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('contact.')) {
      const contactField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [contactField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shelter name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.latitude || isNaN(parseFloat(formData.latitude))) {
      newErrors.latitude = 'Valid latitude is required';
    } else {
      const lat = parseFloat(formData.latitude);
      if (lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (!formData.longitude || isNaN(parseFloat(formData.longitude))) {
      newErrors.longitude = 'Valid longitude is required';
    } else {
      const lng = parseFloat(formData.longitude);
      if (lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    if (formData.capacity && (isNaN(parseInt(formData.capacity)) || parseInt(formData.capacity) < 0)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const shelterData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        capacity: parseInt(formData.capacity) || 0,
        facilities: formData.facilities ? formData.facilities.split(',').map(f => f.trim()) : []
      };

      if (editingShelter) {
        // Update existing shelter
        await axios.put(`http://localhost:5000/api/shelters/${editingShelter._id}`, shelterData);
      } else {
        // Create new shelter
        await axios.post('http://localhost:5000/api/shelters', shelterData);
      }

      // Reset form and refresh data
      setFormData({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        capacity: '',
        facilities: '',
        contact: {
          phone: '',
          email: ''
        }
      });
      setEditingShelter(null);
      setShowForm(false);
      setNewShelterLocation(null);
      await fetchShelters();
      
    } catch (error) {
      console.error('Error saving shelter:', error);
      alert('Error saving shelter. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit shelter
  const handleEdit = (shelter) => {
    setEditingShelter(shelter);
    setFormData({
      name: shelter.name,
      description: shelter.description,
      latitude: shelter.latitude.toString(),
      longitude: shelter.longitude.toString(),
      capacity: shelter.capacity.toString(),
      facilities: shelter.facilities ? shelter.facilities.join(', ') : '',
      contact: {
        phone: shelter.contact?.phone || '',
        email: shelter.contact?.email || ''
      }
    });
    setShowForm(true);
  };

  // Handle delete shelter
  const handleDelete = async (shelterId) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/shelters/${shelterId}`);
      await fetchShelters();
    } catch (error) {
      console.error('Error deleting shelter:', error);
      alert('Error deleting shelter. Please try again.');
    }
  };

  // Handle map click to get coordinates
  const handleMapClick = (e) => {
    const { lng, lat } = e.lngLat;
    setNewShelterLocation({
      longitude: lng,
      latitude: lat
    });
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      capacity: '',
      facilities: '',
      contact: {
        phone: '',
        email: ''
      }
    });
    setEditingShelter(null);
    setShowForm(false);
    setNewShelterLocation(null);
    setErrors({});
  };

  return (
    <div className="shelter-management">
      <div className="shelter-header">
        <h2>Emergency Shelter Management</h2>
        <p>Double-click anywhere on the map to add a new shelter, or manage existing shelters below</p>
      </div>

      <div className="shelter-content">
        {/* Shelter List */}
        <div className="shelter-list">
          <h3>All Shelters ({shelters.length})</h3>
          {loading ? (
            <div className="loading">Loading shelters...</div>
          ) : (
            <div className="shelter-cards">
              {shelters.map(shelter => (
                <div key={shelter._id} className="shelter-card">
                  <div className="shelter-info">
                    <h4>{shelter.name}</h4>
                    <p>{shelter.description}</p>
                    <div className="shelter-details">
                      <span>Capacity: {shelter.capacity}</span>
                      <span>Lat: {shelter.latitude.toFixed(4)}</span>
                      <span>Lng: {shelter.longitude.toFixed(4)}</span>
                    </div>
                    {shelter.facilities && shelter.facilities.length > 0 && (
                      <div className="facilities">
                        <strong>Facilities:</strong> {shelter.facilities.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="shelter-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(shelter)}
                    >
                      <EditIcon />
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(shelter._id)}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="shelter-map">
          <h3>Shelter Locations</h3>
          <div className="map-container">
            <MapboxMap
              mapboxAccessToken="pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w"
              initialViewState={{
                longitude: 79.8612,
                latitude: 6.9271,
                zoom: 6
              }}
              style={{ width: '100%', height: '800px' }}
              mapStyle="mapbox://styles/navoda123/cmf0ny1k100cd01sb5fu2g8zd"
              onDblClick={handleMapClick}
            >
              {/* Shelter Markers */}
              {shelters.map(shelter => (
                <Marker
                  key={shelter._id}
                  longitude={shelter.longitude}
                  latitude={shelter.latitude}
                  anchor="bottom"
                >
                  <HealthAndSafetyIcon
                    style={{ 
                      color: 'blue', 
                      fontSize: 32,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedShelter(shelter)}
                  />
                </Marker>
              ))}

              {/* Shelter Popup */}
              {selectedShelter && (
                <Popup
                  longitude={selectedShelter.longitude}
                  latitude={selectedShelter.latitude}
                  anchor="left"
                  closeOnClick={false}
                  onClose={() => setSelectedShelter(null)}
                >
                  <div className="shelter-popup">
                    <h4>{selectedShelter.name}</h4>
                    <p>{selectedShelter.description}</p>
                    <p><strong>Capacity:</strong> {selectedShelter.capacity}</p>
                    {selectedShelter.facilities && selectedShelter.facilities.length > 0 && (
                      <p><strong>Facilities:</strong> {selectedShelter.facilities.join(', ')}</p>
                    )}
                    <div className="popup-actions">
                      <button onClick={() => handleEdit(selectedShelter)}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(selectedShelter._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </Popup>
              )}

              {/* New Shelter Form Popup */}
              {newShelterLocation && (
                <Popup
                  longitude={newShelterLocation.longitude}
                  latitude={newShelterLocation.latitude}
                  anchor="left"
                  closeOnClick={false}
                  onClose={() => {
                    setNewShelterLocation(null);
                    setFormData({
                      name: '',
                      description: '',
                      latitude: '',
                      longitude: '',
                      capacity: '',
                      facilities: '',
                      contact: {
                        phone: '',
                        email: ''
                      }
                    });
                    setErrors({});
                  }}
                >
                  <form onSubmit={handleSubmit} className="popup-form">
                    <div className="form-group">
                      <input
                        type="text"
                        name="name"
                        placeholder="Shelter Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={errors.name ? 'error' : ''}
                        required
                      />
                      {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                      <textarea
                        name="description"
                        placeholder="Shelter Description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={errors.description ? 'error' : ''}
                        rows="2"
                        required
                      />
                      {errors.description && <span className="error-message">{errors.description}</span>}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <input
                          type="number"
                          name="latitude"
                          placeholder="Latitude"
                          value={formData.latitude}
                          onChange={handleInputChange}
                          className={errors.latitude ? 'error' : ''}
                          step="any"
                          required
                        />
                        {errors.latitude && <span className="error-message">{errors.latitude}</span>}
                      </div>

                      <div className="form-group">
                        <input
                          type="number"
                          name="longitude"
                          placeholder="Longitude"
                          value={formData.longitude}
                          onChange={handleInputChange}
                          className={errors.longitude ? 'error' : ''}
                          step="any"
                          required
                        />
                        {errors.longitude && <span className="error-message">{errors.longitude}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <input
                        type="number"
                        name="capacity"
                        placeholder="Capacity (optional)"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        className={errors.capacity ? 'error' : ''}
                        min="0"
                      />
                      {errors.capacity && <span className="error-message">{errors.capacity}</span>}
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        name="facilities"
                        placeholder="Facilities (comma-separated)"
                        value={formData.facilities}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <input
                          type="tel"
                          name="contact.phone"
                          placeholder="Phone (optional)"
                          value={formData.contact.phone}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="email"
                          name="contact.email"
                          placeholder="Email (optional)"
                          value={formData.contact.email}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Shelter'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setNewShelterLocation(null);
                          setFormData({
                            name: '',
                            description: '',
                            latitude: '',
                            longitude: '',
                            capacity: '',
                            facilities: '',
                            contact: {
                              phone: '',
                              email: ''
                            }
                          });
                          setErrors({});
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </Popup>
              )}
            </MapboxMap>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <div className="form-header">
              <h3>{editingShelter ? 'Edit Shelter' : 'Add New Shelter'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="shelter-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Shelter Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter shelter name"
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className={errors.capacity ? 'error' : ''}
                    placeholder="Enter capacity"
                    min="0"
                  />
                  {errors.capacity && <span className="error-message">{errors.capacity}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={errors.description ? 'error' : ''}
                  placeholder="Enter shelter description"
                  rows="3"
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className={errors.latitude ? 'error' : ''}
                    placeholder="Enter latitude"
                    step="any"
                  />
                  {errors.latitude && <span className="error-message">{errors.latitude}</span>}
                </div>

                <div className="form-group">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className={errors.longitude ? 'error' : ''}
                    placeholder="Enter longitude"
                    step="any"
                  />
                  {errors.longitude && <span className="error-message">{errors.longitude}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Facilities (comma-separated)</label>
                <input
                  type="text"
                  name="facilities"
                  value={formData.facilities}
                  onChange={handleInputChange}
                  placeholder="e.g., Medical, Food, Water, Communication"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    name="contact.phone"
                    value={formData.contact.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    name="contact.email"
                    value={formData.contact.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingShelter ? 'Update Shelter' : 'Add Shelter')}
                </button>
                <button type="button" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelterManagement;
