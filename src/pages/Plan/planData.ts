import { daysFromToday, parseDate, TODAY } from '../../lib/dates';
import { goalCurrent } from '../../state/selectors';
import type { AppState, GoalType, MilestoneGoal } from '../../state/types';

export type CalKind = 'milestone' | 'goal' | 'event' | 'fund';

export const CAL_KINDS: { kind: CalKind; label: string; color: string }[] = [
  { kind: 'milestone', label: 'Milestones', color: '#fff200' },
  { kind: 'goal', label: 'Goals', color: '#54d1ff' },
  { kind: 'event', label: 'Events', color: '#fb8200' },
  { kind: 'fund', label: 'Funds', color: '#1e8e5a' },
];

export const KIND_COLOR: Record<CalKind, string> = Object.fromEntries(CAL_KINDS.map((k) => [k.kind, k.color])) as Record<CalKind, string>;

export interface CalItem {
  date: string;
  kind: CalKind;
  label: string;
  /** Second line in the day preview, e.g. "Deliverable • Event". */
  sub: string;
  refId: string;
}

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Aug 12–19" / "Aug 29–Sep 1" / "Sep 18" */
export function shortRange(start: string, end?: string): string {
  const a = parseDate(start);
  const head = `${MON3[a.getUTCMonth()]} ${a.getUTCDate()}`;
  if (!end || end === start) return head;
  const b = parseDate(end);
  return a.getUTCMonth() === b.getUTCMonth() ? `${head}–${b.getUTCDate()}` : `${head}–${MON3[b.getUTCMonth()]} ${b.getUTCDate()}`;
}

const ORDER: Record<CalKind, number> = { milestone: 0, goal: 1, event: 2, fund: 3 };

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** Everything that shows on the Plan calendar, driven by the live data. */
export function calendarItems(state: AppState): CalItem[] {
  const items: CalItem[] = [
    ...state.milestones.map((m) => ({ date: m.date, kind: 'milestone' as const, label: m.title, sub: `${m.type}  •  ${m.channel}`, refId: m.id })),
    ...state.goals
      .filter((g) => !g.completedAt)
      .map((g) => ({
        date: g.due,
        kind: 'goal' as const,
        label: g.title,
        sub: `${goalCurrent(state, g).toLocaleString('en-US')} / ${g.target.toLocaleString('en-US')}`,
        refId: g.id,
      })),
    ...state.events
      .filter((e) => e.saved)
      .map((e) => ({ date: e.start, kind: 'event' as const, label: e.name, sub: `${e.where}  •  ${shortRange(e.start, e.end)}`, refId: e.id })),
    // Every fund in "Upcoming Funds" shows on the calendar.
    ...state.funds
      .filter((f) => f.listed || f.saved)
      .map((f) => ({ date: f.deadline, kind: 'fund' as const, label: titleCase(f.name), sub: `${f.org}  •  ${dueLabel(f.deadline, 'Due')}`, refId: f.id })),
  ];
  return items.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind]);
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "WED, AUG 12" */
export function dayHeading(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Wednesday, Aug 12, 2026" */
export function longDate(iso: string): string {
  const d = parseDate(iso);
  const m = MONTHS_LONG[d.getUTCMonth()].slice(0, 3);
  return `${WEEKDAYS_LONG[d.getUTCDay()]}, ${m} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Aug 12, 2026" */
export function mediumDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS_LONG[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Aug 12 - 19, 2026" / "Aug 29 - Sep 1, 2026" / "Sep 18, 2026" */
export function dateRange(start: string, end?: string): string {
  if (!end) return mediumDate(start);
  const a = parseDate(start);
  const b = parseDate(end);
  const am = MONTHS_LONG[a.getUTCMonth()].slice(0, 3);
  const bm = MONTHS_LONG[b.getUTCMonth()].slice(0, 3);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${am} ${a.getUTCDate()} - ${b.getUTCDate()}, ${b.getUTCFullYear()}`
    : `${am} ${a.getUTCDate()} - ${bm} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
}

export type Urgency = 'soon' | 'near' | 'later' | 'past';

export function urgency(iso: string): Urgency {
  const d = daysFromToday(iso);
  if (d < 0) return 'past';
  if (d <= 7) return 'soon';
  if (d <= 14) return 'near';
  return 'later';
}

export function dueLabel(iso: string, verb: 'Due' | 'Starts'): string {
  const d = daysFromToday(iso);
  if (d < 0) return verb === 'Due' ? 'Closed' : 'Ended';
  if (d === 0) return `${verb} today`;
  return `${verb} in ${d} day${d === 1 ? '' : 's'}`;
}

/** 42 cells (6 weeks) starting on the Sunday before the 1st. */
export function monthCells(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return { iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month };
  });
}

export const METRIC_LABEL: Record<GoalType, string> = {
  'Steam wishlists': 'Steam Wishlist',
  'Discord members': 'Discord Members',
  'Patreon members': 'Patreon Members',
  'Press features': 'Press Features',
  'Short-form videos': 'Short-form Videos',
  'Newsletter subscribers': 'Newsletter Subs',
  Custom: 'Custom',
};

/** Current value for a milestone's goal metric: live account value, or the matching goal's manual progress. */
export function metricCurrent(state: AppState, g: MilestoneGoal): number {
  const goal = state.goals.find((x) => x.type === g.metric);
  return goalCurrent(state, goal ?? { id: 'tmp', title: '', type: g.metric, current: 0, target: g.target, due: TODAY });
}

export function nextMilestone(state: AppState) {
  return [...state.milestones].filter((m) => daysFromToday(m.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
}
