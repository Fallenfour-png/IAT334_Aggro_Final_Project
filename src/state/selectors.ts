import { daysFromToday, formatNumber, formatShort, TODAY } from '../lib/dates';
import { demoAccount } from './seeds';
import { AUTO_GOAL_SOURCE, type Account, type AppState, type Funnel, type DueWindow, type Goal, type GoalStatus, type GoalType, type Kpi, type Range } from './types';

export const GOAL_UNIT: Partial<Record<GoalType, string>> = {
  'Press features': 'secured',
  'Short-form videos': 'posted',
};

export function isAutoGoal(type: GoalType): boolean {
  return type in AUTO_GOAL_SOURCE;
}

/** Auto goals read their progress from the connected account's KPI. */
export function goalCurrent(state: AppState, goal: Goal): number {
  const source = AUTO_GOAL_SOURCE[goal.type];
  if (!source) return goal.current;
  const conn = state.connections.find((c) => c.id === source);
  const kpi = state.kpis.find((k) => k.source === source);
  return conn?.connected && kpi ? kpi.value : goal.current;
}

export function goalPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function goalStatus(state: AppState, goal: Goal): GoalStatus {
  const current = goalCurrent(state, goal);
  const pct = goalPercent(current, goal.target);
  if (pct >= 100) return 'Completed';
  if (current <= 0) return 'Not started';
  const daysLeft = daysFromToday(goal.due);
  if (pct < 40 && daysLeft <= 30) return 'Behind';
  return 'On track';
}

export function goalMeta(state: AppState, goal: Goal): string {
  const current = goalCurrent(state, goal);
  const unit = GOAL_UNIT[goal.type];
  const progress = `${formatNumber(current)} / ${formatNumber(goal.target)}${unit ? ` ${unit}` : ''}`;
  if (goalStatus(state, goal) === 'Completed') {
    return `${progress}  •  Completed ${formatShort(goal.completedAt ?? TODAY)}`;
  }
  return `${progress}  •  Due ${formatShort(goal.due)}`;
}

/** Sort key for "Due date": completed goals sort by the day they were completed. */
export function goalSortDate(state: AppState, goal: Goal): string {
  return goalStatus(state, goal) === 'Completed' ? goal.completedAt ?? goal.due : goal.due;
}

export const RANGE_DAYS: Record<Range, number> = {
  'Last 7 days': 7,
  'Last 2 weeks': 14,
  'Last 30 days': 30,
  'Since campaign start': 37,
};

export const RANGE_LABEL: Record<Range, string> = {
  'Last 7 days': 'last 7 days',
  'Last 2 weeks': 'last 2 weeks',
  'Last 30 days': 'last 30 days',
  'Since campaign start': 'since start',
};

export const RANGE_COMPARE: Record<Range, string> = {
  'Last 7 days': 'compared with the 7 days before',
  'Last 2 weeks': 'compared with the 2 weeks before',
  'Last 30 days': 'compared with the 30 days before',
  'Since campaign start': 'since Jul 1',
};

export const DUE_DAYS: Record<DueWindow, number> = {
  'Next week': 7,
  'Next 2 weeks': 14,
  'Next month': 31,
  'Next 3 months': 92,
  'All time': Number.POSITIVE_INFINITY,
};

export function kpiDelta(kpi: Kpi, range: Range): number {
  return Math.round((kpi.delta7 * RANGE_DAYS[range]) / 7);
}

export function isConnected(state: AppState, kpi: Kpi): boolean {
  if (kpi.source === 'touchpoints') return state.touchpoints.length > 0;
  if (kpi.source === 'press') return state.touchpoints.some((t) => t.kind === 'Press');
  return state.connections.some((c) => c.id === kpi.source && c.connected);
}

/** Account details, falling back to the demo account for data saved before Settings existed. */
export function accountOf(state: AppState): Account {
  return state.account ?? demoAccount();
}

/** "MC" from "Maya Character". */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

/** Weekly funnel: generated per game, or the Figma Hollow Signal figures. */
export function funnelOf(state: AppState): Funnel {
  return state.funnel ?? { impressions: 412000, clicks: 48900, wishlists: 6210, merch: 125 };
}
