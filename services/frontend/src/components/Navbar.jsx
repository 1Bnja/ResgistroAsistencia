import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaUser,
  FaHome,
  FaClock,
  FaUsers,
  FaCalendarAlt,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from 'react-icons/fa';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
          <FaClock /> Control de Asistencia
        </Link>

        <div className="navbar-toggle" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={mobileMenuOpen ? 'navbar-menu active' : 'navbar-menu'}>
          <li className="navbar-item">
            <Link
              to="/"
              className={`navbar-link ${isActive('/')}`}
              onClick={closeMobileMenu}
            >
              <FaHome /> Dashboard
            </Link>
          </li>

          <li className="navbar-item">
            <Link
              to="/terminal"
              className={`navbar-link ${isActive('/terminal')}`}
              onClick={closeMobileMenu}
            >
              <FaClock /> Terminal
            </Link>
          </li>

          <li className="navbar-item">
            <Link
              to="/marcajes"
              className={`navbar-link ${isActive('/marcajes')}`}
              onClick={closeMobileMenu}
            >
              <FaCalendarAlt /> Marcajes
            </Link>
          </li>

          {isAdmin() && (
            <>
              <li className="navbar-item">
                <Link
                  to="/admin/usuarios"
                  className={`navbar-link ${isActive('/admin/usuarios')}`}
                  onClick={closeMobileMenu}
                >
                  <FaUsers /> Usuarios
                </Link>
              </li>

              <li className="navbar-item">
                <Link
                  to="/admin/horarios"
                  className={`navbar-link ${isActive('/admin/horarios')}`}
                  onClick={closeMobileMenu}
                >
                  <FaCalendarAlt /> Horarios
                </Link>
              </li>
            </>
          )}

          <li className="navbar-item navbar-user">
            <div className="navbar-user-info">
              <FaUser />
              <span>
                {user?.nombre} {user?.apellido}
              </span>
              <span className="user-rol">({user?.rol})</span>
            </div>
          </li>

          <li className="navbar-item">
            <button className="navbar-link logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Salir
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
