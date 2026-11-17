import { addDays, TODAY } from '../lib/dates';
import type { AppState, ConnectionId, Funnel, Milestone, Touchpoint } from './types';

/**
 * Test data for a game that finished onboarding: numbers for every connected platform,
 * a few touchpoints per platform, the conversion funnel and starter milestones.
 * Only empty things are filled, so running it again (e.g. after connecting another app) is safe.
 */

/** Stable random numbers per game, so the same game always gets the same data. */
function rng(seedText: string) {
  let s = 2166136261;
  for (const ch of seedText) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0;
  return {
    next: () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 2 ** 32;
    },
    int(min: number, max: number) {
      return Math.round(min + this.next() * (max - min));
    },
    pick<T>(list: readonly T[]): T {
      return list[Math.floor(this.next() * list.length)]!;
    },
  };
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

/** Starting size of each Home KPI (by card id) for a new indie game. */
const KPI_RANGES: Partial<Record<string, [number, number]>> = {
  steam: [900, 3200],
  discord: [140, 760],
  youtube: [180, 1400],
  'youtube-views': [4000, 26000],
  tiktok: [1200, 9500],
  'tiktok-views': [20000, 180000],
  'ig-followers': [300, 2400],
  'ig-views': [6000, 60000],
  patreon: [12, 60],
  newsletter: [60, 320],
};

const UPDATED = ['30m', '1h', '2h', '4h', '6h'];

type Template = (game: string, r: ReturnType<typeof rng>) => Omit<Touchpoint, 'id' | 'date' | 'hoursAgo'>;

/** One or two believable posts per connected platform. */
const TOUCHPOINTS: Partial<Record<ConnectionId, Template[]>> = {
  tiktok: [
    (game, r) => {
      const views = r.int(8000, 42000);
      const wl = Math.round(views * r.int(12, 22) / 10000);
      return { kind: 'Short-form', platform: 'TikTok', title: `“${game} in 15 seconds”`, stats: `${fmt(views)} views  •  ${fmt(Math.round(views * 0.07))} likes  •  +${wl} wishlists attributed`, thumb: 'video', wishlists: wl };
    },
    (_game, r) => {
      const views = r.int(3000, 18000);
      const wl = Math.round(views * r.int(8, 16) / 10000);
      return { kind: 'Short-form', platform: 'TikTok', title: '“POV: your first boss fight”', stats: `${fmt(views)} views  •  ${fmt(Math.round(views * 0.06))} likes  •  +${wl} wishlists attributed`, thumb: 'video', wishlists: wl };
    },
  ],
  youtube: [
    (game, r) => {
      const views = r.int(1200, 9000);
      const wl = Math.round(views * r.int(30, 60) / 10000);
      return { kind: 'Devlog', platform: 'YouTube', title: `Devlog #1: building ${game}`, stats: `${fmt(views)} views  •  ${fmt(Math.round(views * 0.05))} likes  •  +${wl} wishlists attributed`, thumb: 'megaphone', wishlists: wl };
    },
  ],
  steam: [
    (_game, r) => {
      const rate = (r.int(90, 160) / 10).toFixed(1);
      return { kind: 'Storefront', platform: 'Steam', title: 'Store page live with first trailer', stats: `Visits  →  Wishlist rate ${rate}%`, thumb: 'storefront', wishlists: r.int(40, 160) };
    },
  ],
  discord: [
    (_game, r) => {
      const joined = r.int(18, 70);
      return { kind: 'Community', platform: 'Discord', title: 'Playtest sign-ups opened in #announcements', stats: `${r.int(60, 260)} reactions  •  +${joined} members joined`, thumb: 'community', wishlists: 0 };
    },
  ],
  itch: [
    (game, r) => {
      const views = r.int(400, 2600);
      return { kind: 'Storefront', platform: 'itch.io', title: `${game} jam build uploaded`, stats: `${fmt(views)} page views  •  ${fmt(Math.round(views * 0.18))} downloads`, thumb: 'storefront', wishlists: 0 };
    },
  ],
};

