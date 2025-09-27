import React, { useState } from "react";
import { Search, MapPin, AlertTriangle, Clock } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./DisasterSearch.css";

const DisasterSearch = ({ onSearchResults, onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Search for disasters by place name
      const response = await axios.get(`http://localhost:5000/pins/search`, {
        params: {
          query: searchQuery,
          type: "place", // Search by place name
        },
      });

      const results = response.data.data || [];
      setSearchResults(results);
      setShowResults(true);

      // Pass results to parent component if callback provided
      if (onSearchResults) {
        onSearchResults(results);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Fallback: search in local data if API doesn't support search
      await searchLocalData();
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback search function for local data
  const searchLocalData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/pins");
      const allPins = response.data.data || [];

      // Filter pins by place name (case insensitive)
      const filteredResults = allPins.filter(
        (pin) =>
          pin.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pin.disaster.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setSearchResults(filteredResults);
      setShowResults(true);

      if (onSearchResults) {
        onSearchResults(filteredResults);
      }
    } catch (error) {
      console.error("Local search error:", error);
      setSearchResults([]);
    }
  };

  const handleResultClick = (result) => {
    if (onLocationSelect) {
      onLocationSelect(result);
    }
    navigate(`/pin/${result._id}`);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    if (onSearchResults) {
      onSearchResults([]);
    }
  };

  const getDisasterIcon = (disasterType) => {
    switch (disasterType.toLowerCase()) {
      case "flood":
        return "🚣‍♀️";
      case "Landslides":
        return "⛰️";
      case "fire":
        return "🔥";
      case "earthquake":
        return "🌍";
      case "hurricane":
        return "🌀";
      case "tornado":
        return "🌪️";
      case "tusunaimi":
        return "🌊";
      default:
        return "⚠️";
    }
  };

  const getSeverityColor = (disasterType) => {
    switch (disasterType.toLowerCase()) {
      case "flood":
      case "fire":
      case "earthquake":
        return "high";
      case "hurricane":
      case "tsunami":
        return "critical";
      default:
        return "medium";
    }
  };

  return (
    <div className="disaster-search-container">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Search by place name or disaster type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button
            type="submit"
            className="search-button"
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <div className="spinner"></div>
            ) : (
              <Search size={20} />
            )}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-button"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* Search Results */}
      {showResults && (
        <div className="search-results">
          <div className="results-header">
            <h3>Search Results ({searchResults.length})</h3>
            <button onClick={clearSearch} className="close-results">
              ✕
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="no-results">
              <AlertTriangle size={24} />
              <p>No disasters found for "{searchQuery}"</p>
              <p>Try searching for a different location or disaster type.</p>
            </div>
          ) : (
            <div className="results-list">
              {searchResults.map((result) => (
                <div
                  key={result._id}
                  className={`result-item ${getSeverityColor(result.disaster)}`}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-icon">
                    {getDisasterIcon(result.disaster)}
                  </div>
                  <div className="result-content">
                    <div className="result-header">
                      <h4>{result.place}</h4>
                      <span
                        className={`severity-badge ${getSeverityColor(
                          result.disaster
                        )}`}
                      >
                        {result.disaster}
                      </span>
                    </div>
                    <p className="result-info">{result.info}</p>
                    <div className="result-meta">
                      <span className="result-date">
                        <Clock size={14} />
                        {new Date(result.createdAt).toLocaleDateString()}
                      </span>
                      <span className="result-coords">
                        <MapPin size={14} />
                        {result.latitude.toFixed(4)},{" "}
                        {result.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="result-arrow">➡️</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DisasterSearch;
