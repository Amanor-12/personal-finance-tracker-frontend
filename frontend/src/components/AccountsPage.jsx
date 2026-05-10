import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourceLimitCard } from './billing/FeatureGate';
import DialogLoadFrame from './DialogLoadFrame';
import FinanceLayout from './FinanceLayout';
import AccountsIcon from './accounts/AccountsIcon';
import { formatAccountCurrency, getAccountTypeLabel } from './accounts/accountUtils';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import { useBillingAccess } from '../context/useBillingAccess';
import { accountStore } from '../utils/accountStore';
import { loadAccountFormDialog } from '../utils/dialogPrefetch';

const AccountFormDialog = lazy(loadAccountFormDialog);
const loadPlaidConnectAction = (() => {
  let request = null;

  return () => {
    if (!request) {
      request = import('./accounts/PlaidConnectAction').catch((error) => {
        request = null;
        throw error;
      });
    }

    return request;
  };
})();
const PlaidConnectAction = lazy(loadPlaidConnectAction);

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

const getAccountTheme = (accountType) => {
  if (accountType === 'savings' || accountType === 'investment') {
    return 'emerald';
  }

  if (accountType === 'cash') {
    return 'sunset';
  }

  return 'indigo';
};

const getAccountPreviewTitle = (account) => account?.institutionName?.trim() || 'Rivo';
const getAccountPreviewLabel = (account) =>
  account ? `${getAccountTypeLabel(account.accountType)} account` : 'No primary account yet';
const getAccountPreviewNote = (account) =>
  account
    ? `${getAccountTypeLabel(account.accountType)} is ready to use across transactions, budgets, goals, and reports.`
    : 'Add a checking, savings, cash, or credit account so the workspace can use a real money source.';

