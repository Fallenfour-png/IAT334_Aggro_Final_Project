import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { daysFromToday, formatNumber, parseDate, TODAY } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { useClickOutside } from '../../lib/useClickOutside';
import { goalPercent } from '../../state/selectors';
import { useStore } from '../../state/store';
import type { Milestone } from '../../state/types';
import {
  CAL_KINDS,
  calendarItems,
  dayHeading,
  KIND_COLOR,
  longDate,
  METRIC_LABEL,
  metricCurrent,
  monthCells,
  MONTHS_LONG,
  type CalItem,
  type CalKind,
} from './planData';

/* ---------------- Upcoming milestone hero ---------------- */

export function MilestoneHero({ milestone, onPickDate, onAddMilestone }: { milestone?: Milestone; onPickDate: (iso: string) => void; onAddMilestone: () => void }) {
  const { state } = useStore();

  if (!milestone) {
    return (
      <section className="hero">
        <div className="hero__left">
          <p className="hero-heading">No milestone</p>
          <p className="t-body-2 hero-sub">Pick your next big date, like a demo submission or launch, and we’ll count down to it.</p>
          <button type="button" className="btn btn--primary t-btn" style={{ alignSelf: 'flex-start' }} onClick={onAddMilestone}>
            {'Set milestone + '}
          </button>
        </div>
        <div className="hero__right">
          <p className="hero-heading">Goal for upcoming milestone</p>
          <div className="hero-empty-goals">
            <p className="t-h4 c-1">No goals for this milestone yet</p>
            <p className="t-body-2 c-2">Goals you add will show their progress here.</p>
          </div>
        </div>
      </section>
    );
  }

  const days = daysFromToday(milestone.date);
  return (
    <section className="hero">
      <div className="hero__left">
        <p className="hero-heading">{milestone.title}</p>
        <div className="hero-count">
          <span className="hero-count__num">{days}</span>
          <span className="hero-count__days">{days === 1 ? 'Day' : 'Days'}</span>
        </div>
        <button type="button" className="hero-date" onClick={() => onPickDate(milestone.date)}>
          {longDate(milestone.date)}
        </button>
      </div>
      <div className="hero__right">
        <p className="hero-heading">Goal for upcoming milestone</p>
        {milestone.goals.length === 0 ? (
          <div className="hero-empty-goals">
            <p className="t-h4 c-1">No goals for this milestone yet</p>
            <p className="t-body-2 c-2">Goals you add will show their progress here.</p>
          </div>
        ) : (
          <div className="hero-goals">
            {milestone.goals.map((g, i) => {
              const current = metricCurrent(state, g);
              const pct = goalPercent(current, g.target);
              return (
                <div className="hero-goal" key={`${g.metric}-${i}`}>
                  <span className="hero-pill">{METRIC_LABEL[g.metric]}</span>
                  <div className="hero-value">
                    <span className="hero-value__num">{formatNumber(current)}</span>
                    <span className="hero-value__of">/ {formatNumber(g.target)}</span>
                  </div>
                  <div className="hero-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="hero-foot">
                    <span>{pct}% done</span>
                    <span>{pct >= 100 ? 'Reached' : `${formatNumber(g.target - current)} to go`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Calendar ---------------- */

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

export function CalendarCard({
  selected,
  onSelect,
  view,
  onView,
  onOpenItem,
  onAdd,
}: {
  selected: string[];
  onSelect: (days: string[]) => void;
  view: { year: number; month: number };
  onView: (v: { year: number; month: number }) => void;
  onOpenItem: (item: CalItem) => void;
  onAdd: (kind: CalKind, iso: string) => void;
}) {
  const { state } = useStore();

  const items = useMemo(() => calendarItems(state), [state]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const i of items) map.set(i.date, [...(map.get(i.date) ?? []), i]);
    return map;
  }, [items]);

  const cells = monthCells(view.year, view.month);
  const todayDate = parseDate(TODAY);
  const awayFromToday = view.year !== todayDate.getUTCFullYear() || view.month !== todayDate.getUTCMonth();

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    onView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  return (
    <section className="card cal-card" id="plan-calendar">
      <div className="cal-head">
        <MonthPicker view={view} onView={onView} />
        <div className="cal-nav" role="group" aria-label="Change month">
          <button type="button" className="has-tip" aria-label="Previous month" onClick={() => shift(-1)}>
            <Icon name="chevron-right" size={20} className="flip-x" tint />
            <span className="tip">Last Month</span>
          </button>
          <button type="button" className="has-tip" aria-label="Next month" onClick={() => shift(1)}>
            <Icon name="chevron-right" size={20} tint />
            <span className="tip">Next Month</span>
          </button>
        </div>
      </div>
      <div className="cal-weekdays">
        {WEEKDAY_HEADERS.map((d) => (
          <p key={d} className="t-h4">
            {d}
          </p>
        ))}
      </div>
      <div className={`cal-grid-wrap ${awayFromToday ? 'is-away' : ''}`}>
      <div className="cal-grid">
        {cells.map(({ iso, inMonth }, idx) => {
          const dayItems = inMonth ? byDay.get(iso) ?? [] : [];
          const isSel = selected.includes(iso);
          const kinds = [...new Set(dayItems.map((i) => i.kind))];
          const body = (
            <>
              <span className="t-body cal-day__num">{parseDate(iso).getUTCDate()}</span>
              {kinds.length > 0 && (
                <span className="cal-dots">
                  {kinds.map((k) => (
                    <span key={k} className="cal-dot" style={{ background: KIND_COLOR[k] }} />
                  ))}
                </span>
              )}
            </>
          );

          // Figma: a greyed day from another month only switches the month.
          if (!inMonth) {
            return (
              <button
                type="button"
                key={iso}
                className="cal-day is-other"
                onClick={() => {
                  const d = parseDate(iso);
                  onView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
                }}
              >
                {body}
              </button>
            );
          }
          return (
            <DayCell
              key={iso}
              iso={iso}
              items={dayItems}
              selected={isSel}
              isToday={iso === TODAY}
              alignRight={idx % 7 >= 4}
              onToggle={() => onSelect(isSel ? [] : [iso])}
              onClose={() => onSelect([])}
              onOpenItem={onOpenItem}
              onAdd={(kind) => {
                onSelect([]);
                onAdd(kind, iso);
              }}
            >
              {body}
            </DayCell>
          );
        })}
      </div>
        {awayFromToday && (
          <button
            type="button"
            className="back-today"
            onClick={() => {
              const t = parseDate(TODAY);
              onView({ year: t.getUTCFullYear(), month: t.getUTCMonth() });
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2V4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 9.25022 5.38734 6.82447 7.50024 5.38451L7.5 8H9.5V2L3.5 2V4L5.99918 3.99989C3.57075 5.82434 2 8.72873 2 12Z" />
            </svg>
            Back to today
          </button>
        )}
      </div>

      <div className="legend">
        {CAL_KINDS.map((k) => (
          <span key={k.kind} className="legend-tag t-body">
            <span className="legend-dot" style={{ background: k.color }} />
            {k.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Day cell with hover / selected preview ---------------- */

const KIND_TAG: Record<CalKind, string> = { milestone: 'MILESTONE', goal: 'GOAL', event: 'EVENT', fund: 'FUND' };
const ADD_OPTIONS: { kind: CalKind; label: string }[] = [
  { kind: 'milestone', label: 'Milestone' },
  { kind: 'goal', label: 'Goal' },
  { kind: 'event', label: 'Event' },
  { kind: 'fund', label: 'Fund' },
];

function DayCell({
  iso,
  items,
  selected,
  isToday,
  alignRight,
  onToggle,
  onClose,
  onOpenItem,
  onAdd,
  children,
}: {
  iso: string;
  items: CalItem[];
  selected: boolean;
  isToday: boolean;
  alignRight: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenItem: (item: CalItem) => void;
  onAdd: (kind: CalKind) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [adding, setAdding] = useState(false);
  const closeAll = useCallback(() => {
    setAdding(false);
    onClose();
  }, [onClose]);
  useClickOutside(ref, selected, closeAll);

  // Hover previews days that have something on them; a selected day always shows its card.
  const showPreview = selected || (hover && items.length > 0);
  const cls = ['cal-day', items.length ? 'has-items' : '', isToday ? 'is-today' : '', selected ? 'is-selected' : '', showPreview && !selected ? 'is-hover' : ''].join(' ');

  return (
    <div className="cal-cell" ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        id={`day-card-${iso}`}
        className={cls}
        aria-pressed={selected}
        aria-current={isToday ? 'date' : undefined}
        onClick={() => {
          setAdding(false);
          onToggle();
        }}
      >
        {children}
      </button>

      {showPreview && (
        <div className={`day-pop ${alignRight ? 'day-pop--right' : ''}`}>
          <div className="day-pop__card" role="dialog" aria-label={dayHeading(iso)}>
            <div className="day-pop__head">
              <p className="day-pop__title">{dayPopHeading(iso)}</p>
              <p className="day-pop__count">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            {items.length === 0 ? (
              <p className="day-pop__none">Nothing on this day yet.</p>
            ) : (
              <div className="day-pop__items">
                {items.map((i) => (
                  <button
                    type="button"
                    key={i.kind + i.refId}
                    className="day-pop__item"
                    style={{ borderLeftColor: KIND_COLOR[i.kind] }}
                    onClick={() => {
                      closeAll();
                      onOpenItem(i);
                    }}
                  >
                    <span className="day-pop__kind">{KIND_TAG[i.kind]}</span>
                    <span className="day-pop__label">{i.label}</span>
                    <span className="day-pop__sub">{i.sub}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="day-pop__foot">
              <span>{selected ? 'Click to unselect' : 'Click to select'}</span>
              {selected && (
                <button type="button" className="btn btn--primary t-btn" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>
                  {'Add + '}
                </button>
              )}
            </div>
          </div>

          {selected && adding && (
            <div className="day-pop__card day-add" role="menu">
              <p className="day-add__title">What do you want to add?</p>
              <div className="day-add__grid">
                {ADD_OPTIONS.map((o) => (
                  <button type="button" role="menuitem" key={o.kind} className="day-add__opt" onClick={() => onAdd(o.kind)}>
                    <span className="legend-dot" style={{ background: KIND_COLOR[o.kind] }} />
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="day-add__actions">
                <button type="button" className="btn btn--outline t-btn" onClick={() => setAdding(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "Wed, Aug 12" */
function dayPopHeading(iso: string): string {
  const d = parseDate(iso);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return `${wd}, ${MONTHS_LONG[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
}

/* ---------------- Month / year picker ---------------- */

const PICK_YEARS = Array.from({ length: 9 }, (_, i) => parseDate(TODAY).getUTCFullYear() - 3 + i);

function MonthPicker({ view, onView }: { view: { year: number; month: number }; onView: (v: { year: number; month: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(view.year);
  const ref = useRef<HTMLDivElement>(null);
  const yearsRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);
  const today = parseDate(TODAY);

  useEffect(() => {
    // Scroll only the year list (not the page) so the picked year is in view.
    const list = yearsRef.current;
    const active = list?.querySelector<HTMLElement>('.is-active');
    if (open && list && active) list.scrollTop = Math.max(0, active.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2);
  }, [open]);

  return (
    <div className="month-pick" ref={ref}>
      <button
        type="button"
        className="month-pick__btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setYear(view.year);
          setOpen((o) => !o);
        }}
      >
        <h2 className="t-h2">
          {MONTHS_LONG[view.month]} , {view.year}
        </h2>
        <Icon name="chevron-down" size={20} className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <div className="month-pick__menu" role="dialog" aria-label="Pick month and year">
          <div className="month-pick__years" ref={yearsRef}>
            <p className="month-pick__label">YEAR</p>
            {PICK_YEARS.map((y) => (
              <button type="button" key={y} className={`month-pick__year ${y === year ? 'is-active' : ''}`} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
          <div className="month-pick__months">
            <p className="month-pick__label">MONTH · {year}</p>
            <div className="month-pick__grid">
              {MONTHS_LONG.map((m, i) => {
                const isView = year === view.year && i === view.month;
                const isNow = year === today.getUTCFullYear() && i === today.getUTCMonth();
                return (
                  <button
                    type="button"
                    key={m}
                    className={`month-pick__month ${isView ? 'is-active' : ''} ${isNow && !isView ? 'is-now' : ''}`}
                    onClick={() => {
                      onView({ year, month: i });
                      setOpen(false);
                    }}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
