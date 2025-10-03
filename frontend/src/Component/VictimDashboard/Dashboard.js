
// Dashboard.js - Main Victim Dashboard Component

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";

// ========================================
// API Configuration
// ========================================

/** API endpoints for different services */  //paths to the backend
const REPORT_URLS = ["http://localhost:5000/victims"];
const AID_URLS = ["http://localhost:5000/aid"];
const CLAIM_URLS = ["http://localhost:5000/damage"];

// ========================================
// Utility Functions
// ========================================

/**
 * Extracts array data from various API response formats
 * 
 * @param {Object|Array} payload - API response data
 * @returns {Array} Extracted array data
 */
const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.victims)) return payload.victims;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
};

/**
 * Finds the most recent date from an array of objects
 * 
 * @param {Array} arr - Array of objects with date fields
 * @returns {Date|null} Most recent date found, or null if none
 */
const getLastDate = (arr) => {
  const FIELDS = ["occurredAt", "createdAt", "updatedAt", "submittedAt", "date", "timestamp"];
  let best = null;
  
  for (const it of arr) {
    for (const f of FIELDS) {
      const v = it?.[f];
      if (!v) continue;
      const t = new Date(v).getTime();
      if (Number.isFinite(t) && (best === null || t > best)) best = t;
    }
  }
  
  return best ? new Date(best) : null;
};

/**
 * Formats a date for display
 * 
 * @param {Date|string} d - Date to format
 * @returns {string} Formatted date string or "—" if invalid
 */
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { hour12: true }) : "—");

/**
 * Fetches data from the first available URL in a list
 * 
 * @param {Array<string>} urls - Array of URLs to try
 * @returns {Promise<Array>} Array of data from the first successful request
 */
async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      const { data } = await axios.get(url);
      return pickArray(data);
    } catch {
      // Continue to next URL if this one fails
    }
  }
  return [];
}

// ========================================
// UI Components
// ========================================

/**
 * MiniSlider - Horizontal image carousel component
 * ========================================
 * 
 * @param {Array<string>} images - Array of image URLs
 * @param {number} interval - Auto-advance interval in milliseconds
 * @param {number} height - Slider height in pixels
 * @param {string} alt - Alt text for images
 */
