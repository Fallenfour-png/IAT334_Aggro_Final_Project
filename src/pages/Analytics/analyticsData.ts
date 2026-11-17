import { addDays, parseDate, TODAY } from '../../lib/dates';
import { funnelOf } from '../../state/selectors';
import type { AppState, Touchpoint } from '../../state/types';

/** Series colours from the Figma graph / filter menu. */
export const SERIES = {
  touchpoints: '#464646',
  wishlists: '#567ee3',
  members: '#bc86d5',
  traffic: '#e2e5ea',
} as const;

export type Timeframe = 'Last 7 Days' | 'Last 28 Days' | 'Last 60 Days' | 'Last 365 Days' | 'Custom';
export const TIMEFRAMES: Timeframe[] = ['Last 7 Days', 'Last 28 Days', 'Last 60 Days', 'Last 365 Days', 'Custom'];

/** Filter menu items. TikTok / YouTube / Events / Press are touchpoint sources (dark squares). */
export const FILTERS = [
  { id: 'wishlists', label: 'Steam Wishlists', color: SERIES.wishlists },
  { id: 'members', label: 'Discord Members', color: SERIES.members },
  { id: 'tiktok', label: 'Tiktok', color: SERIES.touchpoints },
  { id: 'youtube', label: 'YouTube', color: SERIES.touchpoints },
  { id: 'events', label: 'Events', color: SERIES.touchpoints },
  { id: 'press', label: 'Press', color: SERIES.touchpoints },
] as const;
export type FilterId = (typeof FILTERS)[number]['id'];

/** Columns never go above 16 squares (Figma's axis height). */
export const MAX_SQUARES = 16;
/** Traffic is ~50x larger than wishlists, so one traffic square counts 50x the unit. */
export const TRAFFIC_SCALE = 50;

