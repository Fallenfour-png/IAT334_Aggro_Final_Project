import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../lib/icons';
import { TODAY } from '../../lib/dates';
import { useClickOutside } from '../../lib/useClickOutside';
import { newId, useStore } from '../../state/store';
import { MILESTONE_TYPES, type GoalType, type Milestone, type MilestoneGoal, type MilestoneType } from '../../state/types';
import { DateField, Dialog, FieldLabel, NumberField, SelectField, StackedConfirm, TextField } from '../../components/ui/Dialog';

const METRICS: GoalType[] = ['Steam wishlists', 'Discord members', 'Patreon members', 'Press features', 'Short-form videos', 'Newsletter subscribers'];

const CHANNEL_FOR_TYPE: Record<MilestoneType, string> = {
  Deliverable: 'Event',
  Content: 'YouTube + TikTok',
  Event: 'Showcase',
  Fund: 'Grant',
  Press: 'Article',
  Revenue: 'Patreon',
};

interface Draft {
  title: string;
  type: MilestoneType | '';
  date: string;
  eventId: string;
  goals: MilestoneGoal[];
}

function EventPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'All' | 'Saved'>('All');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  const selected = state.events.find((e) => e.id === value);
  const match = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());
  const saved = state.events.filter((e) => e.saved && match(e.name));
  const recommended = tab === 'All' ? state.events.filter((e) => !e.saved && match(e.name)) : [];

  const option = (e: (typeof state.events)[number]) => (
    <button
      type="button"
      key={e.id}
      className={`event-option ${e.id === value ? 'is-selected' : ''}`}
      onClick={() => {
        onChange(e.id);
        setOpen(false);
      }}
    >
      <Icon name={e.saved ? 'bookmark-filled-16' : 'bookmark-outline-16'} size={16} />
      <span className="event-option__text">
        <span className="t-btn c-1 nowrap">{e.name}</span>
        <span className="t-body-2 c-2 pre">{`${e.where}  •  ${e.when}`}</span>
      </span>
      {e.id === value && <Icon name="check-accent-16" size={16} />}
    </button>
  );

  return (
    <div className="popover-anchor" ref={ref} style={{ width: '100%' }}>
      <button type="button" className={`input t-body ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className={`pre ${selected ? '' : 'c-2'}`}>
          {selected ? `${selected.name}${selected.saved ? '  •  Saved' : ''}` : 'Select an event'}
        </span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="event-picker">
          <div className="event-picker__top">
            <label className="event-search">
              <Icon name="search-16" size={16} />
              <input className="t-body" placeholder="Search events" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            </label>
            <div className="segmented">
              {(['All', 'Saved'] as const).map((t) => (
                <button type="button" key={t} className={`segmented__item t-btn ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'Saved' ? `Saved (${state.events.filter((e) => e.saved).length})` : t}
                </button>
              ))}
            </div>
          </div>
          {saved.length > 0 && <p className="t-banner c-2">SAVED</p>}
          {saved.map(option)}
          {recommended.length > 0 && <p className="t-banner c-2">RECOMMENDED FOR YOU</p>}
          {recommended.map(option)}
          {saved.length + recommended.length === 0 && <p className="t-body-2 c-3" style={{ padding: '8px 10px' }}>No events match “{query}”.</p>}
          <div className="menu-divider" />
          <button type="button" className="t-btn c-accent pre" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/plan')}>
            {'Find more events on Plan  →'}
          </button>
        </div>
      )}
    </div>
  );
}

