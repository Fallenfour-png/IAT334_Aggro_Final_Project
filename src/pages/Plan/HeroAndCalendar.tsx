import { useMemo, useState } from 'react';
import { daysFromToday, formatNumber, parseDate, TODAY } from '../../lib/dates';
import { Icon } from '../../lib/icons';
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
}: {
  selected: string[];
  onSelect: (days: string[]) => void;
  view: { year: number; month: number };
  onView: (v: { year: number; month: number }) => void;
  onOpenItem: (item: CalItem) => void;
}) {
  const { state } = useStore();
  const [hidden, setHidden] = useState<CalKind[]>([]);

  const items = useMemo(() => calendarItems(state).filter((i) => !hidden.includes(i.kind)), [state, hidden]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const i of items) map.set(i.date, [...(map.get(i.date) ?? []), i]);
    return map;
  }, [items]);

  const cells = monthCells(view.year, view.month);
  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`;
  const daysWithItems = [...byDay.keys()].filter((d) => d.startsWith(monthPrefix)).sort();
  /** Figma: picking days filters the list to only those days (any month), in date order. */
  const listDays = selected.length ? [...selected].sort() : daysWithItems;

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    onView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  const toggle = (iso: string) => onSelect(selected.includes(iso) ? selected.filter((d) => d !== iso) : [...selected, iso]);

  const pick = (iso: string, inMonth: boolean) => {
    // Figma: a greyed day from another month only switches the month.
    if (!inMonth) {
      const d = parseDate(iso);
      onView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
      return;
    }
    toggle(iso);
  };

  return (
    <section className="card cal-card" id="plan-calendar">
      <div className="cal-main">
        <div className="cal-head">
          <h2 className="t-h2" style={{ color: '#000' }}>
            {MONTHS_LONG[view.month]}, {view.year}
          </h2>
          <div className="cal-nav">
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
        <div className="cal-grid">
          {cells.map(({ iso, inMonth }) => {
            const dayItems = inMonth ? byDay.get(iso) ?? [] : [];
            const kinds = [...new Set(dayItems.map((i) => i.kind))];
            const cls = [
              'cal-day',
              inMonth ? '' : 'is-other',
              dayItems.length ? 'has-items' : '',
              selected.includes(iso) ? 'is-selected' : '',
              iso === TODAY ? 'is-today' : '',
            ].join(' ');
            return (
              <button type="button" key={iso} className={cls} onClick={() => pick(iso, inMonth)} aria-pressed={selected.includes(iso)}>
                <span className="t-body cal-day__num">{parseDate(iso).getUTCDate()}</span>
                {kinds.length > 0 && (
                  <span className="cal-dots">
                    {kinds.map((k) => (
                      <span key={k} className="cal-dot" style={{ background: KIND_COLOR[k] }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cal-side">
        <div className="legend">
          {CAL_KINDS.map((k) => {
            const off = hidden.includes(k.kind);
            return (
              <button
                type="button"
                key={k.kind}
                className={`legend-tag t-body ${off ? 'is-off' : ''}`}
                aria-pressed={!off}
                title={off ? `Show ${k.label.toLowerCase()}` : `Hide ${k.label.toLowerCase()}`}
                onClick={() => setHidden((h) => (off ? h.filter((x) => x !== k.kind) : [...h, k.kind]))}
              >
                <span className="legend-dot" style={{ background: k.color }} />
                {k.label}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="sel-status">
            <p className="t-body c-accent">
              {selected.length} {selected.length === 1 ? 'day' : 'days'} selected
            </p>
            <button type="button" className="t-body-bold c-accent clear-selection pre" onClick={() => onSelect([])}>
              {'✕  Clear'}
            </button>
          </div>
        )}

        {listDays.length === 0 ? (
          <div className="empty-state cal-empty">
            <div className="empty-state__icon">
              <Icon name="empty-calendar-24" size={24} />
            </div>
            <p className="t-h4 c-1">Nothing scheduled this month</p>
            <p className="t-body-2 c-2">
              Milestones, goals, saved events and fund
              <br />
              deadlines will show up on the calendar.
            </p>
          </div>
        ) : (
          <div className="cal-list">
            {listDays.map((d) => {
              const dayItems = byDay.get(d) ?? [];
              return (
                <div
                  key={d}
                  id={`day-card-${d}`}
                  role="button"
                  tabIndex={0}
                  className={`day-card ${selected.includes(d) ? 'is-selected' : ''}`}
                  onClick={() => toggle(d)}
                >
                  <p className="t-body-bold">{dayHeading(d)}</p>
                  <div className="day-card__items">
                    {dayItems.map((i) => (
                      <button
                        type="button"
                        key={i.kind + i.refId}
                        className="day-card__item t-body"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenItem(i);
                        }}
                      >
                        <span className="legend-dot" style={{ background: KIND_COLOR[i.kind] }} />
                        {i.label}
                      </button>
                    ))}
                    {dayItems.length === 0 && <p className="t-body day-card__none">No events on this day</p>}
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