function AccountPreviewCard({ account, depth = 0, placeholder = false, stacked = true, compact = false }) {
  const accountType = placeholder ? 'Preview account' : getAccountTypeLabel(account.accountType);
  const title = placeholder ? 'Rivo' : getAccountPreviewTitle(account);
  const balance = placeholder ? 'Add your first account' : formatAccountCurrency(account.currentBalance, account.currency);
  const identifier = placeholder ? '**** ----' : account.maskedIdentifier || account.institutionName || 'Manual account';
  const footer = placeholder ? 'preview' : account.isPrimary ? 'primary' : account.status;
  const theme = placeholder ? 'indigo' : getAccountTheme(account.accountType);

  return (
    <article
      className={`accounts-wallet-preview-card ref-wallet-card theme-${theme}${stacked ? ' ref-stack-card' : ''}${compact ? ' is-compact' : ''}${placeholder ? ' is-placeholder' : ''}`}
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
  const navigate = useNavigate();
  const { access, isLoading: isBillingLoading, refreshBillingAccess } = useBillingAccess();
  const [accounts, setAccounts] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [bankProviders, setBankProviders] = useState([]);
  const [bankConnections, setBankConnections] = useState([]);
  const [reconciliationQueue, setReconciliationQueue] = useState([]);
  const [bankSyncMessage, setBankSyncMessage] = useState('');
  const [isLoadingBankSync, setIsLoadingBankSync] = useState(true);
  const [isCreatingBankConnection, setIsCreatingBankConnection] = useState(false);
  const [isPlaidActionVisible, setIsPlaidActionVisible] = useState(false);
  const [shouldAutoStartPlaid, setShouldAutoStartPlaid] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState(null);
  const [reconcilingTransactionId, setReconcilingTransactionId] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasBankSync = Boolean(access.featureAccess?.bankSync);
  const hasReconciliationWorkbench = Boolean(access.featureAccess?.reconciliationWorkbench);

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

  useEffect(() => {
    let isCancelled = false;

    const loadBankSync = async () => {
      if (!hasBankSync) {
        setBankProviders([]);
        setBankConnections([]);
        setReconciliationQueue([]);
        setIsLoadingBankSync(false);
        return;
      }

      setIsLoadingBankSync(true);

      try {
        const requests = [accountStore.getBankProviders(), accountStore.getBankConnections()];

        if (hasReconciliationWorkbench) {
          requests.push(accountStore.getReconciliationQueue());
        }

        const [providers, connections, queue = []] = await Promise.all(requests);

        if (!isCancelled) {
          setBankProviders(providers);
          setBankConnections(connections);
          setReconciliationQueue(queue);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setBankProviders([]);
        setBankConnections([]);
        setReconciliationQueue([]);
        setBankSyncMessage(error.message || 'Bank sync controls could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoadingBankSync(false);
        }
      }
    };

    loadBankSync();

    return () => {
      isCancelled = true;
    };
  }, [hasBankSync, hasReconciliationWorkbench, onLogout, refreshKey]);

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
  const accountLimit = access.limits.accounts;
  const accountUsage = access.usage.accounts || 0;
  const canCreateAccount = accountLimit === null || accountUsage < accountLimit;
  const plaidProvider = bankProviders.find((provider) => provider.id === 'plaid') || null;
  const sandboxProvider = bankProviders.find((provider) => provider.id === 'sandbox') || null;
  const warmAccountDialog = () => {
    void loadAccountFormDialog();
  };
  const warmPlaidConnectAction = () => {
    if (plaidProvider?.status === 'available') {
      void loadPlaidConnectAction();
    }
  };

  const openAddDialog = () => {
    if (!canCreateAccount) {
      navigate('/pricing');
      return;
    }

    warmAccountDialog();
    setEditingAccount(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const openEditDialog = (account) => {
    warmAccountDialog();
    setEditingAccount(account);
    setSaveError('');
    setIsFormOpen(true);
  };

  const handleSaveAccount = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await accountStore.saveAccount(currentUser.id, payload);
      await refreshBillingAccess();
      setIsFormOpen(false);
      setEditingAccount(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Account could not be saved.');
      await refreshBillingAccess();
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
      await refreshBillingAccess();
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

  const connectSandboxBank = async () => {
    setIsCreatingBankConnection(true);
    setBankSyncMessage('');

    try {
      await accountStore.createBankConnection({
        institutionName: 'Northwind Test Institution',
        label: 'Primary test feed',
        provider: 'sandbox',
      });
      setRefreshKey((value) => value + 1);
      setBankSyncMessage('Test institution connected.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setBankSyncMessage(error.message || 'The test institution could not be connected.');
    } finally {
      setIsCreatingBankConnection(false);
    }
  };

  const syncConnection = async (connectionId) => {
    setSyncingConnectionId(connectionId);
    setBankSyncMessage('');

    try {
      const result = await accountStore.syncBankConnection(connectionId);
      setRefreshKey((value) => value + 1);
      setBankSyncMessage(result.message || 'Transaction sync completed.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setBankSyncMessage(error.message || 'Transaction sync could not complete.');
    } finally {
      setSyncingConnectionId(null);
    }
  };

  const reconcileTransaction = async (transactionId) => {
    setReconcilingTransactionId(transactionId);
    setBankSyncMessage('');

    try {
      await accountStore.reconcileImportedTransaction(transactionId);
      setRefreshKey((value) => value + 1);
      setBankSyncMessage('Imported transaction reconciled.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setBankSyncMessage(error.message || 'Imported transaction could not be reconciled.');
    } finally {
      setReconcilingTransactionId(null);
    }
  };

  const handlePlaidConnected = (result) => {
    setShouldAutoStartPlaid(false);
    setRefreshKey((value) => value + 1);
    setBankSyncMessage(
      result.message ||
        `${result.connections?.length || 1} live institution connection${result.connections?.length === 1 ? '' : 's'} added.`
    );
  };

  const handlePlaidError = (message) => {
    setShouldAutoStartPlaid(false);
    setBankSyncMessage(message || 'Plaid connection could not be completed.');
  };

  const activatePlaidConnect = () => {
    warmPlaidConnectAction();
    setIsPlaidActionVisible(true);
    setShouldAutoStartPlaid(true);
    setBankSyncMessage('Preparing Plaid Link...');
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
        primaryActionLabel={!isBillingLoading && !canCreateAccount ? 'See plans' : '+ Add account'}
        onPrimaryAction={!isBillingLoading && !canCreateAccount ? () => navigate('/pricing') : openAddDialog}
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
                <div className="accounts-wallet-preview-empty">
                  <span>Account setup</span>
                  <strong>No accounts connected yet</strong>
                  <p>Add your first account to anchor transactions, budgets, goals, and reporting to a real money source.</p>
                  <button className="ref-secondary-button" type="button" onClick={openAddDialog}>
                    Add first account
                  </button>
                </div>
              )}
            </div>
            <div className="accounts-wallet-preview-note">
              <small>{summary.primary ? 'Primary route' : 'Vault ready'}</small>
              <strong>{getAccountPreviewLabel(summary.primary)}</strong>
              <span>{getAccountPreviewNote(summary.primary)}</span>
            </div>
          </div>
        </section>

        <section className="accounts-wallet-secondary" aria-label="Account workspace tools">
          {!isBillingLoading && accountLimit !== null ? (
            <ResourceLimitCard
              body="Free workspaces can keep a small vault. Move to Plus when you need more accounts for separate cash, cards, savings, or investments."
              limit={accountLimit}
              resourceLabel="active accounts"
              usage={accountUsage}
            />
          ) : null}

          <div className="accounts-command-stats" aria-label="Account summary">
            <article><span>Total balance</span><strong>{formatAccountCurrency(summary.totalBalance)}</strong></article>
            <article><span>Active</span><strong>{summary.activeCount}</strong></article>
            <article><span>Archived</span><strong>{summary.archivedCount}</strong></article>
          </div>

          <div className="accounts-wallet-utility-grid">
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
          </div>
        </section>

        <PremiumPanel eyebrow="Bank sync" title="Connected imports and reconciliation">
          {!isBillingLoading && !hasBankSync ? (
            <PremiumEmpty
              title="Upgrade for connected imports"
              body="Plus unlocks connected bank sync so imported activity can be reviewed from an account-owned reconciliation queue."
              actionLabel="See plans"
              onAction={() => navigate('/pricing')}
            />
          ) : null}

          {hasBankSync ? (
            <>
              <div className="accounts-command-stats" aria-label="Bank sync summary">
                <article><span>Connections</span><strong>{bankConnections.length}</strong></article>
                <article><span>Pending review</span><strong>{reconciliationQueue.length}</strong></article>
                <article><span>Reconcile access</span><strong>{hasReconciliationWorkbench ? 'Pro' : 'Plus sync only'}</strong></article>
              </div>

              <div className="accounts-wallet-actions">
                <div className="settings-inline-actions">
                  {plaidProvider?.status === 'available' ? (
                    isPlaidActionVisible ? (
                      <Suspense
                        fallback={
                          <button className="ref-secondary-button" type="button" disabled>
                            Preparing Plaid...
                          </button>
                        }
                      >
                        <PlaidConnectAction
                          autoStart={shouldAutoStartPlaid}
                          onConnected={handlePlaidConnected}
                          onError={handlePlaidError}
                          onStart={() => setBankSyncMessage('Preparing Plaid Link...')}
                        />
                      </Suspense>
                    ) : (
                      <button
                        className="ref-secondary-button"
                        type="button"
                        onClick={activatePlaidConnect}
                        onFocus={warmPlaidConnectAction}
                        onMouseEnter={warmPlaidConnectAction}
                      >
                        Connect live institution
                      </button>
                    )
                  ) : null}
                  {sandboxProvider ? (
                    <button
                      className="ref-secondary-button"
                      type="button"
                      onClick={connectSandboxBank}
                      disabled={isCreatingBankConnection}
                    >
                      {isCreatingBankConnection ? 'Connecting...' : 'Connect test institution'}
                    </button>
                  ) : null}
                </div>
                <span>
                  {bankSyncMessage ||
                    (plaidProvider?.status === 'available'
                      ? sandboxProvider
                        ? 'Connect a live institution with Plaid or use the controlled test feed while you finish setup.'
                        : 'Connect a live institution with Plaid, then review imported activity before it reaches the rest of the workspace.'
                      : sandboxProvider
                        ? 'Plaid can be enabled later. A controlled test feed is still available while setup is in progress.'
                        : 'Live institution sync will appear here once Plaid credentials are configured.')}
                </span>
              </div>

              {!isLoadingBankSync && bankProviders.length ? (
                <div className="accounts-command-type-list">
                  {bankProviders.map((provider) => (
                    <span key={provider.id}>
                      {provider.name}
                      <b>{provider.status}</b>
                    </span>
                  ))}
                </div>
              ) : null}

              {isLoadingBankSync ? <PremiumSkeleton count={2} /> : null}

              {!isLoadingBankSync && bankConnections.length ? (
                <div className="accounts-vault-list">
                  {bankConnections.map((connection) => (
                    <article className="accounts-vault-card accounts-vault-card-product" key={connection.id}>
                      <div className="accounts-vault-card-body">
                        <div className="accounts-vault-card-top">
                          <span>{connection.provider}</span>
                          <strong>{connection.status}</strong>
                        </div>
                        <h3>{connection.label}</h3>
                        <p>
                          {connection.institutionName}
                          {connection.providerAccountMask ? ` / ${connection.providerAccountMask}` : ''}
                        </p>
                        <b>{connection.unreconciledCount} pending reconciliation</b>
                        {connection.lastSyncedAt ? (
                          <small>Last synced {new Date(connection.lastSyncedAt).toLocaleString()}</small>
                        ) : null}
                        {connection.lastError ? <small>{connection.lastError}</small> : null}
                      </div>

                      <div className="accounts-vault-card-actions">
                        <button
                          type="button"
                          onClick={() => syncConnection(connection.id)}
                          disabled={syncingConnectionId === connection.id}
                        >
                          {syncingConnectionId === connection.id ? 'Syncing...' : 'Run sync'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {!isLoadingBankSync && hasReconciliationWorkbench && reconciliationQueue.length ? (
                <div className="accounts-vault-list">
                  {reconciliationQueue.slice(0, 6).map((item) => (
                    <article className="accounts-vault-card accounts-vault-card-product" key={item.id}>
                      <div className="accounts-vault-card-body">
                        <div className="accounts-vault-card-top">
                          <span>{item.bankConnectionLabel}</span>
                          <strong>{item.reconciliationStatus}</strong>
                        </div>
                        <h3>{item.merchantName || item.description}</h3>
                        <p>{item.accountName} - {item.categoryName}</p>
                        <b>{formatAccountCurrency(item.amount)}</b>
                        <small>Posted {item.postedAt || item.transactionDate}</small>
                      </div>

                      <div className="accounts-vault-card-actions">
                        <button
                          type="button"
                          onClick={() => reconcileTransaction(item.id)}
                          disabled={reconcilingTransactionId === item.id}
                        >
                          {reconcilingTransactionId === item.id ? 'Saving...' : 'Mark reconciled'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {!isLoadingBankSync && hasReconciliationWorkbench && !reconciliationQueue.length ? (
                <PremiumEmpty
                  title="Reconciliation queue is clear"
                  body="Imported transactions will appear here after a sync so every linked institution can be reviewed before activity flows through the workspace."
                />
              ) : null}
            </>
          ) : null}
        </PremiumPanel>

        <PremiumPanel eyebrow="Vault" title="Manual accounts">
          {isLoading ? <PremiumSkeleton count={4} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty title="Accounts could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
          ) : null}

          {!isLoading && !loadError && visibleAccounts.length ? (
            <div className="accounts-vault-list">
              {visibleAccounts.map((account) => (
                <article className="accounts-vault-card accounts-vault-card-product" key={account.id}>
                  <AccountPreviewCard account={account} stacked={false} compact />

                  <div className="accounts-vault-card-body">
                    <div className="accounts-vault-card-top">
                      <span>{getAccountTypeLabel(account.accountType)}</span>
                      <strong>{account.isPrimary ? 'Primary' : account.status}</strong>
                    </div>
                    <h3>{account.name}</h3>
                    <p>{account.institutionName || account.maskedIdentifier || 'Manual account'}</p>
                    <b>{formatAccountCurrency(account.currentBalance, account.currency)}</b>
                  </div>

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
        <Suspense
          fallback={
            <DialogLoadFrame
              body="Pulling in the account editor so you can update balances, institutions, and primary wallet settings."
              title={editingAccount ? 'Opening account details' : 'Opening new account form'}
            />
          }
        >
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
        </Suspense>
      ) : null}
    </>
  );
}

export default AccountsPage;
