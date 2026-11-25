// Fixed demo reference date; sample deadlines span late November onward.
export const TODAY = '2026-11-25';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  return Math.round((parseDate(toIsoDate).getTime() - parseDate(fromIso).getTime()) / 86_400_000);
}

export function daysFromToday(iso: string): number {
  return daysBetween(TODAY, iso);
}

/** "Aug 12" */
export function formatShort(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "AUG" */
export function monthTag(iso: string): string {
  return MONTHS[parseDate(iso).getUTCMonth()].toUpperCase();
}

export function dayOfMonth(iso: string): number {
  return parseDate(iso).getUTCDate();
}

/** "2026/08/12" — the format used in the Figma date fields */
export function formatField(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '/');
}

/** "2h ago", "Yesterday", "2d ago", "1w ago" relative to TODAY */
export function formatAgo(iso: string, hoursAgo?: number): string {
  if (hoursAgo !== undefined && hoursAgo < 24) return `${hoursAgo}h ago`;
  const days = -daysFromToday(iso);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
