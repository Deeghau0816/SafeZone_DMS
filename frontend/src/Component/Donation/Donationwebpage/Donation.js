import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";

import DistributionPlan from "../Donate_distributionplan/Distributionplan";
import "../Donate_distributionplan/Distributionplan.css";
import "./Donation.css";

/* ---------- API Configuration ---------- */
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5000";
const DISASTERS_API = `${API_BASE}/api/activedisasters`;
const CENTERS_API = `${API_BASE}/api/collectingcenters`;
const INVENTORY_API = `${API_BASE}/api/inventory`;
const DISTRIBUTION_API = `${API_BASE}/api/distributionrecords`;
const NGO_PAST_API = `${API_BASE}/api/ngopast`; // Add NGO past records API

const toAbs = (u) => (!u ? "" : /^https?:/i.test(u) ? u : `${API_BASE}${u}`);

// Item mapping (keys + labels + units + targets)
const ITEM_OPTIONS = [
  { value: "dry_rations", label: "Dry rations", unit: "packs", target: 1000 },
  { value: "water", label: "Water", unit: "liters", target: 800 },
  { value: "bedding", label: "Bedding", unit: "sets", target: 200 },
  { value: "medical", label: "Medical kits", unit: "kits", target: 150 },
  { value: "clothing", label: "Clothing", unit: "sets", target: 300 },
  { value: "hygiene", label: "Hygiene packs", unit: "packs", target: 250 },
];

