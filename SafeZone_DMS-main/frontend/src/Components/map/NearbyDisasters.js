import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./nearby.css";

function NearbyDisasters() {
  const navigate = useNavigate();
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNearby = async (longitude, latitude) => {
      try {
        const res = await axios.get(
          `http://localhost:5000/pins/nearby?longitude=${longitude}&latitude=${latitude}&distance=10000`
        );
        setPins(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load nearby pins");
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          fetchNearby(longitude, latitude);
        },
        (geoErr) => {
          setError("Location permission denied. Cannot load nearby disasters.");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation not supported by this browser.");
      setLoading(false);
    }
  }, []);

  if (loading) return <div className="nearby-container"><p className="nearby-loading">Loading nearby disasters...</p></div>;
  if (error) return <div className="nearby-container"><p className="nearby-error">{error}</p></div>;

  return (
    <div className="nearby-section">
      <div className="nearby-container">
        <h2 className="nearby-title">Nearby Disasters</h2>
        {pins.length === 0 ? (
          <p className="nearby-empty">No disasters found nearby.</p>
        ) : (
          <ul className="nearby-list">
            {pins.map((pin) => (
              <li key={pin._id} className="nearby-item">
                <div className="nearby-item-header">
                  <h3 className="nearby-item-title">{pin.place}</h3>
                  <span className="nearby-badge">{pin.disaster}</span>
                </div>
                <p className="nearby-info">{pin.info}</p>
                <div className="nearby-actions">
                  <button className="nearby-btn" onClick={() => navigate(`/pin/${pin._id}`)}>
                    View Details →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default NearbyDisasters;


