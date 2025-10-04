import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../Images/logo.jpg"; // your logo

export default function Nav() {
  const navigate = useNavigate();

  // session
  const [user, setUser] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetch("http://localhost:5000/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => mounted && setUser(data?.user || null))
      .catch(() => setUser(null));
    return () => { mounted = false; };
  }, []);

  const onLogout = async () => {
    try {
      await fetch("http://localhost:5000/users/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/");
    } catch {}
  };

  // dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const toggleMenu = () => setMenuOpen(v => !v);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return;
      if (
        menuRef.current &&
        btnRef.current &&
        !menuRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  return (
    <header className="sz-nav sz-nav-glass">
      <div className="sz-container sz-nav-inner">
        {/* Brand */}
        <Link to="/" className="sz-brand" aria-label="SafeZone Home">
          <img className="sz-logo-img" src={logo} alt="SafeZone logo" />
          <span className="sz-brand-text">SafeZone</span>
        </Link>

        {/* Links */}
        <nav className="sz-links">
          <NavLink to="/" className="sz-link" end>Home</NavLink>
          <NavLink to="/dashboard" className="sz-link">Dashboard</NavLink>
          <NavLink to="/map" className="sz-link">Map</NavLink>
          <NavLink to="/contact" className="sz-link">Contact Us</NavLink>

          {!user ? (
            <>
              <Link to="/Registration" className="sz-btn sz-btn-primary">Register</Link>
              <Link to="/UserLogin" className="sz-btn sz-btn-outline">Login</Link>
            </>
          ) : (
            <div className="sz-user-block">
              <button
                ref={btnRef}
                className="sz-user-btn"
                onClick={toggleMenu}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="sz-avatar sz-avatar-ring">
                  {user.firstName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="sz-hello">Hi, {user.firstName}</span>
                <svg
                  className={`sz-caret ${menuOpen ? "open" : ""}`}
                  width="16" height="16" viewBox="0 0 24 24"
                >
                  <path fill="currentColor" d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {menuOpen && (
                <div ref={menuRef} className="sz-user-menu" role="menu" aria-label="User menu">
                  <div className="sz-user-meta">
                    <div className="sz-avatar large sz-avatar-ring">
                      {user.firstName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="sz-user-name">{user.firstName} {user.lastName}</div>
                      <div className="sz-user-sub">{user.email}</div>
                    </div>
                  </div>

                  {/* Added items here */}
                  <Link to="/dashboard" className="sz-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/map" className="sz-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Map
                  </Link>
                  <Link to="/user-map" className="sz-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                    My Map
                  </Link>

                  <button className="sz-menu-item danger" role="menuitem" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
