import './Navbar.css';

function Navbar({ isAuthenticated, navItems, onLogout, userName }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>Finance Flow</h2>
        <span>{isAuthenticated ? 'Dashboard unlocked' : 'Frontend auth shell'}</span>
      </div>

      <ul>
        {navItems.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <span className="status-pill">{userName}</span>
            <button className="logout-button" onClick={onLogout} type="button">
              Log Out
            </button>
          </>
        ) : (
          <span className="status-pill status-pill-muted">Backend coming later</span>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
