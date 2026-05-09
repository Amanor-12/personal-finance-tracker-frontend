import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import TransactionsIcon from './TransactionsIcon';
import {
  buildTransactionPayload,
  createTransactionForm,
} from './transactionUtils';

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="ledger-field-error">{message}</span>;
}

const createTransactionSchema = (categories) =>
  z
    .object({
      accountId: z.string().optional(),
      amount: z
        .string()
        .min(1, 'Enter an amount greater than zero.')
        .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
          message: 'Enter an amount greater than zero.',
        }),
      categoryId: z.string().min(1, 'Choose a category.'),
      description: z
        .string()
        .trim()
        .min(1, 'Enter a merchant, payee, or short title.')
        .max(255, 'Keep the title under 255 characters.'),
      isRecurring: z.boolean().optional(),
      notes: z.string().max(500, 'Keep notes under 500 characters.').optional(),
      transactionDate: z.string().min(1, 'Choose a transaction date.'),
      type: z.enum(['expense', 'income']),
    })
    .superRefine((values, context) => {
      const category = categories.find((item) => String(item.id) === String(values.categoryId));

      if (category && category.type !== values.type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'The selected category must match the transaction type.',
          path: ['categoryId'],
        });
      }
    });

function TransactionFormDialog({
  accountOptions,
  categories,
  isSaving,
  mode,
  onClose,
  onSubmit,
  saveError,
  transaction,
}) {
  const title = mode === 'edit' ? 'Edit transaction' : 'Add transaction';
  const schema = useMemo(() => createTransactionSchema(categories), [categories]);
  const defaultValues = useMemo(
    () => createTransactionForm(transaction, categories),
    [categories, transaction]
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues,
    resolver: zodResolver(schema),
  });
  const transactionType = watch('type');
  const selectedCategoryId = watch('categoryId');
  const formCategories = useMemo(
    () => categories.filter((category) => category.type === transactionType),
    [categories, transactionType]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    const selectedCategory = categories.find(
      (category) => String(category.id) === String(selectedCategoryId)
    );

    if (selectedCategory?.type === transactionType) {
      return;
    }

    const fallbackCategory = categories.find((category) => category.type === transactionType);
    setValue('categoryId', fallbackCategory?.id ? String(fallbackCategory.id) : '', {
      shouldValidate: true,
    });
  }, [categories, selectedCategoryId, setValue, transactionType]);

  const handleValidSubmit = async (values) => {
    await onSubmit(buildTransactionPayload(values));
  };

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="transaction-form-title"
        aria-modal="true"
        className="ledger-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-dialog-head">
          <div>
            <span className="ledger-eyebrow">Manual ledger entry</span>
            <h2 id="transaction-form-title">{title}</h2>
            <p>Save only real movements that belong to this signed-in user.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close transaction form">
            <TransactionsIcon type="close" />
          </button>
        </div>

        <form className="ledger-form" onSubmit={handleSubmit(handleValidSubmit)}>
          {saveError ? <p className="ledger-form-alert">{saveError}</p> : null}

          <div className="ledger-form-grid">
            <label className="ledger-form-field ledger-form-field-wide">
              <span>Merchant or title</span>
              <input
                type="text"
                {...register('description')}
                placeholder="Example: Grocery shop, salary, rent"
                maxLength="255"
                autoFocus
                disabled={isSaving}
              />
              <FieldError message={errors.description?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Type</span>
              <select {...register('type')} disabled={isSaving}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label className="ledger-form-field">
              <span>Amount</span>
              <input
                min="0"
                step="0.01"
                type="number"
                {...register('amount')}
                placeholder="0.00"
                disabled={isSaving}
              />
              <FieldError message={errors.amount?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Category</span>
              <select
                {...register('categoryId')}
                disabled={isSaving || !formCategories.length}
              >
                <option value="">Choose category</option>
                {formCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.categoryId?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Date</span>
              <input
                type="date"
                {...register('transactionDate')}
                disabled={isSaving}
              />
              <FieldError message={errors.transactionDate?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Account</span>
              <select
                {...register('accountId')}
                disabled={isSaving || !accountOptions.length}
              >
                <option value="">
                  {accountOptions.length ? 'No account selected' : 'Add an account first'}
                </option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ledger-form-field ledger-form-field-wide">
              <span>Notes</span>
              <textarea
                {...register('notes')}
                placeholder="Private note for your own reference"
                disabled={isSaving}
              />
              <FieldError message={errors.notes?.message} />
            </label>
          </div>

          <div className="ledger-form-option">
            <input
              id="transaction-recurring"
              type="checkbox"
              {...register('isRecurring')}
              disabled={isSaving}
            />
            <label htmlFor="transaction-recurring">
              <strong>Mark as recurring</strong>
              <span>Use this later on the recurring payments page.</span>
            </label>
          </div>

          <div className="ledger-dialog-actions">
            <button className="ledger-secondary-action" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="ledger-primary-action" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default TransactionFormDialog;
