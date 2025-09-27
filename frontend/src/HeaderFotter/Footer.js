import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="safezone-footer">
      <div className="footer-grid">
        {/* Brand Section */}
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon"></div>
            <div>
              <div className="footer-logo-text">SafeZone</div>
              <div className="footer-logo-subtitle">Disaster Management Portal</div>
            </div>
          </div>
          <p className="footer-description">
            A secure platform to report incidents, request aid, and submit damage claims. Built with MERN for speed, reliability, and safety.
          </p>
          <div className="footer-social">
            <a href="http://www.linkedin.com/in/pasindi-alawatta-489781217" className="footer-social-btn" aria-label="Twitter">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M21.5 6.4c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.2 1.7-2.1-.8.5-1.7.9-2.6 1.1A3.7 3.7 0 0 0 12 8.8c0 .3 0 .6.1.8-3-.1-5.7-1.6-7.5-3.9-.3.6-.5 1.2-.5 1.9 0 1.3.7 2.5 1.7 3.2-.6 0-1.2-.2-1.7-.5v.1c0 1.9 1.3 3.4 3 3.8-.3.1-.7.1-1 .1-.2 0-.5 0-.7-.1.5 1.5 2 2.6 3.8 2.6A7.5 7.5 0 0 1 3 18.9a10.6 10.6 0 0 0 5.7 1.7c6.9 0 10.7-5.7 10.7-10.7v-.5c.7-.5 1.3-1.1 1.8-1.8z" fill="currentColor"/>
              </svg>
            </a>
            <a href="http://www.linkedin.com/in/pasindi-alawatta-489781217" className="footer-social-btn" aria-label="GitHub">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M12 .8a11.2 11.2 0 0 0-3.5 21.8c.6.1.8-.3.8-.6V20c-3.2.7-3.9-1.5-3.9-1.5-.6-1.4-1.4-1.8-1.4-1.8-1.2-.8 0-.8 0-.8 1.3.1 2 .1 2.7 1.8 1.1 2 3 1.4 3.7 1 .1-.8.4-1.4.7-1.7-2.6-.3-5.2-1.3-5.2-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.2 1.2a10.9 10.9 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.3.8 1 .8 2v3c0 .3.2.7.8.6A11.2 11.2 0 0 0 12 .8z" fill="currentColor"/>
              </svg>
            </a>
            <a href="http://www.linkedin.com/in/pasindi-alawatta-489781217" className="footer-social-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.1h.1c.5-1 1.8-2.1 3.7-2.1 3.9 0 4.6 2.6 4.6 6V23h-4V15.3c0-1.8 0-4-2.4-4s-2.8 1.9-2.8 3.9V23h-4V8z" fill="currentColor"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-links">
          <h4 className="footer-heading">Quick Links</h4>
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/report">Report Disaster</Link></li>
            <li><Link to="/aid">Request Aid</Link></li>
            <li><Link to="/claim">Damage Claiming</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="footer-heading">Contact</h4>
          <div className="footer-contact">
            <div className="footer-contact-item">
              <div className="footer-contact-dot"></div>
              <span>support@safezone.app</span>
            </div>
            <div className="footer-contact-item">
              <div className="footer-contact-dot warning"></div>
              <span>+94 70 735 5146</span>
            </div>
            <div className="footer-contact-item">
              <div className="footer-contact-dot info"></div>
              <span>Colombo, Sri Lanka</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <h4 className="footer-heading">Our Location</h4>
          <div className="footer-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.8!2d79.9!3d6.9!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2593cf65a1e9d%3A0xe13da4b295e2f5d!2sColombo%2007!5e0!3m2!1sen!2slk!4v1234567890"
              width="100%"
              height="200"
              style={{ border: 0, borderRadius: '8px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="SafeZone Office Location"
            ></iframe>
            <p className="footer-location-text">Colombo 07, Sri Lanka</p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} SafeZone. All rights reserved.</small>
      </div>
    </footer>
  );
};

export default Footer;