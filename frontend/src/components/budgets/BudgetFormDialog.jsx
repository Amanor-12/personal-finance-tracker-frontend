import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import BudgetsIcon from './BudgetsIcon';
import { buildBudgetPayload, createBudgetForm, monthNames } from './budgetUtils';

const createBudgetSchema = (categories) =>
  z
    .object({
      amountLimit: z
        .string()
        .min(1, 'Enter a monthly limit.')
        .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
          message: 'Budget limit must be greater than zero.',
        }),
      categoryId: z.string().min(1, 'Choose an expense category.'),
      id: z.string().optional(),
      month: z.string().refine((value) => {
        const month = Number(value);
        return Number.isInteger(month) && month >= 1 && month <= 12;
      }, 'Choose a valid month.'),
      year: z.string().refine((value) => {
        const year = Number(value);
        return Number.isInteger(year) && year >= 2000 && year <= 2100;
      }, 'Choose a valid year.'),
    })
    .superRefine((values, context) => {
      const selectedCategory = categories.find((category) => String(category.id) === String(values.categoryId));

      if (!selectedCategory) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose an available expense category.',
          path: ['categoryId'],
        });
      }
    });

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="budget-field-error">{message}</span>;
}

function BudgetFormDialog({ budget, categories, isSaving, onClose, onSubmit, period, presetCategoryId, saveError }) {
  const schema = useMemo(() => createBudgetSchema(categories), [categories]);
  const defaultValues = useMemo(
    () => createBudgetForm(budget, period, categories, presetCategoryId),
    [budget, categories, period, presetCategoryId]
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    defaultValues,
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleValidSubmit = async (values) => {
    await onSubmit(buildBudgetPayload(values, budget?.id));
  };

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="budget-form-title"
        aria-modal="true"
        className="ledger-dialog budget-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-dialog-head">
          <div>
            <span className="ledger-eyebrow">Monthly budget</span>
            <h2 id="budget-form-title">{budget ? 'Edit budget' : 'Create budget'}</h2>
            <p>Set a real category limit for the selected month. Spend is calculated from your transactions.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close budget form" disabled={isSaving}>
            <BudgetsIcon type="close" />
          </button>
        </div>

        <form className="ledger-form" onSubmit={handleSubmit(handleValidSubmit)}>
          {saveError ? <p className="ledger-form-alert">{saveError}</p> : null}
          {!categories.length ? (
            <p className="ledger-form-alert">
              Add an expense category before creating budgets. Rivo only budgets against real categories.
            </p>
          ) : null}

          <div className="ledger-form-grid">
            <label className="ledger-form-field ledger-form-field-wide">
              <span>Category</span>
              <select {...register('categoryId')} disabled={isSaving || !categories.length} autoFocus>
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
              <span>Monthly limit</span>
              <input
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...register('amountLimit')}
                disabled={isSaving || !categories.length}
              />
              <FieldError message={errors.amountLimit?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Month</span>
              <select {...register('month')} disabled={isSaving || !categories.length}>
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.month?.message} />
            </label>

            <label className="ledger-form-field ledger-form-field-wide">
              <span>Year</span>
              <input
                max="2100"
                min="2000"
                type="number"
                {...register('year')}
                disabled={isSaving || !categories.length}
              />
              <FieldError message={errors.year?.message} />
            </label>
          </div>

          <div className="ledger-dialog-actions">
            <button className="ledger-secondary-action" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button className="ledger-primary-action" type="submit" disabled={isSaving || !categories.length}>
              {isSaving ? 'Saving...' : budget ? 'Save changes' : 'Create budget'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default BudgetFormDialog;
