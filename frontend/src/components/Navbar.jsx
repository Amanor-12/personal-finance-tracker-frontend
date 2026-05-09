import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link className="navbar-logo" to="/dashboard">
          <h2>Rivo</h2>
        </Link>
        <p>Signed in as {user?.email}</p>
      </div>

      <div className="navbar-actions">
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/dashboard">
          Dashboard
        </NavLink>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
