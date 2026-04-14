import FinanceLayout from './FinanceLayout';

function PlaceholderPage({ currentUser, onLogout, title }) {
  return (
    <FinanceLayout currentUser={currentUser} onLogout={onLogout} pageTitle={title} pageSubtitle="">
      {null}
    </FinanceLayout>
  );
}

export default PlaceholderPage;
