function DialogLoadFrame({ title, body }) {
  return (
    <div className="dialog-load-frame" role="presentation">
      <div className="dialog-load-card" role="status" aria-live="polite">
        <span className="dialog-load-kicker">Preparing form</span>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="dialog-load-pulse" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default DialogLoadFrame;
