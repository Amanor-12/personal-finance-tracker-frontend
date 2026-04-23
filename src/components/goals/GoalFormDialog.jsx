import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import GoalsIcon from './GoalsIcon';
import { buildGoalPayload, createGoalForm } from './goalUtils';

const goalSchema = z.object({
  currentAmount: z
    .string()
    .optional()
    .refine((value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0), {
      message: 'Current amount must be zero or greater.',
    }),
  goalType: z.enum(['save', 'payoff']),
  id: z.string().optional(),
  targetAmount: z
    .string()
    .min(1, 'Enter a target amount.')
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
      message: 'Target amount must be greater than zero.',
    }),
  targetDate: z.string().optional(),
  title: z.string().trim().min(2, 'Goal name must be at least 2 characters.').max(80, 'Keep goal name under 80 characters.'),
});

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="goals-field-error">{message}</span>;
}

function GoalFormDialog({ goal, isSaving, onClose, onSubmit, saveError }) {
  const defaultValues = useMemo(() => createGoalForm(goal), [goal]);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    defaultValues,
    resolver: zodResolver(goalSchema),
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleValidSubmit = async (values) => {
    await onSubmit(buildGoalPayload(values, goal?.id));
  };

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="goal-form-title"
        aria-modal="true"
        className="ledger-dialog goals-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-dialog-head">
          <div>
            <span className="ledger-eyebrow">Goal</span>
            <h2 id="goal-form-title">{goal ? 'Edit goal' : 'Create goal'}</h2>
            <p>Save a target for this private workspace and update progress over time.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close goal form" disabled={isSaving}>
            <GoalsIcon type="close" />
          </button>
        </div>

        <form className="ledger-form" onSubmit={handleSubmit(handleValidSubmit)}>
          {saveError ? <p className="ledger-form-alert">{saveError}</p> : null}

          <div className="ledger-form-grid">
            <label className="ledger-form-field ledger-form-field-wide">
              <span>Goal name</span>
              <input
                type="text"
                placeholder="Emergency fund, travel, debt payoff"
                {...register('title')}
                disabled={isSaving}
                autoFocus
              />
              <FieldError message={errors.title?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Type</span>
              <select {...register('goalType')} disabled={isSaving}>
                <option value="save">Save up</option>
                <option value="payoff">Pay down</option>
              </select>
            </label>

            <label className="ledger-form-field">
              <span>Target amount</span>
              <input
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...register('targetAmount')}
                disabled={isSaving}
              />
              <FieldError message={errors.targetAmount?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Current saved</span>
              <input
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...register('currentAmount')}
                disabled={isSaving}
              />
              <FieldError message={errors.currentAmount?.message} />
            </label>

            <label className="ledger-form-field">
              <span>Target date</span>
              <input type="date" {...register('targetDate')} disabled={isSaving} />
              <FieldError message={errors.targetDate?.message} />
            </label>
          </div>

          <div className="ledger-dialog-actions">
            <button className="ledger-secondary-action" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button className="ledger-primary-action" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : goal ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default GoalFormDialog;
