import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function DonationSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { key: "overview",     icon: "📊", label: "Overview",                 route: "/dashboard/overview" },
    { key: "donations",    icon: "💝", label: "Donations",                route: "/dashboard/donations" },
    { key: "disasters",    icon: "🚨", label: "Active Disasters",         route: "/dashboard/disasters/active" },
    { key: "inventory",    icon: "📦", label: "Relief Quantities",        route: "/dashboard/inventory" },
    { key: "centers",      icon: "📍", label: "Collecting Centers",       route: "/dashboard/centers" },
{ key: "volunteers", icon: "🧑‍🤝‍🧑", label: "Volunteers & Assignments", route: "/dashboard/volunteers" },
    { key: "distribution", icon: "🗺️", label: "Relief Distribution",     route: "/dashboard/distribution" },
        { key: "ngopast",      icon: "📜", label: "NGO Past",                 route: "/dashboard/ngopast" },


  ];

  const isActive = (route) =>
    location.pathname === route || location.pathname.startsWith(route + "/");

  return (
    <aside style={{
      width: '280px',
      background: '#1e293b',
      color: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      left: 0,
      top: 0,
      zIndex: 1000,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.3s ease'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #475569',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          backgroundColor: '#3b82f6',
          borderRadius: '8px',
          color: '#ffffff'
        }}>🏥</div>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#f1f5f9'
        }}>NGO Dashboard</h2>
      </div>

      <nav style={{
        flex: 1,
        padding: '20px 0',
        overflowY: 'auto'
      }}>
        {navigationItems.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.route)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              border: 'none',
              background: isActive(item.route) ? '#3b82f6' : 'transparent',
              color: '#f1f5f9',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left',
              borderLeft: isActive(item.route) ? '3px solid #60a5fa' : '3px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.route)) {
                e.target.style.backgroundColor = '#334155';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.route)) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px'
            }}>{item.icon}</span>
            <span style={{
              flex: 1,
              fontSize: '14px',
              fontWeight: '500'
            }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{
        padding: '20px',
        borderTop: '1px solid #475569'
      }}>
        <button 
          onClick={() => navigate("/donation")}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            border: 'none',
            background: '#3b82f6',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '8px',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2563eb';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <span style={{
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px'
          }}>🌐</span>
          <span style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: '600'
          }}>Public Site</span>
        </button>
      </div>
    </aside>
  );
}
