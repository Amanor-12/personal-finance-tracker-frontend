function ActivityFeed({ activity }) {
  return (
    <section className="panel panel-tall">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">useEffect + local storage</p>
          <h3>Activity feed</h3>
        </div>
        <span className="panel-chip">Auto-saved</span>
      </div>

      <div className="activity-list">
        {activity.map((entry) => (
          <article key={entry.id} className="activity-row">
            <div className="activity-dot" />
            <div>
              <strong>{entry.message}</strong>
              <p>{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ActivityFeed;
