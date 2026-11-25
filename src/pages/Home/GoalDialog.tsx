import { useMemo, useState } from 'react';
import { Icon } from '../../lib/icons';
import { formatNumber, TODAY } from '../../lib/dates';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { GOAL_UNIT, goalCurrent, goalPercent, isAutoGoal } from '../../state/selectors';
import { newId, useStore } from '../../state/store';
import { AUTO_GOAL_SOURCE, GOAL_TYPES, type Goal, type GoalType } from '../../state/types';
import { DateField, Dialog, FieldLabel, focusFirstInvalid, NumberField, SelectField, StackedConfirm, TextField } from '../../components/ui/Dialog';

const SOURCE_NAME = { steam: 'Steamworks', discord: 'Discord', patreon: 'Patreon', newsletter: 'your newsletter' } as Record<string, string>;

interface Draft {
  title: string;
  type: GoalType | '';
  current: number | '';
  target: number | '';
  due: string;
}

export function GoalDialog({ goal, defaultDate, onClose }: { goal?: Goal; defaultDate?: string; onClose: () => void }) {
  const { state, saveGoal, removeGoal } = useStore();
  const isNew = !goal;
  const initial: Draft = useMemo(
    () =>
      goal
        ? { title: goal.title, type: goal.type, current: goal.current, target: goal.target, due: goal.due }
        : { title: '', type: '', current: 0, target: '', due: defaultDate ?? state.project?.launch ?? TODAY },
    [goal, defaultDate, state.project?.launch],
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState<'remove' | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const auto = draft.type !== '' && isAutoGoal(draft.type);
  const autoCurrent = auto
    ? goalCurrent(state, { id: goal?.id ?? 'draft', title: '', current: goal?.current ?? 0, target: 1, due: TODAY, type: draft.type as GoalType })
    : 0;
  const current = auto ? autoCurrent : draft.current === '' ? 0 : draft.current;

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const { requestLeave, confirmation } = useUnsavedChanges(dirty);
  const targetError = draft.target !== '' && draft.target <= current && !(goal?.completedAt && draft.target === goal.target);
  const dateError = draft.due !== '' && draft.due < TODAY;
  const complete = draft.title.trim() !== '' && draft.type !== '' && draft.target !== '' && draft.due !== '';
  const canSave = dirty && complete && !targetError && !dateError;
  const errors = {
    title: !draft.title.trim() ? 'Enter a goal name.' : undefined,
    type: !draft.type ? 'Choose a goal type.' : undefined,
    target: draft.target === '' ? 'Enter a target.' : targetError ? `Enter a target greater than your current progress (${formatNumber(current)}).` : undefined,
    due: !draft.due ? 'Choose a due date.' : dateError ? 'Choose today or a future date for the due date.' : undefined,
  };

  const requestClose = () => requestLeave(onClose);

  const save = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTried(true);
    if (!canSave) {
      focusFirstInvalid(event.currentTarget.closest('[role="dialog"]'));
      return;
    }
    const target = draft.target as number;
    const next: Goal = {
      id: goal?.id ?? newId('g'),
      title: draft.title.trim(),
      type: draft.type as GoalType,
      current: auto ? autoCurrent : current,
      target,
      due: draft.due,
      completedAt: current >= target ? goal?.completedAt ?? TODAY : undefined,
    };
    saveGoal(next, isNew);
    onClose();
  };

  const unit = draft.type ? GOAL_UNIT[draft.type as GoalType] : undefined;

  return (
    <Dialog title={isNew ? 'Add Goal' : 'Edit Goal'} subtitle={isNew ? 'Add more goals for your milestone' : 'Edit your goal'} onClose={requestClose}>
      <div className="field">
        <FieldLabel required>Your Goal</FieldLabel>
        <TextField label="Goal name" value={draft.title} onChange={(v) => set('title', v)} placeholder="e.g. Reach 25,000 Steam wishlists by launch" error={tried ? errors.title : undefined} />
      </div>

      <div className="field">
        <FieldLabel required>Type</FieldLabel>
        <SelectField label="Goal type" value={draft.type} options={GOAL_TYPES} placeholder="Select a type" onChange={(v) => set('type', v)} error={tried ? errors.type : undefined} />
      </div>

      {draft.type !== '' &&
        (auto ? (
          <div className="field">
            <p className="t-body field-label">Current progress (automatic)</p>
            <div className="input input--readonly t-body" style={{ justifyContent: 'flex-start' }}>
              <span>{formatNumber(autoCurrent)}</span>
              <span className="c-3">
                of {draft.target === '' ? '—' : formatNumber(draft.target)}
                {draft.target !== '' && `  ·  ${goalPercent(autoCurrent, draft.target)}%`}
              </span>
            </div>
            <p className="t-body-2 field-help">
              Updates automatically from {SOURCE_NAME[AUTO_GOAL_SOURCE[draft.type as GoalType] ?? ''] ?? 'your account'}. Last synced 2h ago.
            </p>
          </div>
        ) : (
          <div className="field">
            <p className="t-body field-label">Current progress (manual)</p>
            <NumberField
              value={draft.current}
              onChange={(v) => set('current', v)}
              suffix={`of ${draft.target === '' ? '—' : formatNumber(draft.target)}${unit ? ` ${unit}` : ''}`}
            />
            <p className="t-body-2 field-help">
              {draft.type === 'Custom' ? 'Custom goals' : draft.type} aren’t tracked automatically. Wishlist, Discord and Patreon goals update on
              their own.
            </p>
          </div>
        ))}

      <div className="field-row">
        <div className="field">
          <FieldLabel required>Target</FieldLabel>
          <NumberField label="Target" value={draft.target} onChange={(v) => set('target', v)} placeholder="Target" error={tried ? errors.target : undefined} />
        </div>
        <div className="field">
          <FieldLabel required>Date</FieldLabel>
          <DateField label="Due date" value={draft.due} onChange={(v) => set('due', v)} error={tried ? errors.due : undefined} />
        </div>
      </div>

      <div className="dialog-actions">
        {isNew ? (
          <span />
        ) : (
          <button type="button" className="btn btn--remove t-btn" onClick={() => setConfirm('remove')}>
            Remove
            <Icon name="trash-14" size={14} tint />
          </button>
        )}
        <button type="button" className="btn btn--save t-btn" disabled={!isNew && !dirty} onClick={save}>
          {'Save '}
          <Icon name={isNew || dirty ? 'check-14-white' : 'check-14-muted'} size={14} />
        </button>
      </div>

      {confirm === 'remove' && goal && (
        <StackedConfirm
          tone="danger"
          title="Remove this goal?"
          body={`“${goal.title}” and its progress history will be removed. Milestones linked to it are kept.`}
          cancelLabel="Cancel"
          confirmLabel="Remove goal"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeGoal(goal.id);
            onClose();
          }}
        />
      )}
      {confirmation}
    </Dialog>
  );
}
