import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div>
        <h2>Finance Flow</h2>
        <p>Signed in as {user?.email}</p>
      </div>
      <ul>
        <li>Dashboard</li>
        <li>Budget</li>
        <li>Savings</li>
        <li>Profile</li>
      </ul>
      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
}

export default Navbar;