export interface Bucket {
  start: string;
  label: string;
  sub: string;
  tp: number;
  /** The touchpoints posted in this slot (the dark square's hover card). */
  tps: Touchpoint[];
  wl: number;
  dm: number;
  tt: number;
}

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function dateLabel(iso: string, withYear = true): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${withYear ? `, ${d.getUTCFullYear()}` : ''}`;
}

const HOURS = ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM', '12AM'];

function connected(state: AppState, id: string): boolean {
  return state.connections.some((c) => c.id === id && c.connected);
}

function kpiDelta(state: AppState, id: string, days: number): number {
  const k = state.kpis.find((x) => x.id === id);
  return k && connected(state, id) ? Math.round((k.delta7 * days) / 7) : 0;
}

/**
 * Totals for a timeframe, from the same live data the Home dashboard uses:
 * KPI deltas for wishlists / members, the Home conversion funnel for traffic,
 * and the real touchpoints for touchpoint counts.
 */
export function totals(state: AppState, days: number) {
  const live = state.connections.some((c) => c.connected) && state.touchpoints.length > 0;
  const m = days / 7;
  const since = addDays(TODAY, -days);
  const kpi = (id: string) => (connected(state, id) ? state.kpis.find((k) => k.id === id)?.value ?? 0 : 0);
  return {
    tp: state.touchpoints.filter((t) => t.date >= since).length,
    wl: kpiDelta(state, 'steam', days),
    wlTotal: kpi('steam'),
    dm: kpiDelta(state, 'discord', days),
    dmTotal: kpi('discord'),
    impressions: live ? Math.round(funnelOf(state).impressions * m) : 0,
    clicks: live ? Math.round(funnelOf(state).clicks * m) : 0,
  };
}

/** Splits `total` across buckets by weight, keeping the exact sum. */
function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) out[order[k][1]]++;
  return out;
}

/** 7 days = 4-hour buckets; longer ranges = 1 bucket per day. */
export function buckets(state: AppState, days: number): Bucket[] {
  const r = rand(days * 7919);
  const t = totals(state, days);
  const start = addDays(TODAY, -days);
  const hourly = days <= 7;
  const tpDays = new Set(state.touchpoints.map((p) => p.date));
  const slots: { start: string; sub: string; w: number; h: number }[] = [];
  for (let d = 0; d <= days; d++) {
    const iso = addDays(start, d);
    const boost = tpDays.has(iso) ? 1.7 : 1;
    if (hourly) {
      for (let h = 0; h < 6; h++) {
        const wave = 0.45 + 0.55 * Math.sin(((h + 0.5) / 6) * Math.PI);
        slots.push({ start: iso, sub: `${HOURS[h]} - ${HOURS[h + 1]}`, w: wave * boost * (0.6 + r() * 0.8), h });
      }
    } else {
      slots.push({ start: iso, sub: 'All day', w: boost * (0.6 + r() * 0.8), h: -1 });
    }
  }
  const w = slots.map((s) => s.w);
  const wl = distribute(t.wl, w);
  const dm = distribute(t.dm, w.map((x, i) => x * (0.5 + ((i * 7) % 5) / 5)));
  const tt = distribute(t.clicks, w.map((x, i) => x * (0.7 + ((i * 3) % 4) / 6)));
  return slots.map((s, i) => {
    const tps = state.touchpoints.filter((p) => {
      if (p.date !== s.start) return false;
      if (!hourly) return true;
      const hour = p.hoursAgo !== undefined ? Math.max(0, 20 - p.hoursAgo) : 13;
      return Math.floor(hour / 4) === s.h;
    });
    return { start: s.start, label: dateLabel(s.start), sub: s.sub, tp: tps.length, tps, wl: wl[i], dm: dm[i], tt: tt[i] };
  });
}

/** Value of one square for wishlists / members (traffic squares count TRAFFIC_SCALE times this). */
export function squareUnit(data: Bucket[]): number {
  const peak = Math.max(1, ...data.map((b) => b.wl + b.dm + b.tt / TRAFFIC_SCALE + (b.tp ? 1 : 0)));
  const raw = peak / (MAX_SQUARES - 1);
  const nice = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 250, 500, 1000];
  return nice.find((n) => n >= raw) ?? Math.ceil(raw);
}

export interface MetricCardData {
  label: string;
  color: string;
  value: string;
  rate: string;
  positive?: boolean;
  change: string;
  lu: string;
  series?: keyof typeof SERIES;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Key metrics row: the same numbers as the Home dashboard. */
export function keyMetrics(state: AppState, days: number): MetricCardData[] {
  const t = totals(state, days);
  const w = totals(state, 7);
  const lu = (id: string) => state.kpis.find((k) => k.id === id)?.updated ?? '1h';
  return [
    { label: 'New Touchpoints', color: SERIES.touchpoints, value: fmt(t.tp), rate: t.tp ? '+100%' : '0%', positive: t.tp > 0, change: `+${w.tp} this week`, lu: '10m', series: 'touchpoints' },
    { label: 'New Wishlists', color: SERIES.wishlists, value: fmt(t.wl), rate: '+89.1%', positive: t.wl > 0, change: `+${fmt(w.wl)} this week`, lu: lu('steam'), series: 'wishlists' },
    { label: 'Avg. Wishlists/day', color: SERIES.wishlists, value: fmt(t.wl / days), rate: '+32.5%', positive: t.wl > 0, change: `+${fmt(w.wl / 7)} this week`, lu: lu('steam'), series: 'wishlists' },
    { label: 'New Members', color: SERIES.members, value: fmt(t.dm), rate: '+27.6%', positive: t.dm > 0, change: `+${fmt(w.dm)} this week`, lu: lu('discord'), series: 'members' },
    { label: 'New Traffic', color: SERIES.traffic, value: fmt(t.clicks), rate: '+57.6%', positive: t.clicks > 0, change: `+${fmt(w.clicks)} this week`, lu: '1h', series: 'traffic' },
  ];
}

export interface Section {
  id: string;
  title: string;
  total: string;
  color: string;
  series: keyof typeof SERIES;
  cards: MetricCardData[];
}

/** Where each section's new numbers came from (shares sum to 100%). */
const SOURCES: Record<string, [string, number][]> = {
  sw: [['YouTube', 0.3], ['TikTok', 0.25], ['Discord', 0.15], ['Events', 0.12], ['Press', 0.1], ['Other', 0.08]],
  st: [['YouTube', 0.35], ['Discord', 0.3], ['TikTok', 0.2], ['Events', 0.07], ['Press', 0.05], ['Other', 0.03]],
  dm: [['Steam', 0.32], ['TikTok', 0.24], ['YouTube', 0.18], ['Events', 0.12], ['Press', 0.08], ['Other', 0.06]],
  dt: [['YouTube', 0.31], ['Steam', 0.25], ['TikTok', 0.2], ['Events', 0.12], ['Press', 0.07], ['Other', 0.05]],
};

/** Collapsible metric sections (Figma SW / ST / DM / DT), from the same live numbers. */
export function sections(state: AppState, days: number): Section[] {
  const t = totals(state, days);
  const w = totals(state, 7);
  const mk = (
    id: string,
    title: string,
    color: string,
    series: Section['series'],
    total: [string, number, number],
    fresh: [string, number, number],
    perDay: string,
    arrow: string,
  ): Section => ({
    id,
    title,
    color,
    series,
    total: `+${fmt(fresh[1])}`,
    cards: [
      { label: total[0], color, value: fmt(total[1]), rate: '+28.1%', positive: total[1] > 0, change: `+${fmt(total[2])} this week`, lu: '10m' },
      { label: fresh[0], color, value: fmt(fresh[1]), rate: '+57.1%', positive: fresh[1] > 0, change: `+${fmt(fresh[2])} this week`, lu: '4h' },
      { label: perDay, color, value: fmt(fresh[1] / days), rate: '+6.8%', positive: fresh[1] > 0, change: `+${fmt(fresh[2] / 7)} this week`, lu: '1h' },
      ...SOURCES[id].map(([src, share]) => ({
        label: `${src} → ${arrow}`,
        color,
        value: fmt(fresh[1] * share),
        rate: `${(share * 100).toFixed(1)}%`,
        change: `+${fmt(fresh[2] * share)} this week`,
        lu: '30m',
      })),
    ],
  });
  return [
    mk('sw', 'Steam Wishlists', SERIES.wishlists, 'wishlists', ['Total Wishlists', t.wlTotal, w.wl], ['New Wishlists', t.wl, w.wl], 'Avg. Wishlists/day', 'Wishlist'),
    mk('st', 'Steam Traffic', SERIES.traffic, 'traffic', ['Total Traffic', t.impressions, w.impressions], ['New Traffic → Steam', t.clicks, w.clicks], 'Avg. Traffic/day', 'Steam'),
    mk('dm', 'Discord Members', SERIES.members, 'members', ['Total Discord Members', t.dmTotal, w.dm], ['New Discord Members', t.dm, w.dm], 'Avg. Members/day', 'Member'),
    mk(
      'dt',
      'Discord Traffic',
      SERIES.traffic,
      'traffic',
      ['Total Traffic', t.impressions, w.impressions],
      ['New Traffic → Discord', Math.round(t.clicks * 0.16), Math.round(w.clicks * 0.16)],
      'Avg. Traffic/day',
      'Discord',
    ),
  ];
}