function starterMilestones(s: AppState, r: ReturnType<typeof rng>): Milestone[] {
  const on = (id: ConnectionId) => s.connections.some((c) => c.id === id && c.connected);
  const steam = s.kpis.find((k) => k.source === 'steam')?.value ?? 0;
  const discord = s.kpis.find((k) => k.source === 'discord')?.value ?? 0;
  const goals = [
    ...(on('steam') ? [{ metric: 'Steam wishlists' as const, target: Math.ceil((steam * 1.6 + 500) / 500) * 500 }] : []),
    ...(on('discord') ? [{ metric: 'Discord members' as const, target: Math.ceil((discord * 1.8 + 100) / 100) * 100 }] : []),
  ];
  const list: Milestone[] = [
    { id: 'gen-m1', title: 'Demo build ready for playtesters', type: 'Deliverable', channel: on('discord') ? 'Discord' : 'Online', date: addDays(TODAY, r.int(9, 16)), goals: [] },
    ...(on('youtube') || on('tiktok')
      ? [{ id: 'gen-m2', title: 'Gameplay trailer drop', type: 'Content' as const, channel: [on('youtube') && 'YouTube', on('tiktok') && 'TikTok'].filter(Boolean).join(' + '), date: addDays(TODAY, r.int(20, 30)), goals: [] }]
      : []),
    { id: 'gen-m3', title: 'Press kit sent to 20 outlets', type: 'Press', channel: 'Email', date: addDays(TODAY, r.int(32, 45)), goals: [] },
    { id: 'gen-m4', title: on('steam') ? 'Steam Next Fest demo' : 'Public demo release', type: 'Event', channel: on('steam') ? 'Steam' : 'Online', date: addDays(TODAY, r.int(55, 75)), goals },
  ];
  return list;
}

export function withTestData(s: AppState): AppState {
  if (!s.project) return s;
  const r = rng(s.project.name);
  const connected = new Set(s.connections.filter((c) => c.connected).map((c) => c.id));

  // 1. Home KPIs (and Analytics, which reads the same numbers) for every connected platform still at zero.
  let kpis = s.kpis.map((k) => {
    const range = KPI_RANGES[k.id];
    if (!range || !connected.has(k.source as ConnectionId) || k.value > 0) return k;
    const value = r.int(range[0], range[1]);
    // Views move much faster than follower counts.
    const weekly = k.compact ? r.int(20, 45) : r.int(5, 13);
    return { ...k, value, delta7: Math.max(1, Math.round((value * weekly) / 100)), updated: r.pick(UPDATED), note: undefined };
  });

  // 2. Touchpoints for connected platforms that don't have any yet.
  const added: Touchpoint[] = [];
  for (const id of connected) {
    const templates = TOUCHPOINTS[id];
    if (!templates) continue;
    const platform = templates[0]!(s.project.name, rng('probe')).platform;
    if (s.touchpoints.some((t) => t.platform === platform)) continue;
    templates.forEach((make, i) => {
      const daysAgo = r.int(i * 3, i * 3 + 5);
      added.push({ ...make(s.project!.name, r), id: `gen-${id}-${i}`, date: addDays(TODAY, -daysAgo), hoursAgo: daysAgo === 0 ? r.int(1, 9) : undefined });
    });
  }
  const touchpoints = [...added, ...s.touchpoints];
  const recent = touchpoints.filter((t) => t.date >= addDays(TODAY, -7)).length;
  kpis = kpis.map((k) => (k.source === 'touchpoints' && touchpoints.length ? { ...k, value: touchpoints.length, delta7: recent, updated: '10m', note: undefined } : k));

  // 3. Conversion Points: a weekly funnel sized from the wishlists and touchpoints above.
  let funnel = s.funnel;
  if (!funnel && touchpoints.length) {
    const wl = kpis.find((k) => k.source === 'steam' && connected.has('steam'))?.delta7 ?? r.int(40, 160);
    const wishlists = Math.max(wl * r.int(5, 8), 60);
    const clicks = Math.round(wishlists / (r.int(11, 16) / 100));
    const impressions = Math.round(clicks / (r.int(9, 13) / 100));
    funnel = { impressions, clicks, wishlists, merch: Math.round(wishlists * r.int(1, 3) / 100) } satisfies Funnel;
  }

  // 4. A game made in "Add a game" swaps its "Setup" tag and placeholder line for real ones.
  const names: Partial<Record<ConnectionId, string>> = { tiktok: 'TikTok', youtube: 'YouTube', discord: 'Discord', steam: 'Steam', itch: 'itch.io', patreon: 'Patreon' };
  const channels = [...connected].map((id) => names[id]).filter(Boolean) as string[];
  const project =
    s.project.tags.includes('Setup') && channels.length
      ? {
          ...s.project,
          tags: ['Active Push'],
          tagline: `Marketing campaign  ·  ${channels.length > 1 ? `${channels.slice(0, -1).join(', ')} & ${channels[channels.length - 1]}` : channels[0]}`,
        }
      : s.project;

  // 5. Starter milestones, only when the user hasn't planned any upcoming ones.
  const next = { ...s, project, kpis, touchpoints, funnel };
  const milestones = s.milestones.some((m) => m.date >= TODAY) ? s.milestones : [...s.milestones, ...starterMilestones(next, r)];

  return { ...next, milestones };
}
