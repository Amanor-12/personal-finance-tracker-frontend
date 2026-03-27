function TopBar({ activeView }) {
  const today = new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{activeView.eyebrow}</p>
        <h2>{activeView.label}</h2>
        <p className="section-copy">{activeView.description}</p>
      </div>

      <div className="topbar-meta">
        <span>Live state demo</span>
        <strong>{today}</strong>
      </div>
    </header>
  );
}

export default TopBar;
