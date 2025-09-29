import * as React from "react";
import { useState, useEffect } from "react";
import { Map as MapboxMap, Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import LocationPinIcon from "@mui/icons-material/LocationOn";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DirectionsIcon from "@mui/icons-material/Directions";
import { useNavigate } from "react-router-dom"; // ✅ import navigation


function UserMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [pins, setPins] = useState([]); // nearby pins
  const [allPins, setAllPins] = useState([]); // all pins
  const [selectedPin, setSelectedPin] = useState(null);
  
  // Shelter-related state
  const [shelters, setShelters] = useState([]);
  const [nearestShelter, setNearestShelter] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [directions, setDirections] = useState(null);
  const [selectedShelterId, setSelectedShelterId] = useState(null);

  const navigate = useNavigate(); 

  // Fetch location + pins
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          };
          setUserLocation(loc);
          setAccuracy(position.coords.accuracy);

          try {
            const allRes = await axios.get("http://localhost:5000/pins");
            const allPinsData = allRes.data.data || [];
            
            // Filter valid pins
            const validAllPins = allPinsData.filter((pin) => {
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
            setAllPins(validAllPins);

            const nearbyRes = await axios.get(
              "http://localhost:5000/pins/nearby",
              {
                params: {
                  longitude: loc.longitude,
                  latitude: loc.latitude,
                  distance: 10000,
                },
              }
            );
            const nearbyPinsData = nearbyRes.data.data || [];
            
            // Filter valid nearby pins
            const validNearbyPins = nearbyPinsData.filter((pin) => {
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
            setPins(validNearbyPins);
          } catch (err) {
            console.error("Error fetching pins:", err);
            setAllPins([]);
            setPins([]);
          }
        },
        (error) => console.error("Error getting location:", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
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

  const renderMediaGallery = (pin) => (
    <div className="media-gallery">
      {pin.images?.map((img) => (
        <img
          key={img.filename}
          src={`http://localhost:5000/${img.path}`}
          alt={img.originalName}
          width="120"
          style={{ marginRight: "10px", borderRadius: "6px" }}
        />
      ))}
      {pin.videos?.map((vid) => (
        <video
          key={vid.filename}
          src={`http://localhost:5000/${vid.path}`}
          width="180"
          controls
          style={{ marginTop: "10px", borderRadius: "6px" }}
        />
      ))}
    </div>
  );

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
    <div>
      {/* Map */}
      <div style={{ position: "relative", width: 1850, height:800  }}>
        <MapboxMap
          mapboxAccessToken="pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w"
          initialViewState={{
            longitude: 80.8156111,
          latitude: 7.90552778,
          zoom: 7,
          }}
          style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/navoda123/cmf0ny1k100cd01sb5fu2g8zd"
        >
          {/* User location */}
          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="bottom"
            >
              <MyLocationIcon style={{ color: "blue" }} />
            </Marker>
          )}

          {/* Pins */}
          {allPins
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
            .map((pin) => {
              const isNearby = pins.some((nearby) => nearby && nearby._id === pin._id);
              return (
                <Marker
                  key={pin._id}
                  longitude={pin.longitude}
                  latitude={pin.latitude}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedPin(pin);
                  }}
                >
                  <LocationPinIcon
                    style={{
                      color: isNearby ? "red" : "orange",
                      cursor: "pointer",
                      fontSize: "58px",
                      
                    }}
                  />
                </Marker>
              );
            })}

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
                  <div className="shelter-popup">
                    <h2>{selectedShelter.name}</h2>
                    
                    <div className="shelter-info">
                      <div className="info-item">
                        <div className="info-label">📝 Description</div>
                        <div className="info-value">{selectedShelter.description}</div>
                      </div>
                      
                      {selectedShelter.capacity > 0 && (
                        <div className="info-item capacity-info">
                          <div className="info-label">👥 Capacity</div>
                          <div className="info-value">{selectedShelter.capacity} people</div>
                        </div>
                      )}
                      
                      {selectedShelter.facilities && selectedShelter.facilities.length > 0 && (
                        <div className="info-item facilities-info">
                          <div className="info-label">🏥 Facilities</div>
                          <div className="facilities-list">
                            {selectedShelter.facilities.map((facility, index) => (
                              <span key={index} className="facility-tag">{facility}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedShelter.contact && (selectedShelter.contact.phone || selectedShelter.contact.email) && (
                        <div className="info-item contact-info">
                          <div className="info-label">📞 Contact</div>
                          <div className="contact-details">
                            {selectedShelter.contact.phone && (
                              <div className="contact-item phone">{selectedShelter.contact.phone}</div>
                            )}
                            {selectedShelter.contact.email && (
                              <div className="contact-item email">{selectedShelter.contact.email}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              );
            })()}

          {/* Popup */}
          {selectedPin && (
            <Popup
              longitude={selectedPin.longitude}
              latitude={selectedPin.latitude}
              anchor="left"
              closeOnClick={false}
              onClose={() => setSelectedPin(null)}
            >
              <div className="popup-card">
                <h2>{selectedPin.place}</h2>
                <p>
                  <b>Disaster:</b> {selectedPin.disaster}
                </p>
                <p>
                  <b>Severity:</b> 
                  <span className={`severity-badge severity-${selectedPin.severity?.toLowerCase() || 'moderate'}`}>
                    {selectedPin.severity || 'Moderate'}
                  </span>
                </p>
                <p>{selectedPin.info}</p>

                {/* ✅ View Details button */}
                <button
                  onClick={() => navigate(`/pin/${selectedPin._id}`)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  View Details →
                </button>
              </div>
            </Popup>
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

        {/* Shelter Controls */}
        <div style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          zIndex: 1000,
          minWidth: "250px"
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "green" }}>Emergency Shelters</h3>
          
          {nearestShelter && (
            <div style={{ marginBottom: "10px", padding: "8px", background: "#f0f8f0", borderRadius: "4px" }}>
              <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Nearest Shelter:</p>
              <p style={{ margin: "0 0 5px 0" }}>{nearestShelter.name}</p>
              <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
                Distance: {nearestShelter.distance.toFixed(2)} km
              </p>
              <button
                onClick={handleGetDirections}
                style={{
                  background: "green",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                <DirectionsIcon style={{ fontSize: "16px", marginRight: "4px" }} />
                Get Directions
              </button>
            </div>
          )}

          {shelters.length > 0 && (
            <div>
              <p style={{ margin: "0 0 5px 0", fontSize: "12px" }}>
                Total Shelters: {shelters.length}
              </p>
              <button
                onClick={() => setShowDirections(!showDirections)}
                style={{
                  background: showDirections ? "red" : "blue",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                {showDirections ? "Hide Directions" : "Show All Routes"}
              </button>
            </div>
          )}

          {!nearestShelter && shelters.length === 0 && (
            <p style={{ margin: "0", fontSize: "12px", color: "#666" }}>
              No shelters available
            </p>
          )}
        </div>

        {/* Directions Display */}
        {showDirections && directions && (
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            background: "white",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxWidth: "300px"
          }}>
            <h4 style={{ margin: "0 0 10px 0", color: "blue" }}>Evacuation Route</h4>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px" }}>
              Route to nearest shelter is displayed on the map
            </p>
            <button
              onClick={() => setShowDirections(false)}
              style={{
                background: "red",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Hide Route
            </button>
          </div>
        )}
      </div>

    </div>
  );
}



export default UserMap;


