import { useEffect, useMemo } from 'react';
import RecurringIcon from './RecurringIcon';
import { buildRecurringPayload, createRecurringForm, recurringFrequencyOptions } from './recurringUtils';
import { useManagedForm } from '../../utils/useManagedForm';

const recurringFrequencyValues = recurringFrequencyOptions.map((option) => option.value);

const validateRecurringForm = (values) => {
  const errors = {};
  const amount = Number(values.amount);
  const name = String(values.name || '').trim();
  const notes = String(values.notes || '');

  if (!String(values.amount || '')) {
    errors.amount = 'Enter an amount.';
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  }

  if (!recurringFrequencyValues.includes(values.billingFrequency)) {
    errors.billingFrequency = 'Choose a supported frequency.';
  }

  if (!values.categoryId) {
    errors.categoryId = 'Choose an expense category.';
  }

  if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (name.length > 120) {
    errors.name = 'Keep name under 120 characters.';
  }

  if (!values.nextPaymentDate) {
    errors.nextPaymentDate = 'Choose the next payment date.';
  }

  if (notes.length > 500) {
    errors.notes = 'Keep notes under 500 characters.';
  }

  if (!['active', 'inactive'].includes(values.status)) {
    errors.status = 'Choose a supported status.';
  }

  return errors;
};

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="recurring-field-error">{message}</span>;
}

function RecurringFormDialog({ accounts, categories, isSaving, onClose, onSubmit, payment, saveError }) {
  const defaultValues = useMemo(() => createRecurringForm(payment, categories), [categories, payment]);
  const { errors, handleSubmit, register, reset } = useManagedForm({
    defaultValues,
    validate: validateRecurringForm,
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
              <FieldError message={errors.name} />
            </label>

            <label className="ledger-form-field">
              <span>Amount</span>
              <input min="0" placeholder="0.00" step="0.01" type="number" {...register('amount')} disabled={isSaving} />
              <FieldError message={errors.amount} />
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
              <FieldError message={errors.billingFrequency} />
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
              <FieldError message={errors.categoryId} />
            </label>

            <label className="ledger-form-field">
              <span>Next payment date</span>
              <input type="date" {...register('nextPaymentDate')} disabled={isSaving} />
              <FieldError message={errors.nextPaymentDate} />
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
              <FieldError message={errors.status} />
            </label>

            <label className="ledger-form-field ledger-form-field-wide">
              <span>Notes</span>
              <textarea
                placeholder="Optional private note"
                maxLength="500"
                {...register('notes')}
                disabled={isSaving}
              />
              <FieldError message={errors.notes} />
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
