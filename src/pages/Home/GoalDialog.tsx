import { useMemo, useState } from 'react';
import { Icon } from '../../lib/icons';
import { formatNumber, TODAY } from '../../lib/dates';
import { GOAL_UNIT, goalCurrent, goalPercent, isAutoGoal } from '../../state/selectors';
import { newId, useStore } from '../../state/store';
import { AUTO_GOAL_SOURCE, GOAL_TYPES, type Goal, type GoalType } from '../../state/types';
import { DateField, Dialog, FieldLabel, NumberField, SelectField, StackedConfirm, TextField } from '../../components/ui/Dialog';

const SOURCE_NAME = { steam: 'Steamworks', discord: 'Discord', patreon: 'Patreon' } as Record<string, string>;

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
        : { title: '', type: '', current: 0, target: '', due: defaultDate ?? '2026-10-14' },
    [goal, defaultDate],
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [confirm, setConfirm] = useState<'remove' | 'discard' | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const auto = draft.type !== '' && isAutoGoal(draft.type);
  const autoCurrent = auto
    ? goalCurrent(state, { id: goal?.id ?? 'draft', title: '', current: goal?.current ?? 0, target: 1, due: TODAY, type: draft.type as GoalType })
    : 0;
  const current = auto ? autoCurrent : draft.current === '' ? 0 : draft.current;

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const targetError = draft.target !== '' && draft.target <= current && !(goal?.completedAt && draft.target === goal.target);
  const dateError = draft.due !== '' && draft.due < TODAY;
  const complete = draft.title.trim() !== '' && draft.type !== '' && draft.target !== '' && draft.due !== '';
  const canSave = dirty && complete && !targetError && !dateError;

  const requestClose = () => (dirty ? setConfirm('discard') : onClose());

  const save = () => {
    if (!canSave) return;
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
  const discardBody = (() => {
    if (!goal) return 'Your new goal hasn’t been saved. If you close now, it will be lost.';
    const changed = (Object.keys(draft) as (keyof Draft)[]).filter((k) => draft[k] !== initial[k]);
    if (changed.length === 1 && changed[0] === 'target')
      return `You changed the target from ${formatNumber(initial.target as number)} to ${formatNumber((draft.target || 0) as number)}. If you close now, this change won’t be saved.`;
    return 'You have unsaved changes. If you close now, they won’t be saved.';
  })();

  return (
    <Dialog title={isNew ? 'Add Goal' : 'Edit Goal'} subtitle={isNew ? 'Add more goals for your milestone' : 'Edit your goal'} onClose={requestClose}>
      <div className="field">
        <FieldLabel required>Your Goal</FieldLabel>
        <TextField value={draft.title} onChange={(v) => set('title', v)} placeholder="e.g. Reach 25,000 Steam wishlists by launch" />
      </div>

      <div className="field">
        <FieldLabel required>Type</FieldLabel>
        <SelectField value={draft.type} options={GOAL_TYPES} placeholder="Select a type" onChange={(v) => set('type', v)} />
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
          <NumberField value={draft.target} onChange={(v) => set('target', v)} placeholder="Target" error={targetError} />
          {targetError && <p className="t-body-2 field-error">Target must be higher than current progress ({formatNumber(current)}).</p>}
        </div>
        <div className="field">
          <FieldLabel required>Date</FieldLabel>
          <DateField value={draft.due} onChange={(v) => set('due', v)} error={dateError} />
          {dateError && <p className="t-body-2 field-error">Due date can’t be in the past.</p>}
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
        <button type="button" className="btn btn--save t-btn" disabled={!canSave} onClick={save}>
          {'Save '}
          <Icon name={canSave ? 'check-14-white' : 'check-14-muted'} size={14} />
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
      {confirm === 'discard' && (
        <StackedConfirm
          tone="warning"
          title="Discard your changes?"
          body={discardBody}
          cancelLabel="Keep editing"
          confirmLabel="Discard changes"
          onCancel={() => setConfirm(null)}
          onConfirm={onClose}
        />
      )}
    </Dialog>
  );
}
