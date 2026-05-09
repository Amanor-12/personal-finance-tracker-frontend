import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AccountsIcon from './AccountsIcon';
import { accountTypeOptions, createAccountForm } from './accountUtils';

const accountSchema = z.object({
  accountType: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'other']),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'Use a three-letter currency code.'),
  id: z.union([z.string(), z.number()]).optional(),
  institutionName: z.string().max(120, 'Keep institution under 120 characters.').optional(),
  isPrimary: z.boolean().optional(),
  maskedIdentifier: z.string().max(20, 'Keep identifier under 20 characters.').optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Keep name under 80 characters.'),
  notes: z.string().max(255, 'Keep notes under 255 characters.').optional(),
  openingBalance: z
    .string()
    .min(1, 'Enter an opening balance.')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: 'Opening balance must be zero or greater.',
    }),
});

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="vault-field-error">{message}</span>;
}

function AccountFormDialog({ account, isSaving, onClose, onSubmit, saveError }) {
  const mode = account ? 'edit' : 'add';
  const defaultValues = useMemo(() => createAccountForm(account), [account]);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    defaultValues,
    resolver: zodResolver(accountSchema),
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleValidSubmit = async (values) => {
    await onSubmit({
      ...values,
      currency: values.currency.toUpperCase(),
      id: account?.id,
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
              <FieldError message={errors.name?.message} />
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
            </label>

            <label className="vault-field">
              <span>Currency</span>
              <input type="text" maxLength="3" {...register('currency')} disabled={isSaving} />
              <FieldError message={errors.currency?.message} />
            </label>

            <label className="vault-field">
              <span>Institution</span>
              <input
                type="text"
                placeholder="Optional"
                {...register('institutionName')}
                disabled={isSaving}
              />
              <FieldError message={errors.institutionName?.message} />
            </label>

            <label className="vault-field">
              <span>Masked identifier</span>
              <input
                type="text"
                placeholder="**** 1234"
                {...register('maskedIdentifier')}
                disabled={isSaving}
              />
              <FieldError message={errors.maskedIdentifier?.message} />
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
              <FieldError message={errors.openingBalance?.message} />
            </label>

            <label className="vault-field vault-field-wide">
              <span>Notes</span>
              <textarea
                placeholder="Optional private notes"
                {...register('notes')}
                disabled={isSaving}
              />
              <FieldError message={errors.notes?.message} />
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
