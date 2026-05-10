import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { accountStore } from '../../utils/accountStore';

function PlaidConnectAction({ autoStart = false, disabled = false, onConnected, onError, onStart }) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const autoStartTriggered = useRef(false);

  const { error: plaidError, open, ready } = usePlaidLink({
    onExit(exitError) {
      if (exitError) {
        onError?.(exitError.display_message || exitError.error_message || 'Plaid Link exited with an error.');
      }
      setPendingOpen(false);
    },
    async onSuccess(publicToken, metadata) {
      try {
        const result = await accountStore.exchangePlaidPublicToken({
          accounts: Array.isArray(metadata?.accounts)
            ? metadata.accounts.map((account) => ({
                id: account.id,
                label: account.name || account.mask || '',
              }))
            : [],
          institutionId: metadata?.institution?.institution_id || '',
          institutionName: metadata?.institution?.name || 'Connected institution',
          publicToken,
        });
        onConnected?.(result);
        setLinkToken(null);
      } catch (error) {
        onError?.(error.message || 'Plaid connection could not be completed.');
      } finally {
        setPendingOpen(false);
      }
    },
    token: linkToken,
  });

  useEffect(() => {
    if (plaidError) {
      onError?.(plaidError.message || 'Plaid Link could not load.');
    }
  }, [onError, plaidError]);

  useEffect(() => {
    if (pendingOpen && ready && linkToken) {
      open();
    }
  }, [linkToken, open, pendingOpen, ready]);

  const handleClick = async () => {
    if (disabled || isPreparing) {
      return;
    }

    setIsPreparing(true);
    setPendingOpen(true);
    onStart?.();

    try {
      if (!linkToken) {
        const tokenPayload = await accountStore.createPlaidLinkToken();
        const nextToken = tokenPayload?.link_token || tokenPayload?.token || tokenPayload;
        setLinkToken(nextToken || null);
      } else if (ready) {
        open();
      }
    } catch (error) {
      setPendingOpen(false);
      onError?.(error.message || 'Plaid Link could not be prepared.');
    } finally {
      setIsPreparing(false);
    }
  };

  const triggerPlaidAutoStart = useEffectEvent(() => {
    void handleClick();
  });

  useEffect(() => {
    if (!autoStart || autoStartTriggered.current) {
      return;
    }

    autoStartTriggered.current = true;
    triggerPlaidAutoStart();
  }, [autoStart]);

  return (
    <button className="ref-secondary-button" type="button" onClick={handleClick} disabled={disabled || isPreparing}>
      {isPreparing ? 'Preparing Plaid...' : 'Connect live institution'}
    </button>
  );
}

export default PlaidConnectAction;
