import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import AccountFormDialog from './accounts/AccountFormDialog';
import AccountsIcon from './accounts/AccountsIcon';
import { formatAccountCurrency, getAccountTypeLabel } from './accounts/accountUtils';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
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

function AccountPreviewCard({ account, depth = 0, placeholder = false }) {
  const accountType = placeholder ? 'Preview account' : getAccountTypeLabel(account.accountType);
  const title = placeholder ? 'Ledgr' : account.name;
  const balance = placeholder ? 'Add your first account' : formatAccountCurrency(account.currentBalance, account.currency);
  const identifier = placeholder ? '**** ----' : account.maskedIdentifier || account.institutionName || 'Manual account';
  const footer = placeholder ? 'preview' : account.isPrimary ? 'primary' : account.status;

  return (
    <article
      className={`accounts-wallet-preview-card ref-wallet-card ref-stack-card theme-indigo${placeholder ? ' is-placeholder' : ''}`}
      style={{
        '--stack-x': `${depth * 16}px`,
        '--stack-y': `${depth * 20}px`,
        '--stack-scale': `${1 - depth * 0.045}`,
        '--stack-opacity': `${1 - depth * 0.12}`,
        zIndex: 12 - depth,
      }}
    >
      <div className="ref-wallet-card-top">
        <div className="ref-wallet-card-brand">
          <div className="ref-master-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <strong>{title}</strong>
        </div>
      </div>

      <span className="ref-wallet-chip" aria-hidden="true" />

      <div className="ref-wallet-card-copy">
        <span>{accountType}</span>
        <strong>{balance}</strong>
      </div>

      <div className="ref-wallet-card-bottom">
        <span>{identifier}</span>
        <div className="ref-wallet-tail">
          <span className="ref-wallet-tail-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <small>{footer}</small>
        </div>
      </div>
    </article>
  );
}

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
  const activeAccounts = useMemo(() => accounts.filter((account) => account.status === 'active'), [accounts]);
  const previewAccounts = useMemo(() => activeAccounts.slice(0, 3).reverse(), [activeAccounts]);

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

  const setPrimaryAccount = async (account) => {
    try {
      await accountStore.setPrimaryAccount(currentUser.id, account.id);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setLoadError(error.message || 'Primary account could not be updated.');
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
        pageTitle="Wallets"
        pageSubtitle="A private vault for every place your money lives."
        primaryActionLabel="+ Add account"
        onPrimaryAction={openAddDialog}
        rail={rail}
      >
        <section className="accounts-command-board accounts-wallet-board" aria-label="Account workspace">
          <div className="accounts-command-copy">
            <span className="ref-section-chip">Vault workspace</span>
            <h2>One trusted map of your accounts.</h2>
            <p>Add the real places your money lives, then use them across transactions, budgets, goals, and reports.</p>
            <div className="accounts-wallet-actions">
              <button className="ref-secondary-button" type="button" onClick={openAddDialog}>Add account</button>
              <span>{summary.activeCount ? `${summary.activeCount} active` : 'No accounts yet'}</span>
            </div>
          </div>

          <div className="accounts-wallet-preview" aria-label="Wallet preview">
            <div className="accounts-wallet-preview-stack">
              {previewAccounts.length ? (
                previewAccounts.map((account, index) => {
                  const depth = previewAccounts.length - index - 1;

                  return <AccountPreviewCard key={account.id} account={account} depth={depth} />;
                })
              ) : (
                <AccountPreviewCard placeholder />
              )}
            </div>
            <div className="accounts-wallet-preview-note">
              <strong>{summary.primary?.name || 'Choose a primary account'}</strong>
              <span>
                {summary.primary
                  ? `${getAccountTypeLabel(summary.primary.accountType)} used as your default money location.`
                  : 'Your first account becomes the foundation for transactions and reports.'}
              </span>
            </div>
          </div>

          <div className="accounts-command-stats" aria-label="Account summary">
            <article><span>Total balance</span><strong>{formatAccountCurrency(summary.totalBalance)}</strong></article>
            <article><span>Active</span><strong>{summary.activeCount}</strong></article>
            <article><span>Archived</span><strong>{summary.archivedCount}</strong></article>
          </div>

          <div className="accounts-command-map">
            <div className="accounts-command-map-head">
              <span>Account mix</span>
              <strong>{summary.activeCount} active</strong>
            </div>
            <div className="accounts-command-type-list">
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
          </div>

          <div className="accounts-command-controls">
            <label>
              <span>Search vault</span>
              <input
                aria-label="Search accounts"
                placeholder="Account, institution, type, or identifier"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Status</span>
              <select aria-label="Account status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All accounts</option>
              </select>
            </label>
          </div>
        </section>

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
                    {account.status === 'active' && !account.isPrimary ? (
                      <button type="button" onClick={() => setPrimaryAccount(account)}>Make primary</button>
                    ) : null}
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
