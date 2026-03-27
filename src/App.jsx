import { useEffect, useState } from 'react';
import './App.css';
import hero from './assets/hero.png';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import Card from './components/Card';
import Counter from './components/Counter';
import Navbar from './components/Navbar';
import RegisterForm from './components/RegisterForm';

const cardData = [
  {
    title: 'Budget Snapshot',
    description: 'Keep your monthly budget clear by tracking groceries, bills, and everyday spending in one place.',
    amount: '$2,450',
  },
  {
    title: 'Savings Goal',
    description: 'Build a realistic emergency fund with small weekly progress updates and visible milestones.',
    amount: '$1,200',
  },
  {
    title: 'Upcoming Bills',
    description: 'Stay ahead of rent, subscriptions, and due dates so your dashboard feels useful during demos.',
    amount: '4 due',
  },
];

function App() {
  const [profiles, setProfiles] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const savedProfiles = window.localStorage.getItem('finance-profiles');
    return savedProfiles ? JSON.parse(savedProfiles) : [];
  });

  useEffect(() => {
    document.title = profiles.length
      ? `Finance App (${profiles.length} saved)`
      : 'Finance App';
    window.localStorage.setItem('finance-profiles', JSON.stringify(profiles));
  }, [profiles]);

  const handleRegister = (newProfile) => {
    setProfiles((currentProfiles) => [newProfile, ...currentProfiles].slice(0, 3));
  };

  const latestProfile = profiles[0];

  return (
    <>
      <Navbar />

      <main className="app-shell">
        <section className="hero">
          <div className="hero-copy">
            <span>Personal Finance Dashboard</span>
            <h1>Build a clean React shell that feels ready to grow.</h1>
            <p>
              This mock dashboard focuses on the Sprint 2 goals: reusable
              components, controlled forms, live state updates, and a seamless
              single page experience.
            </p>

            <div className="hero-stats">
              <div>
                <strong>3</strong>
                <small>Reusable finance cards</small>
              </div>
              <div>
                <strong>1</strong>
                <small>Validated React form</small>
              </div>
              <div>
                <strong>Live</strong>
                <small>useState updates</small>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <img src={hero} alt="Personal finance dashboard preview" />
          </div>
        </section>

        <div className="section-heading">
          <h2>Finance Overview</h2>
          <p>Each card is reusable and receives different props from the main app.</p>
        </div>

        <section className="card-grid">
          {cardData.map((card) => (
            <Card
              key={card.title}
              title={card.title}
              description={card.description}
              amount={card.amount}
            />
          ))}
        </section>

        <section className="workspace">
          <div className="workspace-panel">
            <Counter />
          </div>
          <div className="workspace-panel">
            <RegisterForm onRegister={handleRegister} />
          </div>
        </section>

        <section className="status-strip">
          <div className="status-card">
            <h3>Latest Saved Profile</h3>
            {latestProfile ? (
              <ul>
                <li>Name: {latestProfile.fullName}</li>
                <li>Email: {latestProfile.email}</li>
                <li>Monthly income: ${latestProfile.monthlyIncome}</li>
              </ul>
            ) : (
              <p>
                Submit the form to show how React updates the UI immediately
                without reloading the page.
              </p>
            )}
          </div>

          <div className="status-badges">
            <div>
              <img src={reactLogo} alt="React logo" />
              <span>React</span>
            </div>
            <div>
              <img src={viteLogo} alt="Vite logo" />
              <span>Vite</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
