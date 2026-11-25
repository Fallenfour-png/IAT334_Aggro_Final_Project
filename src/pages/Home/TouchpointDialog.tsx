import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatAgo, formatNumber } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useStore } from '../../state/store';
import type { Touchpoint } from '../../state/types';
import { CloseButton, DateField, Dialog, FieldLabel, focusFirstInvalid, SelectField, TextField } from '../../components/ui/Dialog';

interface Metric {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
}

interface Detail {
  platform: string;
  duration?: string;
  handle: string;
  subtitle: string;
  caption: string;
  metrics: Metric[];
  contributes: { goalId: string; amount: number }[];
}

/** Rich content from the Figma "Touchpoint detail dialog" variants; other touchpoints get a generated summary. */
const DETAILS: Record<string, Detail> = {
  't-tiktok': {
    platform: 'TikTok',
    duration: '0:21',
    handle: 'via @hollow.signal',
    subtitle: 'A short-form hook tested on the demo loop — tracked via UTM to Steam & Discord.',
    caption: "When your save file corrupts at 3am and the game just keeps going... Hollow Signal's free demo drops at Steam Next Fest.\n\nWishlist on Steam: store.steampowered.com/app/hollowsignal?utm_source=tiktok\nJoin the Discord: discord.gg/hollowsignal\n\n#indiegame #gamedev #horrorgame #roguelite #steamnextfest #indiedev",
    metrics: [
      { label: 'Views', value: '48,214', note: '▲ +12% vs median', positive: true },
      { label: 'Engagement rate', value: '14.2%', note: '▲ +2.1pp vs median', positive: true },
      { label: 'Wishlists attributed', value: '+84', note: 'via UTM link' },
      { label: 'Discord joins', value: '+21', note: 'via tracked invite' },
    ],
    contributes: [
      { goalId: 'g-steam', amount: 84 },
      { goalId: 'g-discord', amount: 21 },
    ],
  },
  't-instagram': {
    platform: 'Instagram',
    duration: '0:15',
    handle: 'Promoted',
    subtitle: 'A 15-second paid teaser of the demo loop, boosted for 7 days and tracked via UTM to Steam.',
    caption: 'The demo drops at Steam Next Fest on Aug 12. Can you survive the signal?\nWishlist Hollow Signal on Steam: store.steampowered.com/app/hollowsignal?utm_source=instagram\n#indiegame #horrorgame #steamnextfest #indiedev',
    metrics: [
      { label: 'Reach', value: '41K', note: '▲ +43% vs median', positive: true },
      { label: 'Engagement rate', value: '15.2%', note: '▲ +1.6pp vs median', positive: true },
      { label: 'Wishlists attributed', value: '+67', note: 'via UTM link' },
      { label: 'Cost per wishlist', value: '$1.79', note: 'of $120 spend' },
    ],
    contributes: [{ goalId: 'g-steam', amount: 67 }],
  },
};

/** Analytics tiles for a touchpoint (used by the detail dialog and Plan's expanded rows). */
export function touchpointMetrics(t: Touchpoint): Metric[] {
  return t.analytics?.map((metric) => ({ label: metric.label, value: metric.value, note: metric.delta ?? '' }))
    ?? DETAILS[t.id]?.metrics
    ?? [{ label: 'Wishlists attributed', value: formatNumber(t.wishlists), note: 'From this touchpoint' }];
}

function touchpointCaption(t: Touchpoint): string {
  return t.caption ?? DETAILS[t.id]?.caption ?? '';
}

function validLink(link: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(link).protocol); }
  catch { return false; }
}

const TYPES = ['Short-form', 'Press', 'Storefront', 'Community', 'Devlog', 'Event'] as const;
const THUMB_FOR_KIND: Record<Touchpoint['kind'], Touchpoint['thumb']> = {
  'Short-form': 'video', Press: 'press', Storefront: 'storefront', Community: 'community', Devlog: 'megaphone', Event: 'megaphone',
};

