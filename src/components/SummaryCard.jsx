function SummaryCard({ label, value, helper, tone = 'neutral' }) {
  return (
    <section className="summary-card" data-tone={tone}>
      <p>{label}</p>
      <h3>{value}</h3>
      <span>{helper}</span>
    </section>
  );
}

export default SummaryCard;