/* ---------- Needs bar row ---------- */
const NeedBar = ({ label, value, max, color, unit, coverage }) => {
  return (
    <div className="need-row">
      <div className="need-label">
        {label}
        <span className="need-unit">({unit})</span>
      </div>
      <div className="need-bar" role="progressbar" aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} coverage`}>
        <div className="need-fill" style={{ width: `${coverage}%`, background: color }} />
      </div>
      <div className="need-val">{Math.round(coverage)}%</div>
    </div>
  );
};

/* ---------- Mini image rotator ---------- */
const MiniRotator = ({ images = [], interval = 3500, alt = "" }) => {
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const useAuto = useRef(
    typeof window !== "undefined" &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (!useAuto.current || images.length <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setI((p) => (p + 1) % images.length);
    }, interval);
    return () => clearInterval(id);
  }, [images.length, interval]);

  return (
    <div
      className="rotator"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {images.map((src, idx) => (
        <img key={idx} src={src} alt={alt} className={i === idx ? "show" : ""} />
      ))}
      {images.length > 1 && (
        <div className="dots" aria-label="Image selector">
          {images.map((_, d) => (
            <button
              key={d}
              className={"dot" + (i === d ? " active" : "")}
              onClick={() => setI(d)}
              type="button"
              aria-label={`Show image ${d + 1}`}
              aria-pressed={i === d}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Modal via portal ---------- */
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-body"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close" type="button">
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};

/* ---------- Progress Bar ---------- */
const PBar = ({ label, value, color }) => (
  <div className="pbar-wrap">
    <div className="pbar-top">
      <strong>{label}</strong>
      <strong>{value}%</strong>
    </div>
    <div className="pbar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="pbar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

/* ---------- distance helper ---------- */
const haversine = (a, b) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

/* ---------- Severity color mapping ---------- */
const getSeverityColor = (severity) => {
  switch ((severity || "").toLowerCase()) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#6b7280";
  }
};

/* ---------- Coverage color helper ---------- */
const getCoverageColor = (coverage) => {
  if (coverage >= 80) return "#22c55e";
  if (coverage >= 60) return "#f59e0b";
  if (coverage >= 30) return "#f97316";
  return "#ef4444";
};

export default function Donation() {
  const [showDonateSection, setShowDonateSection] = useState(false);
  const [centerIdx, setCenterIdx] = useState(0);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [showPlan, setShowPlan] = useState(false);

  // API data state
  const [disasters, setDisasters] = useState([]);
  const [centers, setCenters] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centersLoading, setCentersLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [centersError, setCentersError] = useState("");
  const [inventoryError, setInventoryError] = useState("");

  // Distribution data state
  const [records, setRecords] = useState([]);
  const [todayFamilies, setTodayFamilies] = useState(0);
  const [todayResources, setTodayResources] = useState(0);
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [distributionError, setDistributionError] = useState("");

  // NGO Past Records state
  const [ngoRecords, setNgoRecords] = useState([]);
  const [ngoRecordsLoading, setNgoRecordsLoading] = useState(true);
  const [ngoRecordsError, setNgoRecordsError] = useState("");

  // header bubbles
  const bubbles = useMemo(() => ["/aa.png", "/as.png", "/ad.png"], []);

  /* ---------- Scroll to top function ---------- */
  const scrollToTop = useCallback(() => {
    const topElement =
      document.getElementById("don-top") ||
      document.querySelector(".hero") ||
      document.querySelector("body");

    if (topElement?.scrollIntoView) {
      try {
        topElement.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      } catch {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    } else {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  /* ---------- Fetch disasters from API ---------- */
  const fetchDisasters = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(DISASTERS_API);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      const disastersArray = Array.isArray(data) ? data : [];

      // only active + showOnDonation
      const activeDisasters = disastersArray.filter((d) => d.active && d.showOnDonation);

      const transformedDisasters = activeDisasters.map((disaster, index) => {
        const images = [];
        if (disaster.images?.gallery) {
          disaster.images.gallery.forEach((img) => {
            if (img) images.push(toAbs(img));
          });
        }
        // fallback mapping per disaster name
        const fallbackImages = {
          "Flood in Kandy": "/disasters/flood-kandy.jpg",
          "Flood Response": "/disasters/flood-ratnapura.jpg",
          "Cyclone/Storm Aid": "/disasters/storm-gampaha.jpg",
          "Landslide Relief": "/disasters/landslide-kegalle.jpg",
        };

        // use fallback if no gallery images
        if (images.length === 0) {
          const fallback = fallbackImages[disaster.name] || `/disasters/default-1.jpg`;
          images.push(fallback);
        }

        let needs = [];
        if (Array.isArray(disaster.needs)) needs = disaster.needs;
        else if (typeof disaster.needs === "string")
          needs = disaster.needs.split(",").map((n) => n.trim()).filter(Boolean);

        return {
          key: disaster._id,
          name: disaster.name,
          city: disaster.city,
          imgs: images,
          summary: disaster.summary || "Support needed for this disaster relief effort.",
          needs,
          severity: disaster.severity || "Medium",
          accentColor: disaster.accentColor || "#22c55e",
        };
      });

      setDisasters(transformedDisasters);
    } catch (err) {
      console.error("Failed to fetch disasters:", err);
      setError(err.message || "Failed to load disasters");
      setDisasters([
        { key: "flood", name: "Flood Response", city: "Ratnapura", imgs: ["/disasters/flood-1.jpg", "/disasters/flood-2.jpg"], summary: "Severe flooding has displaced families near the Kalu Ganga.", needs: ["Dry rations", "Water", "Bedding"], severity: "High", accentColor: "#22c55e" },
        { key: "landslide", name: "Landslide Relief", city: "Kegalle", imgs: ["/disasters/landslide-1.jpg", "/disasters/landslide-2.jpg"], summary: "Multiple slope failures reported after heavy rainfall.", needs: ["Medical kits", "Blankets", "Tools"], severity: "Critical", accentColor: "#ef4444" },
        { key: "storm", name: "Cyclone / Storm Aid", city: "Matara", imgs: ["/disasters/storm-1.jpg", "/disasters/storm-2.jpg"], summary: "Coastal communities affected by high winds and rainbands.", needs: ["Tarpaulins", "Clothing", "Baby items"], severity: "Medium", accentColor: "#eab308" },
        { key: "fire", name: "Urban Fire Support", city: "Galle", imgs: ["/disasters/fire-1.jpg", "/disasters/fire-2.jpg"], summary: "Emergency shelter and supplies for families displaced by a fire.", needs: ["Hygiene packs", "Food", "Medicines"], severity: "High", accentColor: "#f97316" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------- Fetch centers from API ---------- */
  const fetchCenters = useCallback(async () => {
    try {
      setCentersLoading(true);
      setCentersError("");

      const response = await fetch(CENTERS_API);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      const centersArray = Array.isArray(data) ? data : [];

      const transformedCenters = centersArray.map((center) => ({
        id: center._id,
        name: center.name,
        address: center.address,
        phone: center.phone,
        city: center.city,
        lat: center.lat,
        lng: center.lng,
        hours: center.hours,
        tags: center.tags || ["Food", "Medical", "Clothing"],
      }));

      setCenters(transformedCenters);
    } catch (err) {
      console.error("Failed to fetch centers:", err);
      setCentersError(err.message || "Failed to load centers");
      setCenters([
        { id: "1", name: "Ratnapura Relief Center", address: "No. 12 River Rd, Ratnapura", phone: "+94 11 234 5678", city: "Ratnapura", lat: 6.6828, lng: 80.3996, tags: ["Food", "Medical", "Clothing"] },
        { id: "2", name: "Kegalle Community Hub", address: "45 Temple Lane, Kegalle", phone: "+94 35 223 4455", city: "Kegalle", lat: 7.2513, lng: 80.3464, tags: ["Food", "Medical", "Clothing"] },
        { id: "3", name: "Matara City Camp B", address: "Sector 7, Relief Camp B, Matara", phone: "+94 41 222 1188", city: "Matara", lat: 5.9549, lng: 80.555, tags: ["Food", "Medical", "Clothing"] },
        { id: "4", name: "Galle Coastal Center", address: "18 Lighthouse Rd, Galle", phone: "+94 91 222 7755", city: "Galle", lat: 6.0329, lng: 80.2168, tags: ["Food", "Medical", "Clothing"] },
      ]);
    } finally {
      setCentersLoading(false);
    }
  }, []);

  /* ---------- Fetch inventory from API ---------- */
  const fetchInventory = useCallback(async () => {
    try {
      setInventoryLoading(true);
      setInventoryError("");
      const response = await fetch(INVENTORY_API);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setInventoryData(data.items || []);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setInventoryError(err.message || "Failed to load inventory");
      setInventoryData([]);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  /* ---------- Fetch distribution records from API ---------- */
  const fetchDistributionRecords = useCallback(async () => {
    try {
      setDistributionLoading(true);
      setDistributionError("");
      const response = await fetch(DISTRIBUTION_API);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const result = await response.json();
      const recs = result.data || [];
      setRecords(recs);

      // Filter only today's records
      const today = new Date().toISOString().slice(0, 10);
      const todaysRecords = recs.filter(
        (r) => new Date(r.timestamp).toISOString().slice(0, 10) === today
      );

      // Calculate totals
      const totalFamilies = todaysRecords.reduce(
        (sum, r) => sum + Number(r.familiesAssisted || 0),
        0
      );
      const totalResources = todaysRecords.reduce(
        (sum, r) => sum + Number(r.resourcesDistributed || 0),
        0
      );

      setTodayFamilies(totalFamilies);
      setTodayResources(totalResources);
    } catch (err) {
      console.error("Failed to fetch distribution records:", err);
      setDistributionError(err.message || "Failed to load distribution data");
      // Set some default values for fallback
      setTodayFamilies(62);
      setTodayResources(48);
    } finally {
      setDistributionLoading(false);
    }
  }, []);

  /* ---------- Fetch NGO Past Records from API ---------- */
  const fetchNgoRecords = useCallback(async () => {
    try {
      setNgoRecordsLoading(true);
      setNgoRecordsError("");
      const response = await fetch(NGO_PAST_API);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const data = await response.json();
      const recordsArray = Array.isArray(data) ? data : [];
      
      // Sort by date (newest first) and limit to recent records
      const sortedRecords = recordsArray
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6); // Show only 6 most recent records
      
      setNgoRecords(sortedRecords);
    } catch (err) {
      console.error("Failed to fetch NGO records:", err);
      setNgoRecordsError(err.message || "Failed to load NGO records");
      setNgoRecords([]);
    } finally {
      setNgoRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisasters();
    fetchCenters();
    fetchInventory();
    fetchDistributionRecords();
    fetchNgoRecords(); // Add NGO records fetch
  }, [fetchDisasters, fetchCenters, fetchInventory, fetchDistributionRecords, fetchNgoRecords]);

  // Calculate inventory analytics
  const inventoryAnalytics = useMemo(() => {
    const analytics = ITEM_OPTIONS.map((type) => {
      const total = inventoryData
        .filter((item) => item.item === type.value)
        .reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      const coverage = type.target > 0 ? Math.min((total / type.target) * 100, 100) : 100;
      const need = Math.max(type.target - total, 0);
      
      return {
        ...type,
        have: total,
        need,
        coverage,
        color: getCoverageColor(coverage),
      };
    });

    // Sort by coverage (most needed first)
    return analytics.sort((a, b) => a.coverage - b.coverage);
  }, [inventoryData]);

  const todayProgress =
    todayFamilies > 0
      ? Math.round((todayResources / todayFamilies) * 100)
      : 0;

  /* ---------- Search & location state ---------- */
  const [searchMode, setSearchMode] = useState("hometown"); // 'hometown' | 'near'
  const [query, setQuery] = useState("");

  // live location
  const [myPos, setMyPos] = useState(null); // {lat, lon}
  const [live, setLive] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const watchIdRef = useRef(null);
  const lastPosRef = useRef(null);

  // computed distances: { centerIdOrName: km }
  const [distanceKm, setDistanceKm] = useState({});

  /* ---------- Location helpers ---------- */
  const locateOnce = useCallback(() => {
    setGeoErr("");
    if (!("geolocation" in navigator)) {
      setGeoErr("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const last = lastPosRef.current;
        if (!last || last.lat !== p.lat || last.lon !== p.lon) {
          lastPosRef.current = p;
          setMyPos(p);
        }
      },
      (err) => setGeoErr(err.message || "Failed to get location"),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  }, []);

  const startLive = useCallback(() => {
    setGeoErr("");
    if (!("geolocation" in navigator)) {
      setGeoErr("Geolocation not supported in this browser.");
      return;
    }
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          const last = lastPosRef.current;
          if (!last || last.lat !== p.lat || last.lon !== p.lon) {
            lastPosRef.current = p;
            setMyPos(p);
          }
        },
        (err) => setGeoErr(err.message || "Failed to watch location"),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      watchIdRef.current = id;
    } catch {
      setGeoErr("Unable to start live location.");
    }
  }, []);

  const stopLive = useCallback(() => {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /* ---------- manage live lifecycle (no loops) ---------- */
  useEffect(() => {
    if (searchMode !== "near") {
      if (live) setLive(false);
      stopLive();
      return;
    }
    if (live && !watchIdRef.current) startLive();
    if (!live && watchIdRef.current) stopLive();
    return () => {
      if (watchIdRef.current && searchMode === "near" && !live) stopLive();
    };
  }, [live, searchMode, startLive, stopLive]);

  // when entering near mode first time, do one-shot locate
  useEffect(() => {
    if (searchMode === "near" && !live && !myPos) locateOnce();
  }, [searchMode, live, myPos, locateOnce]);

  /* ---------- Compute per-center distances ---------- */
  useEffect(() => {
    if (!myPos || !centers.length) {
      setDistanceKm((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    const next = {};
    centers.forEach((c) => {
      const hasCoords = c.lat != null && c.lng != null;
      const key = c.id || c.name;
      next[key] = hasCoords
        ? Math.round(haversine(myPos, { lat: c.lat, lon: c.lng }))
        : Infinity;
    });
    setDistanceKm((prev) => {
      const a = Object.keys(prev);
      const b = Object.keys(next);
      if (a.length === b.length && a.every((k) => prev[k] === next[k])) return prev;
      return next;
    });
  }, [myPos, centers]);

  const nearestSummary = useMemo(() => {
    if (!myPos || !Object.keys(distanceKm).length) return null;
    let best = { key: null, km: Infinity, city: "" };
    centers.forEach((c) => {
      const key = c.id || c.name;
      const km = distanceKm[key] ?? Infinity;
      if (km < best.km) best = { key, km, city: c.city || "" };
    });
    return best.km === Infinity ? null : best;
  }, [distanceKm, centers, myPos]);

  /* ---------- Filtering & sorting ---------- */
  const disasterFiltered = selectedDisaster
    ? centers.filter((c) => c.city === selectedDisaster.city)
    : centers;

  const centersFiltered = useMemo(() => {
    let base = disasterFiltered;

    if (searchMode === "hometown") {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        base = base.filter(
          (c) =>
            (c.city || "").toLowerCase().includes(q) ||
            (c.name || "").toLowerCase().includes(q) ||
            (c.address || "").toLowerCase().includes(q)
        );
      }
      return base;
    }

    if (searchMode === "near") {
      const withKey = base.map((c) => ({ c, key: c.id || c.name }));
      withKey.sort((a, b) => {
        const da = distanceKm[a.key] ?? Infinity;
        const db = distanceKm[b.key] ?? Infinity;
        return da - db;
      });
      return withKey.map((x) => x.c);
    }

    return base;
  }, [disasterFiltered, searchMode, query, distanceKm]);

  // keep a visible selection when list changes
  useEffect(() => {
    if (!centersFiltered.length) return;
    const visibleIndexes = centersFiltered.map((c) =>
      centers.findIndex((cc) => (cc.id ? cc.id === c.id : cc.name === c.name))
    );
    if (!visibleIndexes.includes(centerIdx)) setCenterIdx(visibleIndexes[0]);
  }, [centersFiltered, centers, centerIdx]);

  const currentCenter = centers[centerIdx] || centersFiltered[0] || centers[0];

  const mapEmbed =
    currentCenter && currentCenter.lat != null && currentCenter.lng != null
      ? `https://www.google.com/maps?q=${currentCenter.lat},${currentCenter.lng}&z=14&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(currentCenter?.address || "")}&output=embed`;

  const goDonate = () => {
    setShowDonateSection(true);
    setTimeout(() => {
      document.querySelector("#donate-section")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  return (
    <div className="don-page">
      {/* ---------- HERO ---------- */}
      <section id="don-top" className="hero wrap" aria-label="Donation hero">
        <div className="hero-bubbles" aria-hidden="true">
          {bubbles.map((b, i) => (
            <img className={`bub b${i}`} key={i} src={b} alt="" />
          ))}
        </div>

        <div className="hero-content-wrapper">
          <h1 className="hero-title">Support Disaster Relief</h1>
          <p className="hero-sub">
            Help families with food, medicine, shelter and recovery. Your contribution matters.
          </p>

          <div className="hero-actions">
            <Link to="/donation/new" className="hero-btn primary">Start Fundraising</Link>
            <Link to="/volunteers" className="hero-btn secondary">Become a volunteer</Link>
            <button className="hero-btn primary" onClick={goDonate} type="button">Donate Items</button>
          </div>
        </div>
      </section>

      {/* ---------- OVERVIEW ---------- */}
      <section className="overview wrap" aria-label="Overview and needs">
        <div className="panel">
          <div className="panel-head">
            <h3>Most Needed Now</h3>
            <span className="muted small">
              {selectedDisaster ? selectedDisaster.city : "All locations"}
            </span>
            {inventoryError && <div style={{color: '#ef4444', fontSize: '12px', marginTop: '4px'}}>{inventoryError}</div>}
          </div>
          
          {inventoryLoading ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#6b7280'}}>
              Loading inventory data...
            </div>
          ) : inventoryAnalytics.length > 0 ? (
            inventoryAnalytics.slice(0, 6).map((item) => (
              <NeedBar
                key={item.value}
                label={item.label}
                value={item.have}
                max={item.target}
                color={item.color}
                unit={item.unit}
                coverage={item.coverage}
              />
            ))
          ) : (
            <div style={{padding: '20px', textAlign: 'center', color: '#6b7280'}}>
              No inventory data available
            </div>
          )}
        </div>

        <div 
          className="panel progress-card"
          style={{
            backgroundImage: 'url(/distri.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            color: 'black',
            position: 'relative'
          }}
        >
          <div className="panel-head">
            <h3>Today's Progress</h3>
            <span className="status-chip in">In progress</span>
            {distributionError && (
              <div style={{color: '#ef4444', fontSize: '12px', marginTop: '4px'}}>
                {distributionError}
              </div>
            )}
          </div>

          {distributionLoading ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#6b7280'}}>
              Loading distribution data...
            </div>
          ) : (
            <>
              {/* Show raw values */}
              <div style={{marginBottom: '15px'}}>
                <p><strong>Families assisted:</strong> {todayFamilies}</p>
                <p><strong>Resources distributed:</strong> {todayResources}</p>
              </div>

              {/* Single progress bar */}
              <PBar label="Overall progress" value={todayProgress} color="#22c55e" />
            </>
          )}

          <div className="mt8">
            <br />
            <button
              className="distribution-plan-btn"
              onClick={() => setShowPlan(true)}
              type="button"
            >
              Distribution plan
            </button>
          </div>
        </div>

      </section>

      {/* ---------- ACTIVE DISASTERS ---------- */}
      <section className="wrap" aria-label="Active disasters">
        <div className="section-head">
          <h3>Active Disasters</h3>
          <span className="muted small">Choose a cause to support directly</span>
          {error && <div style={{color: '#ef4444', fontSize: '14px', marginTop: '8px'}}>{error}</div>}
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
            Loading disasters...
          </div>
        ) : disasters.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
            No active disasters found. Check back later or contact administration.
          </div>
        ) : (
          <div className="grid">
            {disasters.map((d) => (
              <article key={d.key} className="card">
                <div className="media">
                  <MiniRotator images={d.imgs} alt={d.name} />
                  <span className="badge" style={{backgroundColor: getSeverityColor(d.severity)}}>
                    {d.city}
                  </span>
                </div>

                <div className="body">
                  <h4>{d.name}</h4>
                  <p className="muted">{d.summary}</p>
                  <div className="tags">
                    {d.needs.slice(0, 3).map((n) => (
                      <span key={n} className="tag">{n}</span>
                    ))}
                    {d.needs.length > 3 && (
                      <span className="tag">+{d.needs.length - 3} more</span>
                    )}
                  </div>
                  <div className="actions">
                    <button
                      className="pill"
                      style={{backgroundColor: d.accentColor}}
                      onClick={() => {
                        setSelectedDisaster(d);
                        setShowDonateSection(true);
                        setTimeout(() => {
                          document.querySelector("#donate-section")?.scrollIntoView({ behavior: "smooth" });
                        }, 0);
                      }}
                      type="button"
                      aria-label={`Support ${d.name} in ${d.city}`}
                    >
                      Support this cause
                    </button>
                    <button
                      className="pill ghost"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/${encodeURIComponent(
                            d.city + " relief centers"
                          )}`,
                          "_blank"
                        )
                      }
                      type="button"
                    >
                      Find nearby centers
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------- DONATION (centers + map) ---------- */}
      {showDonateSection && (
        <section id="donate-section" className="donate-grid wrap" aria-label="Donate items and centers list">
          <div>
            {/* Search panel */}
            <div className="panel search-panel">
              <div className="toggle-group" role="tablist" aria-label="Search mode">
                <button
                  className={"tg " + (searchMode === "hometown" ? "active" : "")}
                  onClick={() => setSearchMode("hometown")}
                  type="button"
                  role="tab"
                  aria-selected={searchMode === "hometown"}
                >
                  Search by hometown
                </button>
                <button
                  className={"tg " + (searchMode === "near" ? "active" : "")}
                  onClick={() => {
                    setSearchMode("near");
                    locateOnce();
                  }}
                  type="button"
                  role="tab"
                  aria-selected={searchMode === "near"}
                >
                  Near me
                </button>
              </div>

              {searchMode === "hometown" && (
                <>
                  <label className="search-label" htmlFor="home-city">Hometown / city</label>
                  <input
                    id="home-city"
                    className="input search-input"
                    placeholder="e.g., Matara"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="search-hint">
                    {query.trim() ? (
                      <>
                        Showing results for <b>{query}</b>.{" "}
                        <button className="link-btn" onClick={() => setQuery("")} type="button">
                          Clear
                        </button>
                      </>
                    ) : (
                      <>Tip: type a city/name/address to filter the list.</>
                    )}
                  </div>
                </>
              )}

              {searchMode === "near" && (
                <div className="near-wrap">
                  <div className="near-line">
                    {myPos ? (
                      nearestSummary ? (
                        <>
                          Nearest: <b>{nearestSummary.km} km</b>
                          {nearestSummary.city ? ` • ${nearestSummary.city}` : ""}
                        </>
                      ) : (
                        "Calculating nearby centers…"
                      )
                    ) : (
                      "Locating…"
                    )}
                    {geoErr && <div className="err">{geoErr}</div>}
                  </div>
                  <div className="near-actions">
                    <button type="button" className="btn btn-ghost small" onClick={locateOnce}>
                      Use my location again
                    </button>
                    <label className="live-toggle">
                      <input
                        type="checkbox"
                        checked={live}
                        onChange={(e) => setLive(e.target.checked)}
                      />
                      <span>Live location</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost small"
                      onClick={() => {
                        setSearchMode("hometown");
                        setQuery("");
                      }}
                    >
                      Switch to search
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Centers panel */}
            <div className="centers">
              <div className="row">
                <h3>Donation Centers</h3>
                <div className="row-actions">
                  <button className="pill outline accent" onClick={() => setShowPlan(true)} type="button">
                    Distribution plan
                  </button>
                  <button
                    className="link-btn"
                    onClick={scrollToTop}
                    type="button"
                    aria-label="Scroll to top of page"
                    title="Back to top"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6366f1",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "14px",
                      padding: "0",
                    }}
                  >
                    ↑ Back to top
                  </button>
                </div>
              </div>

              {selectedDisaster && (
                <div className="notice" role="status" aria-live="polite">
                  <strong>{selectedDisaster.name}</strong>
                  <div className="muted small">
                    {selectedDisaster.city} • {selectedDisaster.summary}
                  </div>
                </div>
              )}

              {centersLoading && (
                <div style={{textAlign: 'center', padding: '20px', color: '#6b7280'}}>
                  Loading centers...
                </div>
              )}

              {centersError && (
                <div style={{color: '#ef4444', fontSize: '14px', padding: '10px', textAlign: 'center'}}>
                  {centersError}
                </div>
              )}

              {!centersLoading && centersFiltered.length === 0 && (
                <div className="muted">No centers match this view.</div>
              )}

              {!centersLoading && centersFiltered.map((c) => {
                const realIndex = centers.findIndex((cc) =>
                  cc.id ? cc.id === c.id : cc.name === c.name
                );
                const key = c.id || c.name;
                const km = distanceKm[key];
                const showKm = searchMode === "near" && Number.isFinite(km);

                return (
                  <div
                    key={key}
                    className={`center ${realIndex === centerIdx ? "active" : ""}`}
                    onClick={() => setCenterIdx(realIndex)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setCenterIdx(realIndex)}
                    aria-pressed={realIndex === centerIdx}
                  >
                    <div className="center-title">{c.name}</div>
                    <div className="center-meta">
                      <span>{c.address}</span>
                      <span>•</span>
                      <a href={`tel:${(c.phone || "").replace(/\s/g, "")}`}>{c.phone}</a>
                      {showKm && (
                        <>
                          <span>•</span>
                          <span className="muted">~{km} km</span>
                        </>
                      )}
                    </div>
                    {Array.isArray(c.tags) && c.tags.length > 0 ? (
                      <div className="tags">
                        {c.tags.map((t) => (
                          <span className="tag" key={t}>{t}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="tags">
                        <span className="tag">Food</span>
                        <span className="tag">Medical</span>
                        <span className="tag">Clothing</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN (map) */}
          <div className="mapwrap">
            {currentCenter ? (
              <>
                <div className="map-head">
                  <div>
                    <div className="map-title">{currentCenter.name}</div>
                    <div className="muted">
                      {currentCenter.address} •{" "}
                      <a href={`tel:${(currentCenter.phone || "").replace(/\s/g, "")}`}>
                        {currentCenter.phone}
                      </a>
                    </div>
                  </div>
                  <a
                    className="pill"
                    target="_blank"
                    rel="noreferrer"
                    href={
                      currentCenter.lat != null && currentCenter.lng != null
                        ? `https://www.google.com/maps/dir/?api=1&destination=${currentCenter.lat},${currentCenter.lng}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            currentCenter.address || ""
                          )}`
                    }
                  >
                    Get Directions
                  </a>
                </div>
                <iframe
                  title={`map-${currentCenter.id || currentCenter.name}`}
                  className="map"
                  src={mapEmbed}
                  allowFullScreen
                  loading="lazy"
                />
              </>
            ) : (
              <div className="muted">No center selected.</div>
            )}
          </div>
        </section>
      )}

      {/* ---------- MODAL with Distribution Plan ---------- */}
      <Modal open={showPlan} onClose={() => setShowPlan(false)}>
        <DistributionPlan onClose={() => setShowPlan(false)} />
      </Modal>

      {/* ---------- NGO PAST RECORDS SECTION ---------- */}
      <section className="ngo-records-section wrap">
        <div className="ngo-info-panel">
          <h2 className="ngo-info-title"> Our Recent Work and Impact</h2>
          <p className="ngo-info-text">
            In times of disaster, every second counts. Our NGO connects <strong>resources, volunteers, and compassion</strong> 
            to provide rapid relief for affected families. 
            By working together, we ensure that no one is left behind - every donation, every helping hand, 
            and every shared act of kindness fuels <span className="highlight">hope and recovery</span>.
          </p>

          {/* NGO Records Display */}
          <div className="ngo-records-display">
            <h3>Recent Activities & Milestones</h3>
            
            {ngoRecordsLoading ? (
              <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
                Loading our recent work...
              </div>
            ) : ngoRecordsError ? (
              <div style={{color: '#ef4444', fontSize: '14px', padding: '20px', textAlign: 'center'}}>
                {ngoRecordsError}
              </div>
            ) : ngoRecords.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
                No recent records to display. Check back soon for updates on our latest activities.
              </div>
            ) : (
              <div className="ngo-records-grid">
                {ngoRecords.map((record) => (
                  <article key={record._id} className="ngo-record-card">
                    <div className="record-date">
                      📅 {record.date ? new Date(record.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      }) : 'Recent'}
                    </div>
                    
                    <div className="record-content">
                      <p className="record-note">{record.note}</p>
                      
                      {record.images && record.images.length > 0 && (
                        <div className="record-images">
                          {record.images.map((img, index) => (
                            <div key={index} className="record-image-wrapper">
                              <img 
                                src={`${API_BASE}${img.imageUrl}`} 
                                alt={`Activity from ${new Date(record.date).toLocaleDateString()}`}
                                className="record-image"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="ngo-contact">
            <h3><span className="contact-icon">📞</span> Get in Touch</h3>
            <div className="contact-grid">
              
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <p><strong>Address:</strong> 123 Relief Avenue, Colombo, Sri Lanka</p>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">☎️</span>
                <p><strong>Phone:</strong> <a href="tel:+94112345678">+94 11 234 5678</a></p>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <p><strong>Email:</strong> <a href="mailto:info@ngo.org">info@ngo.org</a></p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}