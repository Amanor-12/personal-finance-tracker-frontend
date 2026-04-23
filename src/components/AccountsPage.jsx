import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import AccountFormDialog from './accounts/AccountFormDialog';
import AccountsIcon from './accounts/AccountsIcon';
import { formatAccountCurrency, getAccountTypeLabel } from './accounts/accountUtils';
import { PremiumButton, PremiumEmpty, PremiumHero, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
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
        <PremiumHero
          eyebrow="Vault workspace"
          title="One trusted map of your accounts."
          body="Create manual accounts for checking, savings, cards, cash, investments, and anything else you track."
          variant="vault"
          meta={[`${summary.activeCount} active`, `${summary.archivedCount} archived`, summary.primary?.name || 'No primary']}
          actions={<PremiumButton onClick={openAddDialog}>Add account</PremiumButton>}
          visual={<div className="premium-bars"><span /><span /><span /><span /></div>}
        />

        <PremiumMetrics>
          <PremiumMetric label="Total balance" value={formatAccountCurrency(summary.totalBalance)} helper="Active accounts" tone="teal" />
          <PremiumMetric label="Active" value={String(summary.activeCount)} helper="Open money locations" tone="indigo" />
          <PremiumMetric label="Archived" value={String(summary.archivedCount)} helper="Hidden from active totals" />
          <PremiumMetric label="Primary" value={summary.primary?.name || 'Not set'} helper="Default account" tone="violet" />
        </PremiumMetrics>

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
            <div className="premium-list">
              {visibleAccounts.map((account) => (
                <article className="premium-row" key={account.id}>
                  <div>
                    <strong>{account.name}</strong>
                    <small>{account.institutionName || getAccountTypeLabel(account.accountType)} - {account.maskedIdentifier || 'No identifier'}</small>
                  </div>
                  <span>{account.status}{account.isPrimary ? ' - Primary' : ''}</span>
                  <strong>{formatAccountCurrency(account.currentBalance, account.currency)}</strong>
                  <div className="premium-row-actions">
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
