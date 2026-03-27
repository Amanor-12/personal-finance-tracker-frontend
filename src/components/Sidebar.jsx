function Sidebar({ views, activeView, onSelectView }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="eyebrow">Personal Finance Tracker</p>
        <h1>Student Finance Dashboard</h1>
        <p className="brand-copy">
          Mock UI for Sprint 2. Navigation, forms, and state updates all stay inside one React app shell.
        </p>
      </div>

      <nav className="nav-list" aria-label="Dashboard navigation">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            className="nav-item"
            data-active={view.id === activeView}
            onClick={() => onSelectView(view.id)}
          >
            <span>{view.label}</span>
            <small>{view.eyebrow}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
