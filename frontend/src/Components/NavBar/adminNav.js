import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./adminNav.css";
import logo from "../images/logo.jpg";

export default function Nav() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // session
  const [adm, setAdm] = useState(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const r = await fetch("http://localhost:5000/admin/auth/me", {
          credentials: "include",
        });
        if (!off) setAdm(r.ok ? (await r.json()).admin : null);
      } catch {
        if (!off) setAdm(null);
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  const doLogout = async () => {
    try {
      await fetch("http://localhost:5000/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      setAdm(null);
      nav("/Home");
    } catch {}
  };

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link to="/AdminHome" className="brand" aria-label="Go to dashboard">
          <img
            className="logo-img"
            src={logo}
            alt="SafeZone logo"
          />
          <span className="btxt">Admin Dashboard</span>
        </Link>

        <nav className="links" aria-label="Primary">
          <Link
            className={`link ${pathname.includes("/toAlerts") ? "active" : ""}`}
            to="/AdminHome/toAlerts"
          >
            All Alerts
          </Link>
          <Link
            className={`link ${pathname.includes("/AlertAdd") ? "active" : ""}`}
            to="/AdminHome/AlertAdd"
          >
            DMO Dashboard
          </Link>
          <Link
            className={`link ${pathname.includes("/AdminRegitration") ? "active" : ""}`}
            to="/AdminHome/AdminRegitration"
          >
            Add Admin
          </Link>
          <Link
            className={`link ${pathname.includes("/AdminProfile") ? "active" : ""}`}
            to="/AdminHome/AdminProfile"
          >
            Profile
          </Link>

          {!adm ? (
            /* Uiverse-inspired login button as a Link */
            <Link to="/AdminLogin" className="btn-admin-login" role="button">
              <span>Login</span>
              <span>Login</span>
            </Link>
          ) : (
            <div className="user">
              <button
                className="ubtn"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-haspopup="menu"
              >
                <div className="ava">
                  {(adm.name || "A").charAt(0).toUpperCase()}
                </div>
                <span className="hi">Hi, {adm.name}</span>
                <span className={`car ${menu ? "open" : ""}`}>▾</span>
              </button>

              {menu && (
                <div
                  className="menu"
                  onMouseLeave={() => setMenu(false)}
                  role="menu"
                >
                  <div className="umeta">
                    <div className="ava big">
                      {(adm.name || "A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="uname">{adm.name}</div>
                      <div className="usub">{adm.email}</div>
                      <div className="usub">{adm.adminName}</div>
                    </div>
                  </div>

                  <Link
                    className="mitem"
                    to="/AdminHome"
                    onClick={() => setMenu(false)}
                    role="menuitem"
                  >
                    Dashboard
                  </Link>
                  <Link
                    className="mitem"
                    to="/AdminHome/toAlerts"
                    onClick={() => setMenu(false)}
                    role="menuitem"
                  >
                    All alerts
                  </Link>
                  <Link
                    className="mitem"
                    to="/AdminHome/AlertAdd"
                    onClick={() => setMenu(false)}
                    role="menuitem"
                  >
                    Create alert
                  </Link>
                  <button className="mitem bad" onClick={doLogout} role="menuitem">
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