function MiniSlider({ images = [], interval = 3500, height = 150, alt = "" }) {
  const [i, setI] = useState(0);
  const timerRef = useRef(null);

  /**
   * Stops the auto-advance timer
   */
  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /**
   * Starts the auto-advance timer
   */
  const start = () => {
    if (!images.length) return;
    stop();
    timerRef.current = setInterval(() => setI((p) => (p + 1) % images.length), interval);
  };

  // Start/stop timer based on images and interval changes
  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, interval]);

  // Don't render if no images
  if (!images.length) return null;

  return (
    <div 
      className="mini-slider" 
      style={{ height }} 
      onMouseEnter={stop} 
      onMouseLeave={start}
    >
      {/* Image track with smooth horizontal scrolling */}
      <div 
        className="mini-slider__track" 
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {images.map((src, idx) => (
          <img 
            key={idx} 
            src={src} 
            alt={alt || `slide-${idx + 1}`} 
            className="mini-slide" 
            draggable="false" 
          />
        ))}
      </div>
      
      {/* Navigation dots */}
      <div className="mini-dots">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={"mini-dot" + (idx === i ? " is-on" : "")}
            onClick={() => setI(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * VerticalTips - Vertical scrolling tips component
 * ========================================
 * 
 * @param {Array<string>} tips - Array of tip text strings
 * @param {number} interval - Auto-scroll interval in milliseconds
 * @param {number} rowHeight - Height of each tip row in pixels
 */
function VerticalTips({ tips = [], interval = 2600, rowHeight = 72 }) {
  const [i, setI] = useState(0);
  
  // Auto-scroll through tips
  useEffect(() => {
    if (!tips.length) return;
    const id = setInterval(() => setI((p) => (p + 1) % tips.length), interval);
    return () => clearInterval(id);
  }, [tips, interval]);
  
  // Don't render if no tips
  if (!tips.length) return null;

  return (
    <div className="vtip" style={{ height: rowHeight }}>
      {/* Vertical scrolling track */}
      <div 
        className="vtip__track" 
        style={{ transform: `translateY(-${i * rowHeight}px)` }}
      >
        {tips.map((t, idx) => (
          <div 
            key={idx} 
            className="vtip__row" 
            style={{ height: rowHeight }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Main Dashboard Component
// ========================================

/**
 * Dashboard - Main victim dashboard component
 *  
 * @returns {JSX.Element} The rendered dashboard interface
 */
export default function Dashboard() {
  // ========================================
  // State Management
  // ========================================
  
  /** Get victim ID from localStorage for profile access */
  const victimId = localStorage.getItem("lastVictimId") || "";

  // ========================================
  // Static Data Configuration
  // ========================================
  
  /** Image carousel data for each service (served from /public/images/) */
  const reportImgs = ["/images/Report1.webp", "/images/Report2.webp", "/images/Report3.webp"];
  const aidImgs = ["/images/Request1.webp", "/images/Request2.webp", "/images/Request3.webp"];
  const claimImgs = ["/images/damage1.avif", "/images/damage2.avif", "/images/damage3.avif"];

  /** Safety tips for emergency situations */
  const safetyTips = [
    "Keep your phone charged and carry a power bank.",
    "Share live location when reporting.",
    "Follow official instructions from authorities.",
    "Prepare an emergency kit with essentials.",
    "Help children, elderly and disabled first.",
  ];

  /** Emergency contact information */
  const emergencyContacts = [
    { name: "Emergency Services", number: "911", type: "Emergency" },
    { name: "Disaster Relief", number: "1-800-733-2767", type: "Aid" },
    { name: "Weather Alert", number: "1-800-427-7623", type: "Weather" },
    { name: "Red Cross", number: "1-800-RED-CROSS", type: "Support" },
  ];

  /** Weather information state - now dynamic */
  const [weatherInfo, setWeatherInfo] = useState({
    location: "Loading...",
    temperature: "--°F",
    condition: "Loading...",
    alert: "Loading weather data...",
    humidity: "--%",
    wind: "-- mph"
  });

  // ========================================
  // Dynamic State
  // ========================================
  
  /** Statistics for recent requests from all services */
  const [stats, setStats] = useState({
    report: { count: 0, last: null },
    aid: { count: 0, last: null },
    claim: { count: 0, last: null },
  });
  
  /** Loading state for statistics data */
  const [loadingReqs, setLoadingReqs] = useState(true);
  
  /** Loading state for weather data */
  const [loadingWeather, setLoadingWeather] = useState(true);

  // ========================================
  // Data Fetching
  // ========================================
  

  /**
   * Fetches weather by city name using free weather API
   */
  const fetchWeatherByCity = useCallback(async (city) => {
    try {
      // Using wttr.in - free weather service, no API key needed
      const response = await axios.get(
        `https://wttr.in/${city}?format=j1`
      );
      
      const data = response.data;
      const current = data.current_condition[0];
      const location = data.nearest_area[0];
      
      setWeatherInfo({
        location: location.areaName[0].value || city,
        temperature: `${current.temp_F}°F`,
        condition: current.weatherDesc[0].value || "Unknown",
        alert: current.weatherDesc[0].value.toLowerCase().includes('rain') || 
               current.weatherDesc[0].value.toLowerCase().includes('storm') 
          ? `Weather Alert: ${current.weatherDesc[0].value}` 
          : "No severe weather alerts",
        humidity: `${current.humidity}%`,
        wind: `${current.windspeedMiles} mph ${current.winddir16Point}`
      });
      setLoadingWeather(false);
    } catch (error) {
      console.error('Weather fetch error:', error);
      // Set fallback weather data
      setWeatherInfo({
        location: city || "Weather Unavailable",
        temperature: "72°F",
        condition: "Partly Cloudy",
        alert: "Weather data unavailable - using demo data",
        humidity: "65%",
        wind: "8 mph NW"
      });
      setLoadingWeather(false);
    }
  }, []);

  /**
   * Fetches real-time weather data using free weather API
   * Using wttr.in service - no API key required
   */
  const fetchWeatherData = useCallback(async () => {
    try {
      setLoadingWeather(true);
      
      // Get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Using wttr.in with coordinates - no API key needed
            const response = await axios.get(
              `https://wttr.in/${latitude},${longitude}?format=j1`
            );
            
            const data = response.data;
            const current = data.current_condition[0];
            const location = data.nearest_area[0];
            
            setWeatherInfo({
              location: location.areaName[0].value || "Current Location",
              temperature: `${current.temp_F}°F`,
              condition: current.weatherDesc[0].value || "Unknown",
              alert: current.weatherDesc[0].value.toLowerCase().includes('rain') || 
                     current.weatherDesc[0].value.toLowerCase().includes('storm') 
                ? `Weather Alert: ${current.weatherDesc[0].value}` 
                : "No severe weather alerts",
              humidity: `${current.humidity}%`,
              wind: `${current.windspeedMiles} mph ${current.winddir16Point}`
            });
            setLoadingWeather(false);
          } catch (apiError) {
            console.error('Weather API error:', apiError);
            // Fallback to demo data
            setWeatherInfo({
              location: "Current Location",
              temperature: "72°F",
              condition: "Partly Cloudy",
              alert: "Weather data unavailable - using demo data",
              humidity: "65%",
              wind: "8 mph NW"
            });
            setLoadingWeather(false);
          }
        }, (error) => {
          console.error('Geolocation error:', error);
          // Fallback to default location (New York)
          fetchWeatherByCity('New York');
        });
      } else {
        // Fallback if geolocation not supported
        fetchWeatherByCity('New York');
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      // Set fallback weather data
      setWeatherInfo({
        location: "Weather Unavailable",
        temperature: "72°F",
        condition: "Partly Cloudy",
        alert: "Weather data unavailable - using demo data",
        humidity: "65%",
        wind: "8 mph NW"
      });
      setLoadingWeather(false);
    }
  }, [fetchWeatherByCity]);


  /**
   * Fetches statistics from all service APIs
   * Updates the stats state with counts and last submission dates
   */
  useEffect(() => {
    (async () => {
      setLoadingReqs(true);
      
      // Fetch data from all services in parallel
      const [reports, aids, claims] = await Promise.all([
        fetchFirst(REPORT_URLS),
        fetchFirst(AID_URLS),
        fetchFirst(CLAIM_URLS),
      ]);
      
      // Update statistics with counts and last dates
      setStats({
        report: { count: reports.length, last: getLastDate(reports) },
        aid: { count: aids.length, last: getLastDate(aids) },
        claim: { count: claims.length, last: getLastDate(claims) },
      });
      
      setLoadingReqs(false);
    })();
  }, []);

  /**
   * Fetches weather data on component mount
   */
  useEffect(() => {
    fetchWeatherData();
    
    // Refresh weather every 10 minutes
    const weatherInterval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    
    return () => clearInterval(weatherInterval);
  }, [fetchWeatherData]);

  // ========================================
  // Render
  // ========================================
  
  return (
    <main className="vdash container">
      {/* ======================================== */}
      {/* UI COMPONENT: HERO SECTION */}
      {/* Purpose: Main header with title, description, and action buttons */}
      {/* Features: Responsive layout, primary/secondary actions, profile access */}
      {/* ======================================== */}
      <section className="hero">
        <div className="hero__text">
          <h1>Disaster Services Portal</h1>
          <p className="muted">Report incidents, request aid, submit claims all in one place.</p>
        </div>

        <div className="hero__actions">
          {/* Primary Action: Create New Report */}
          <Link to="/victim/report" className="btn btn--primary" aria-label="Create new disaster report">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"></rect>
                <path d="M12 7v10M7 12h10"></path>
              </g>
            </svg>
            <span>New Report</span>
          </Link>

          {/* Secondary Action: View Existing Reports */}
          <Link to="/victim/reports" className="btn btn--ghost" aria-label="View submitted disaster reports">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              </g>
            </svg>
            <span>View Reports</span>
          </Link>

          {/* Profile Access: Conditional based on victim ID */}
          <Link
            to={victimId ? `/victim/profile/${victimId}` : "/victim/read"}
            className={"btn btn-profile" + (victimId ? "" : " is-disabled")}
            title={victimId ? "Access your victim profile" : "Create a report first to access profile"}
            aria-label="Open victim profile"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21a8 8 0 0 1 16 0"></path>
                <circle cx="12" cy="8" r="4"></circle>
              </g>
            </svg>
            <span>View Report</span>
          </Link>
        </div>
      </section>

      {/* ======================================== */}
      {/* UI COMPONENT: MAIN CONTENT GRID */}
      {/* Purpose: Two-column layout with service cards and sidebar widgets */}
      {/* Layout: Left side - Service cards, Right side - Widgets */}
      {/* ======================================== */}
      <section className="grid">
        {/* ======================================== */}
        {/* UI COMPONENT: SERVICE CARDS SECTION */}
        {/* Purpose: Display three main service options with image sliders */}
        {/* Cards: Report Disaster, Request Aid, Damage Claiming */}
        {/* ======================================== */}
        <div className="cards">
          {/* ======================================== */}
          {/* UI COMPONENT: REPORT DISASTER CARD */}
          {/* Purpose: Quick access to disaster reporting service */}
          {/* Features: Image slider, urgent pill, call-to-action */}
          {/* ======================================== */}
          <article className="card c-report">
            <MiniSlider images={reportImgs} height={250} alt="Disaster report photos" />
            <div className="card__head">
              <h3>Report Disaster</h3>
              <span className="pill pill-warn">Urgent</span>
            </div>
            <p>Quickly report an incident with live GPS location, photos and a short description to alert authorities.</p>
            <Link to="/victim/report" className="card__action">Report Now →</Link>
            <span className="glow" />
          </article>

          {/* ======================================== */}
          {/* UI COMPONENT: REQUEST AID CARD */}
          {/* Purpose: Access to aid request service */}
          {/* Features: Image slider, live pill, call-to-action */}
          {/* ======================================== */}
          <article className="card c-aid">
            <MiniSlider images={aidImgs} height={250} alt="Aid request photos" />
            <div className="card__head">
              <h3>Request Aid</h3>
              <span className="pill pill-ok">Live</span>
            </div>
            <p>Ask for food, water, shelter, medical help or other essentials.</p>
            <Link to="/victim/aid" className="card__action">Request Aid →</Link>
            <span className="glow" />
          </article>

          {/* ======================================== */}
          {/* UI COMPONENT: DAMAGE CLAIM CARD */}
          {/* Purpose: Access to damage claim service */}
          {/* Features: Image slider, call-to-action */}
          {/* ======================================== */}
          <article className="card c-claim">
            <MiniSlider images={claimImgs} height={250} alt="Damage claim photos" />
            <div className="card__head">
              <h3>Damage Claiming</h3>
            </div>
            <p>Submit your damage claim with evidence and follow up on approvals and payouts.</p>
            <Link to="/victim/claim" className="card__action">Start Claim →</Link>
            <span className="glow" />
          </article>
        </div>

        {/* ======================================== */}
        {/* UI COMPONENT: SIDEBAR WIDGETS */}
        {/* Purpose: Display helpful information and statistics */}
        {/* Widgets: Recent Requests, Safety Tips, Weather, Emergency Contacts */}
        {/* ======================================== */}
        <aside className="side">
          {/* ======================================== */}
          {/* UI COMPONENT: RECENT REQUESTS WIDGET */}
          {/* Purpose: Display statistics table with counts and last submission dates */}
          {/* Features: Live data, loading states, responsive table */}
          {/* ======================================== */}
          <section className="widget">
            <header className="widget__head">
              <h4>Recent Requests</h4>
              <span className="pill">Live</span>
            </header>
            <div className="widget__body">
              <table className="table reqs">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="center">Count</th>
                    <th>Last submitted</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Report</td>
                    <td className="center">
                      <span className="count-pill">{loadingReqs ? "…" : stats.report.count}</span>
                    </td>
                    <td className="time">{loadingReqs ? "…" : fmt(stats.report.last)}</td>
                  </tr>
                  <tr>
                    <td>Aid</td>
                    <td className="center">
                      <span className="count-pill">{loadingReqs ? "…" : stats.aid.count}</span>
                    </td>
                    <td className="time">{loadingReqs ? "…" : fmt(stats.aid.last)}</td>
                  </tr>
                  <tr>
                    <td>Claim</td>
                    <td className="center">
                      <span className="count-pill">{loadingReqs ? "…" : stats.claim.count}</span>
                    </td>
                    <td className="time">{loadingReqs ? "…" : fmt(stats.claim.last)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ======================================== */}
          {/* UI COMPONENT: SAFETY TIPS WIDGET */}
          {/* Purpose: Display rotating safety tips using VerticalTips component */}
          {/* Features: Auto-scrolling text, hover effects */}
          {/* ======================================== */}
          <section className="widget">
            <header className="widget__head">
              <h4>Safety Tips</h4>
            </header>
            <div className="widget__body">
              <VerticalTips tips={safetyTips} rowHeight={70} />
            </div>
          </section>

          {/* ======================================== */}
          {/* UI COMPONENT: WEATHER WIDGET */}
          {/* Purpose: Display current weather and alerts */}
          {/* Features: Temperature, conditions, humidity, wind, alerts */}
          {/* ======================================== */}
          <section className="widget weather-widget">
            <header className="widget__head">
              <h4>Weather & Alerts</h4>
              <span className="pill pill-ok">Live</span>
            </header>
            <div className="widget__body">
              <div className="weather-main">
                <div className="weather-temp">{loadingWeather ? "..." : weatherInfo.temperature}</div>
                <div className="weather-condition">{loadingWeather ? "Loading..." : weatherInfo.condition}</div>
                <div className="weather-location">{loadingWeather ? "Getting location..." : weatherInfo.location}</div>
              </div>
              <div className="weather-details">
                <div className="weather-item">
                  <span className="weather-label">Humidity:</span>
                  <span className="weather-value">{loadingWeather ? "..." : weatherInfo.humidity}</span>
                </div>
                <div className="weather-item">
                  <span className="weather-label">Wind:</span>
                  <span className="weather-value">{loadingWeather ? "..." : weatherInfo.wind}</span>
                </div>
              </div>
              <div className="weather-alert">
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">{loadingWeather ? "Loading weather data..." : weatherInfo.alert}</span>
              </div>
            </div>
          </section>

          {/* ======================================== */}
          {/* UI COMPONENT: EMERGENCY CONTACTS WIDGET */}
          {/* Purpose: Display emergency contact information */}
          {/* Features: Contact cards with names, numbers, and type badges */}
          {/* ======================================== */}
          <section className="widget emergency-widget">
            <header className="widget__head">
              <h4>Emergency Contacts</h4>
              <span className="pill pill-warn">Critical</span>
            </header>
            <div className="widget__body">
              <div className="emergency-list">
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="emergency-item">
                    <div className="emergency-info">
                      <div className="emergency-name">{contact.name}</div>
                      <div className="emergency-number">{contact.number}</div>
                    </div>
                    <div className={`emergency-type emergency-type-${contact.type.toLowerCase()}`}>
                      {contact.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </section>

      {/* ======================================== */}
      {/* UI COMPONENT: FOOTER DISCLAIMER */}
      {/* Purpose: Important emergency notice */}
      {/* ======================================== */}
      <p className="footnote">If this is an emergency, call local authorities immediately.</p>
    </main>
  );
}
