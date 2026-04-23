import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import RecurringIcon from './RecurringIcon';
import { buildRecurringPayload, createRecurringForm, recurringFrequencyOptions } from './recurringUtils';

const recurringSchema = z.object({
  accountId: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Enter an amount.')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
      message: 'Amount must be greater than zero.',
    }),
  billingFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'custom']),
  categoryId: z.string().min(1, 'Choose an expense category.'),
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120, 'Keep name under 120 characters.'),
  nextPaymentDate: z.string().min(1, 'Choose the next payment date.'),
  notes: z.string().max(500, 'Keep notes under 500 characters.').optional(),
  status: z.enum(['active', 'inactive']),
});

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="recurring-field-error">{message}</span>;
}

function RecurringFormDialog({ accounts, categories, isSaving, onClose, onSubmit, payment, saveError }) {
  const defaultValues = useMemo(() => createRecurringForm(payment, categories), [categories, payment]);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    defaultValues,
    resolver: zodResolver(recurringSchema),
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleValidSubmit = async (values) => {
    await onSubmit(buildRecurringPayload(values, payment?.id));
  };

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="recurring-form-title"
        aria-modal="true"
        className="ledger-dialog recurring-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-dialog-head">
          <div>
            <span className="ledger-eyebrow">Recurring payment</span>
            <h2 id="recurring-form-title">{payment ? 'Edit recurring payment' : 'Add recurring payment'}</h2>
            <p>Track personal recurring expenses like rent, phone bills, subscriptions, and insurance.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close recurring payment form" disabled={isSaving}>
            <RecurringIcon type="close" />
          </button>
        </div>

        <form className="ledger-form" onSubmit={handleSubmit(handleValidSubmit)}>
          {saveError ? <p className="ledger-form-alert">{saveError}</p> : null}
          {!categories.length ? (
            <p className="ledger-form-alert">Add an expense category before creating recurring payments.</p>
          ) : null}

          <div className="ledger-form-grid">
            <label className="ledger-form-field ledger-form-field-wide">
              <span>Name</span>
              <input
                type="text"
                placeholder="Rent, gym membership, phone bill"
                {...register('name')}
                disabled={isSaving}
                autoFocus
              />
              <FieldError message={errors.name?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Amount</span>
              <input min="0" placeholder="0.00" step="0.01" type="number" {...register('amount')} disabled={isSaving} />
              <FieldError message={errors.amount?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Frequency</span>
              <select {...register('billingFrequency')} disabled={isSaving}>
                {recurringFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="ledger-form-field">
              <span>Category</span>
              <select {...register('categoryId')} disabled={isSaving || !categories.length}>
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.categoryId?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Next payment date</span>
              <input type="date" {...register('nextPaymentDate')} disabled={isSaving} />
              <FieldError message={errors.nextPaymentDate?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Account</span>
              <select {...register('accountId')} disabled={isSaving || !accounts.length}>
                <option value="">{accounts.length ? 'No account selected' : 'Add an account first'}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ledger-form-field">
              <span>Status</span>
              <select {...register('status')} disabled={isSaving}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="ledger-form-field ledger-form-field-wide">
              <span>Notes</span>
              <textarea placeholder="Optional private note" {...register('notes')} disabled={isSaving} />
              <FieldError message={errors.notes?.message} />
            </label>
          </div>

          <div className="ledger-dialog-actions">
            <button className="ledger-secondary-action" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button className="ledger-primary-action" type="submit" disabled={isSaving || !categories.length}>
              {isSaving ? 'Saving...' : payment ? 'Save changes' : 'Add recurring payment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default RecurringFormDialog;