export function MilestoneDialog({ milestone, defaultDate, onClose }: { milestone?: Milestone; defaultDate?: string; onClose: () => void }) {
  const { saveMilestone, removeMilestone, update } = useStore();
  const isNew = !milestone;
  const initial: Draft = useMemo(
    () =>
      milestone
        ? { title: milestone.title, type: milestone.type, date: milestone.date, eventId: milestone.eventId ?? '', goals: milestone.goals }
        : { title: '', type: '', date: defaultDate ?? '', eventId: '', goals: [] },
    [milestone, defaultDate],
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [newGoal, setNewGoal] = useState<{ metric: GoalType | ''; target: number | '' }>({ metric: '', target: '' });
  const [confirm, setConfirm] = useState<'delete' | 'discard' | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || newGoal.metric !== '' || newGoal.target !== '';
  const dateError = draft.date !== '' && draft.date < TODAY && draft.date !== initial.date;
  const complete = draft.title.trim() !== '' && draft.type !== '' && draft.date !== '';
  const canSave = dirty && complete && !dateError;
  const showEvent = draft.type === 'Event' || draft.type === 'Deliverable';

  const requestClose = () => (dirty ? setConfirm('discard') : onClose());

  const addGoalRow = () => {
    if (newGoal.metric === '' || newGoal.target === '') return;
    set('goals', [...draft.goals, { metric: newGoal.metric, target: newGoal.target }]);
    setNewGoal({ metric: '', target: '' });
  };

  const save = () => {
    if (!canSave) return;
    const goals = newGoal.metric !== '' && newGoal.target !== '' ? [...draft.goals, { metric: newGoal.metric, target: newGoal.target }] : draft.goals;
    const type = draft.type as MilestoneType;
    const event = showEvent && draft.eventId ? draft.eventId : undefined;
    const next: Milestone = {
      id: milestone?.id ?? newId('m'),
      title: draft.title.trim(),
      type,
      channel: milestone && milestone.type === type ? milestone.channel : CHANNEL_FOR_TYPE[type],
      date: draft.date,
      eventId: event,
      goals,
    };
    // Picking a recommended event saves it, like bookmarking it on Plan.
    if (event) update((s) => ({ ...s, events: s.events.map((e) => (e.id === event ? { ...e, saved: true } : e)) }));
    saveMilestone(next, isNew);
    onClose();
  };

  return (
    <Dialog
      title={isNew ? 'Add Milestone' : 'Edit Milestone'}
      subtitle={isNew ? 'Add more milestones and your goals' : 'Edit your milestone and your goals'}
      onClose={requestClose}
    >
      <div className="field">
        <FieldLabel required>Milestone</FieldLabel>
        <TextField value={draft.title} onChange={(v) => set('title', v)} placeholder="e.g. Steam Next Fest demo submission" />
      </div>

      <div className="field-row">
        <div className="field">
          <FieldLabel required>Type</FieldLabel>
          <SelectField value={draft.type} options={MILESTONE_TYPES} placeholder="Select a type" onChange={(v) => set('type', v)} />
        </div>
        <div className="field">
          <FieldLabel required>Date</FieldLabel>
          <DateField value={draft.date} onChange={(v) => set('date', v)} error={dateError} />
          {dateError && <p className="t-body-2 field-error">Date can’t be in the past.</p>}
        </div>
      </div>

      {showEvent && (
        <div className="field">
          <p className="t-body field-label">Event</p>
          <EventPicker value={draft.eventId} onChange={(id) => set('eventId', id)} />
        </div>
      )}

      <div className="ms-goals">
        <p className="t-body" style={{ color: '#000' }}>
          Goal for this milestone
        </p>
        {draft.goals.map((g, i) => (
          <div className="ms-goal-row" key={`${g.metric}-${i}`}>
            <SelectField
              value={g.metric}
              options={METRICS}
              onChange={(v) => set('goals', draft.goals.map((x, j) => (j === i ? { ...x, metric: v } : x)))}
            />
            <NumberField
              value={g.target}
              onChange={(v) => set('goals', draft.goals.map((x, j) => (j === i ? { ...x, target: v === '' ? 0 : v } : x)))}
            />
            <button
              type="button"
              className="square-btn square-btn--remove"
              aria-label="Remove goal"
              title="Remove goal"
              onClick={() => set('goals', draft.goals.filter((_, j) => j !== i))}
            >
              {/* Remix Icon "ri-close-fill" */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z" />
              </svg>
            </button>
          </div>
        ))}
        <div className="ms-goal-row">
          <SelectField value={newGoal.metric} options={METRICS} placeholder="Metric" onChange={(v) => setNewGoal((n) => ({ ...n, metric: v }))} />
          <NumberField value={newGoal.target} placeholder="Target" onChange={(v) => setNewGoal((n) => ({ ...n, target: v }))} />
          <button
            type="button"
            className="square-btn square-btn--add t-body"
            aria-label="Add goal"
            disabled={newGoal.metric === '' || newGoal.target === ''}
            onClick={addGoalRow}
          >
            +
          </button>
        </div>
      </div>

      <div className="dialog-actions">
        <button type="button" className="btn btn--remove t-btn" onClick={() => (isNew ? requestClose() : setConfirm('delete'))}>
          Delete
          <Icon name="trash-14" size={14} tint />
        </button>
        <button type="button" className="btn btn--save t-btn" disabled={!canSave} onClick={save}>
          {'Save '}
          <Icon name={canSave ? 'check-14-white' : 'check-14-muted'} size={14} />
        </button>
      </div>

      {confirm === 'delete' && milestone && (
        <StackedConfirm
          tone="danger"
          title="Delete this milestone?"
          body={`“${milestone.title}” will be removed from your plan. Goals linked to it are kept.`}
          cancelLabel="Cancel"
          confirmLabel="Delete milestone"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeMilestone(milestone.id);
            onClose();
          }}
        />
      )}
      {confirm === 'discard' && (
        <StackedConfirm
          tone="warning"
          title="Discard your changes?"
          body={isNew ? 'Your new milestone hasn’t been saved. If you close now, it will be lost.' : 'You have unsaved changes. If you close now, they won’t be saved.'}
          cancelLabel="Keep editing"
          confirmLabel="Discard changes"
          onCancel={() => setConfirm(null)}
          onConfirm={onClose}
        />
      )}
    </Dialog>
  );
}
