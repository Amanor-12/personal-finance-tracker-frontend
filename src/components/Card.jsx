import './Card.css';

function Card({ title, description, amount }) {
  return (
    <article className="card">
      <span className="card-label">Finance Card</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <strong>{amount}</strong>
    </article>
  );
}

export default Card;