export function TouchpointEditDialog({ touchpoint, onClose }: { touchpoint: Touchpoint; onClose: () => void }) {
  const { saveTouchpoint } = useStore();
  const [initial] = useState(() => ({
    title: touchpoint.title, kind: touchpoint.kind, platform: touchpoint.platform, date: touchpoint.date,
    caption: touchpointCaption(touchpoint), link: touchpoint.link ?? '',
  }));
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const { requestLeave, confirmation } = useUnsavedChanges(dirty);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const errors = {
    title: !draft.title.trim() ? 'Enter a touchpoint title.' : undefined,
    platform: !draft.platform.trim() ? 'Enter the platform or publication name.' : undefined,
    date: !draft.date ? 'Choose the date of this touchpoint.' : undefined,
    link: draft.link.trim() !== '' && !validLink(draft.link.trim()) ? 'Enter a full link starting with https:// or http://, or leave it empty.' : undefined,
  };
  const save = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) {
      focusFirstInvalid(event.currentTarget.closest('[role="dialog"]'));
      return;
    }
    saveTouchpoint({
      ...touchpoint,
      title: draft.title.trim(), kind: draft.kind, platform: draft.platform.trim(), date: draft.date,
      caption: draft.caption, link: draft.link.trim() || undefined,
      hoursAgo: draft.date === touchpoint.date ? touchpoint.hoursAgo : undefined,
      thumb: draft.kind === touchpoint.kind ? touchpoint.thumb : THUMB_FOR_KIND[draft.kind],
    });
    onClose();
  };

  return (
    <Dialog title="Edit Touchpoint" subtitle={`Edit your ${touchpoint.platform} touchpoint`} onClose={() => requestLeave(onClose)}>
      <div className="field">
        <FieldLabel required>Title</FieldLabel>
        <TextField label="Touchpoint title" value={draft.title} onChange={(value) => set('title', value)} error={tried ? errors.title : undefined} />
      </div>
      <div className="field-row">
        <div className="field">
          <FieldLabel>Type</FieldLabel>
          <SelectField label="Touchpoint type" value={draft.kind} options={TYPES} onChange={(value) => set('kind', value)} />
        </div>
        <div className="field">
          <FieldLabel required>Platform</FieldLabel>
          <TextField label="Platform or publication" value={draft.platform} onChange={(value) => set('platform', value)} error={tried ? errors.platform : undefined} />
        </div>
      </div>
      <div className="field">
        <FieldLabel required>Date</FieldLabel>
        <DateField label="Touchpoint date" value={draft.date} onChange={(value) => set('date', value)} error={tried ? errors.date : undefined} />
      </div>
      <div className="field">
        <FieldLabel>Post caption</FieldLabel>
        <label className="input tp-caption-input t-body">
          <textarea className="t-body" value={draft.caption} rows={4} onChange={(event) => set('caption', event.target.value)} aria-label="Post caption" />
        </label>
      </div>
      <div className="field">
        <FieldLabel>Link</FieldLabel>
        <TextField label="Touchpoint link" value={draft.link} onChange={(value) => set('link', value)} placeholder="https://" error={tried ? errors.link : undefined} />
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn--cancel t-btn" onClick={() => requestLeave(onClose)}>Cancel</button>
        <button type="button" className="btn btn--save t-btn" disabled={!dirty} onClick={save}>Save changes<Icon name={dirty ? 'check-14-white' : 'check-14-muted'} size={14} /></button>
      </div>
      {confirmation}
    </Dialog>
  );
}

export function MetricTile({ m }: { m: Metric }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="metric-tile" onClick={() => navigate('/analytics')}>
      <p className="t-body c-2 nowrap">{m.label}</p>
      <p className="t-card-number c-1 nowrap">{m.value}</p>
      <p className={`t-banner nowrap metric-tile__note ${m.positive ? 'c-positive' : 'c-2'}`}>{m.note}</p>
      <p className="t-btn c-accent nowrap metric-tile__hover">{'View in Analytics  →'}</p>
    </button>
  );
}

export function TouchpointDialog({ touchpoint, onClose }: { touchpoint: Touchpoint; onClose: () => void }) {
  const { state } = useStore();
  const [editing, setEditing] = useState(false);
  const t = state.touchpoints.find((item) => item.id === touchpoint.id) ?? touchpoint;
  const d = DETAILS[t.id]?.platform === t.platform ? DETAILS[t.id] : undefined;
  const duration = t.kind === 'Short-form' ? d?.duration : undefined;
  const goals = (t.contributes ?? DETAILS[t.id]?.contributes ?? [])
    .map((c) => ({ ...c, goal: state.goals.find((g) => g.id === c.goalId) }))
    .filter((c) => c.goal);
  const posted = formatAgo(t.date, t.hoursAgo);

  if (editing) return <TouchpointEditDialog key={t.id} touchpoint={t} onClose={() => setEditing(false)} />;

  return (
    <Dialog onClose={onClose} width={840} className="tp-dialog">
      <div className="tp-dialog__header">
        {t.thumb === 'video' || duration ? (
          <div className="tp-dialog__thumb">
            {duration && <span className="tp-dialog__duration t-sub2">{duration}</span>}
          </div>
        ) : null}
        <div className="tp-dialog__intro">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="tag-row">
              <span className="tag tp-dialog__tag t-banner pre">{`${t.kind}  •  ${t.platform}`}</span>
              <span className="t-body-2 c-2 pre">{`Posted ${posted === 'Yesterday' ? 'yesterday' : posted}${d?.handle ? `  •  ${d.handle}` : ''}`}</span>
            </div>
            <p className="t-h2 c-1">{t.title}</p>
            <p className="t-body-2 c-1">{d?.subtitle ?? t.stats}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="t-h4 c-1">Post caption</p>
            <p className="t-body c-1 tp-caption">{touchpointCaption(t) || 'No caption added.'}</p>
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="t-h4 c-1">Analytics</p>
        <div className="metric-grid">
          {touchpointMetrics(t).map((m) => (
            <MetricTile key={m.label + m.value} m={m} />
          ))}
        </div>
      </div>

      {goals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="t-h4 c-1">Contributes to goals</p>
          <div className="tag-row">
            {goals.map((c) => (
              <span key={c.goalId} className="goal-chip t-banner pre">{`${c.goal!.title.replace(/ by launch$/, '')}  ·  +${c.amount}`}</span>
            ))}
          </div>
        </div>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--outline btn--edit-tp t-btn" onClick={() => setEditing(true)}>
          Edit touchpoint
          <Icon name="edit-14" size={14} tint />
        </button>
        {t.link && validLink(t.link) && <a className="btn btn--primary t-btn" style={{ borderRadius: 8, gap: 8, padding: '7px 11px' }} href={t.link} target="_blank" rel="noopener noreferrer">
          {`Open in ${t.platform}`}
          <Icon name="external-14-white" size={14} tint />
        </a>}
      </div>
    </Dialog>
  );
}
