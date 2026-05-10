import { useEffect, useMemo } from 'react';
import AccountsIcon from './AccountsIcon';
import { accountTypeOptions, createAccountForm } from './accountUtils';
import { useManagedForm } from '../../utils/useManagedForm';

const accountTypeValues = accountTypeOptions.map((option) => option.value);

const validateAccountForm = (values) => {
  const errors = {};
  const currency = String(values.currency || '').trim();
  const institutionName = String(values.institutionName || '');
  const maskedIdentifier = String(values.maskedIdentifier || '');
  const name = String(values.name || '').trim();
  const notes = String(values.notes || '');
  const openingBalance = Number(values.openingBalance);

  if (!accountTypeValues.includes(values.accountType)) {
    errors.accountType = 'Choose a supported account type.';
  }

  if (!/^[A-Za-z]{3}$/.test(currency)) {
    errors.currency = 'Use a three-letter currency code.';
  }

  if (institutionName.length > 120) {
    errors.institutionName = 'Keep institution under 120 characters.';
  }

  if (maskedIdentifier.length > 20) {
    errors.maskedIdentifier = 'Keep identifier under 20 characters.';
  }

  if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (name.length > 80) {
    errors.name = 'Keep name under 80 characters.';
  }

  if (notes.length > 255) {
    errors.notes = 'Keep notes under 255 characters.';
  }

  if (String(values.openingBalance || '').length < 1) {
    errors.openingBalance = 'Enter an opening balance.';
  } else if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    errors.openingBalance = 'Opening balance must be zero or greater.';
  }

  return errors;
};

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="vault-field-error">{message}</span>;
}

function AccountFormDialog({ account, isSaving, onClose, onSubmit, saveError }) {
  const mode = account ? 'edit' : 'add';
  const defaultValues = useMemo(() => createAccountForm(account), [account]);
  const form = useManagedForm({
    defaultValues,
    validate: validateAccountForm,
  });
  const { errors, handleSubmit, register, reset } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleValidSubmit = async (values) => {
    await onSubmit({
      ...values,
      currency: values.currency.trim().toUpperCase(),
      id: account?.id,
      name: values.name.trim(),
    });
  };

  return (
    <div className="vault-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="account-form-title"
        aria-modal="true"
        className="vault-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vault-dialog-head">
          <div>
            <span className="vault-eyebrow">Manual account</span>
            <h2 id="account-form-title">{mode === 'edit' ? 'Edit account' : 'Add account'}</h2>
            <p>Track where your money lives without connecting a bank integration yet.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account form">
            <AccountsIcon type="close" />
          </button>
        </div>

        <form className="vault-form" onSubmit={handleSubmit(handleValidSubmit)}>
          {saveError ? <p className="vault-form-alert">{saveError}</p> : null}

          <div className="vault-form-grid">
            <label className="vault-field vault-field-wide">
              <span>Account name</span>
              <input
                type="text"
                placeholder="Everyday checking"
                {...register('name')}
                disabled={isSaving}
                autoFocus
              />
              <FieldError message={errors.name} />
            </label>

            <label className="vault-field">
              <span>Account type</span>
              <select {...register('accountType')} disabled={isSaving}>
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.accountType} />
            </label>

            <label className="vault-field">
              <span>Currency</span>
              <input type="text" maxLength="3" {...register('currency')} disabled={isSaving} />
              <FieldError message={errors.currency} />
            </label>

            <label className="vault-field">
              <span>Institution</span>
              <input
                type="text"
                placeholder="Optional"
                {...register('institutionName')}
                disabled={isSaving}
              />
              <FieldError message={errors.institutionName} />
            </label>

            <label className="vault-field">
              <span>Masked identifier</span>
              <input
                type="text"
                placeholder="**** 1234"
                {...register('maskedIdentifier')}
                disabled={isSaving}
              />
              <FieldError message={errors.maskedIdentifier} />
            </label>

            <label className="vault-field">
              <span>Opening balance</span>
              <input
                min="0"
                step="0.01"
                type="number"
                placeholder="0.00"
                {...register('openingBalance')}
                disabled={isSaving}
              />
              <FieldError message={errors.openingBalance} />
            </label>

            <label className="vault-field vault-field-wide">
              <span>Notes</span>
              <textarea
                placeholder="Optional private notes"
                {...register('notes')}
                disabled={isSaving}
              />
              <FieldError message={errors.notes} />
            </label>
          </div>

          <div className="vault-form-option">
            <input id="account-primary" type="checkbox" {...register('isPrimary')} disabled={isSaving} />
            <label htmlFor="account-primary">
              <strong>Make this the primary account</strong>
              <span>Primary accounts appear first in summaries and account selectors.</span>
            </label>
          </div>

          <div className="vault-dialog-actions">
            <button className="vault-secondary-action" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="vault-primary-action" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AccountFormDialog;
