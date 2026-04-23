import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import AccountFormDialog from './accounts/AccountFormDialog';
import AccountsIcon from './accounts/AccountsIcon';
import { formatAccountCurrency, getAccountTypeLabel } from './accounts/accountUtils';
import { PremiumButton, PremiumEmpty, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import { accountStore } from '../utils/accountStore';

const summarizeAccounts = (accounts) => {
  const active = accounts.filter((account) => account.status === 'active');
  const totalBalance = active.reduce((total, account) => total + account.currentBalance, 0);
  const primary = active.find((account) => account.isPrimary) || null;

  return {
    activeCount: active.length,
    archivedCount: accounts.length - active.length,
    primary,
    totalBalance,
  };
};

const summarizeAccountTypes = (accounts) =>
  accounts
    .filter((account) => account.status === 'active')
    .reduce((summary, account) => {
      const label = getAccountTypeLabel(account.accountType);
      summary[label] = (summary[label] || 0) + 1;
      return summary;
    }, {});

function AccountsPage({ currentUser, onLogout }) {
  const [accounts, setAccounts] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadAccounts = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const nextAccounts = await accountStore.getAccountsForUser(currentUser.id);

        if (!isCancelled) {
          setAccounts(nextAccounts);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setAccounts([]);
        setLoadError(error.message || 'Accounts could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, [currentUser.id, onLogout, refreshKey]);

  const visibleAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return accounts
      .filter((account) => (statusFilter === 'all' ? true : account.status === statusFilter))
      .filter((account) => {
        if (!normalizedQuery) {
          return true;
        }

        return [account.name, account.institutionName, account.accountType, account.maskedIdentifier]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });
  }, [accounts, query, statusFilter]);

  const summary = useMemo(() => summarizeAccounts(accounts), [accounts]);
  const typeBreakdown = useMemo(() => summarizeAccountTypes(accounts), [accounts]);

  const openAddDialog = () => {
    setEditingAccount(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setSaveError('');
    setIsFormOpen(true);
  };

  const handleSaveAccount = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await accountStore.saveAccount(currentUser.id, payload);
      setIsFormOpen(false);
      setEditingAccount(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Account could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const archiveAccount = async (account) => {
    const shouldArchive = window.confirm(`Archive ${account.name}?`);

    if (!shouldArchive) {
      return;
    }

    try {
      await accountStore.archiveAccount(currentUser.id, account.id);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setLoadError(error.message || 'Account could not be archived.');
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Primary account</span>
        <h3>{summary.primary?.name || 'Not selected'}</h3>
        <p>{summary.primary ? 'Used as the default money location for future workflows.' : 'The first active account can become primary.'}</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Vault health</span>
        <div className="activity-stat-list">
          <div><strong>{summary.activeCount}</strong><p>Active</p></div>
          <div><strong>{summary.archivedCount}</strong><p>Archived</p></div>
          <div><strong>{visibleAccounts.length}</strong><p>Visible</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <>
      <FinanceLayout
        currentUser={currentUser}
        onLogout={onLogout}
        pageTitle="Accounts"
        pageSubtitle="A private vault for every place your money lives."
        primaryActionLabel="+ Add account"
        onPrimaryAction={openAddDialog}
        rail={rail}
      >
        <section className="accounts-vault-hero">
          <div className="accounts-vault-hero-copy">
            <span className="premium-eyebrow">Account vault</span>
            <h2>A clean map of where your money lives.</h2>
            <p>Group checking, savings, cards, cash, investments, and manual balances into one private account vault.</p>
            <div className="accounts-vault-hero-meta">
              <span>{summary.activeCount} active</span>
              <span>{summary.archivedCount} archived</span>
              <span>{summary.primary?.name || 'No primary'}</span>
            </div>
            <PremiumButton onClick={openAddDialog}>Add account</PremiumButton>
          </div>

          <div className="accounts-vault-visual" aria-hidden="true">
            <div className="accounts-safe-door">
              <span className="accounts-safe-ring" />
              <span className="accounts-safe-ring is-inner" />
              <span className="accounts-safe-handle" />
            </div>
            <div className="accounts-vault-slots">
              <span>Checking</span>
              <span>Savings</span>
              <span>Cards</span>
            </div>
          </div>
        </section>

        <PremiumMetrics>
          <PremiumMetric label="Total balance" value={formatAccountCurrency(summary.totalBalance)} helper="Active accounts" tone="teal" />
          <PremiumMetric label="Active" value={String(summary.activeCount)} helper="Open money locations" tone="indigo" />
          <PremiumMetric label="Archived" value={String(summary.archivedCount)} helper="Hidden from active totals" />
          <PremiumMetric label="Primary" value={summary.primary?.name || 'Not set'} helper="Default account" tone="violet" />
        </PremiumMetrics>

        <section className="accounts-vault-overview" aria-label="Account vault overview">
          <article className="accounts-primary-vault">
            <span>Primary money location</span>
            <h3>{summary.primary?.name || 'No primary account yet'}</h3>
            <p>
              {summary.primary
                ? `${formatAccountCurrency(summary.primary.currentBalance, summary.primary.currency)} available in ${getAccountTypeLabel(summary.primary.accountType)}.`
                : 'Create an account and mark it primary when it should be the default for future workflows.'}
            </p>
          </article>

          <article className="accounts-type-map">
            <div>
              <span>Account mix</span>
              <strong>{summary.activeCount} active</strong>
            </div>
            <div className="accounts-type-list">
              {Object.keys(typeBreakdown).length ? (
                Object.entries(typeBreakdown).map(([label, count]) => (
                  <span key={label}>
                    {label}
                    <b>{count}</b>
                  </span>
                ))
              ) : (
                <p>No account types yet.</p>
              )}
            </div>
          </article>
        </section>

        <PremiumPanel eyebrow="Controls" title="Search your vault">
          <div className="premium-filter-bar">
            <input
              aria-label="Search accounts"
              placeholder="Search account, institution, type, or identifier"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select aria-label="Account status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All accounts</option>
            </select>
          </div>
        </PremiumPanel>

        <PremiumPanel eyebrow="Vault" title="Manual accounts">
          {isLoading ? <PremiumSkeleton count={4} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty title="Accounts could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
          ) : null}

          {!isLoading && !loadError && visibleAccounts.length ? (
            <div className="accounts-vault-list">
              {visibleAccounts.map((account) => (
                <article className="accounts-vault-card" key={account.id}>
                  <div className="accounts-vault-card-top">
                    <span>{getAccountTypeLabel(account.accountType)}</span>
                    <strong>{account.isPrimary ? 'Primary' : account.status}</strong>
                  </div>
                  <h3>{account.name}</h3>
                  <p>{account.institutionName || account.maskedIdentifier || 'Manual account'}</p>
                  <b>{formatAccountCurrency(account.currentBalance, account.currency)}</b>
                  <div className="accounts-vault-card-actions">
                    <button type="button" onClick={() => openEditDialog(account)}>Edit</button>
                    {account.status === 'active' ? (
                      <button className="is-danger" type="button" onClick={() => archiveAccount(account)}>Archive</button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && !loadError && !accounts.length ? (
            <PremiumEmpty
              icon={<AccountsIcon type="wallet" />}
              title="Create your first money location"
              body="Add one account so transactions, budgets, and reports can connect to a real place."
              actionLabel="Add account"
              onAction={openAddDialog}
            />
          ) : null}

          {!isLoading && !loadError && accounts.length > 0 && !visibleAccounts.length ? (
            <PremiumEmpty title="No accounts match this view" body="Clear search or change status to return to your vault." actionLabel="Reset view" onAction={() => {
              setQuery('');
              setStatusFilter('active');
            }} />
          ) : null}
        </PremiumPanel>
      </FinanceLayout>

      {isFormOpen ? (
        <AccountFormDialog
          account={editingAccount}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingAccount(null);
            }
          }}
          onSubmit={handleSaveAccount}
          saveError={saveError}
        />
      ) : null}
    </>
  );
}

export default AccountsPage;
