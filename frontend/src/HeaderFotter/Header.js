import React, { useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="safezone-header">
      <nav className="safezone-nav">
        <div className="safezone-logo">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
            <Shield size={32} color="#3498db" />
            SafeZone
          </Link>
        </div>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <ul className={isMobileMenuOpen ? 'active' : ''}>
          <li><Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={closeMobileMenu}>Home</Link></li>
          <li><Link to="#" className={location.pathname === '/dashboard' ? 'active' : ''} onClick={closeMobileMenu}>Disaster Alerts</Link></li>
          <li><Link to="#" className={location.pathname === '/map' ? 'active' : ''} onClick={closeMobileMenu}>Sefty Resources</Link></li>
          <li><Link to="#" className={location.pathname === '/user-map' ? 'active' : ''} onClick={closeMobileMenu}>Community Support</Link></li>
          <li><Link to="/contact" className={location.pathname === '/contact' ? 'active' : ''} onClick={closeMobileMenu}>Contact Us</Link></li>
          <li><Link to="#" className={location.pathname === '/contact-list' ? 'active' : ''} onClick={closeMobileMenu}>About Us</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
