import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./donationcss/DonationSidebar.css";

export default function DonationSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { key: "overview",     icon: "📊", label: "Overview",                 route: "/ngo-dashboard/overview" },
    { key: "donations",    icon: "💝", label: "Donations",                route: "/ngo-dashboard/donations" },
    { key: "disasters",    icon: "🚨", label: "Active Disasters",         route: "/ngo-dashboard/disasters/active" },
    { key: "inventory",    icon: "📦", label: "Relief Quantities",        route: "/ngo-dashboard/inventory" },
    { key: "centers",      icon: "📍", label: "Collecting Centers",       route: "/ngo-dashboard/centers" },
    { key: "volunteers",   icon: "🧑‍🤝‍🧑", label: "Volunteers & Assignments", route: "/ngo-dashboard/volunteers" },
    { key: "distribution", icon: "🗺️", label: "Relief Distribution",     route: "/ngo-dashboard/distribution" },
    { key: "ngopast",      icon: "📜", label: "NGO Past",                 route: "/ngo-dashboard/ngopast" },
  ];

  const isActive = (route) => {
    const currentPath = location.pathname;
    // Handle default route (ngo-dashboard without sub-path)
    if (route === "/ngo-dashboard/overview" && currentPath === "/ngo-dashboard") {
      return true;
    }
    return currentPath === route || currentPath.startsWith(route + "/");
  };

  return (
    <aside className="donation-sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">🏥</div>
        <div className="brand-name">NGO</div>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${isActive(item.route) ? "active" : ""}`}
            onClick={() => navigate(item.route)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-actions">
        <button className="action-btn" onClick={() => navigate("/donation")}>
          <span className="nav-icon">🌐</span>
          <span className="nav-label">Public Site</span>
        </button>
      </div>
    </aside>
  );
}
