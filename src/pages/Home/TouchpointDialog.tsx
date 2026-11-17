import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatAgo } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { demoState } from '../../state/seeds';
import { useStore } from '../../state/store';
import type { Touchpoint } from '../../state/types';
import { CloseButton, Dialog } from '../../components/ui/Dialog';

interface Metric {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
}

interface Detail {
  duration?: string;
  handle: string;
  subtitle: string;
  caption: ReactNode;
  metrics: Metric[];
  contributes: { goalId: string; amount: number }[];
  openLabel: string;
}

const Link = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--info)' }}>{children}</span>;

/** Rich content from the Figma "Touchpoint detail dialog" variants; other touchpoints get a generated summary. */
const DETAILS: Record<string, Detail> = {
  't-tiktok': {
    duration: '0:21',
    handle: 'via @hollow.signal',
    subtitle: 'A short-form hook tested on the demo loop — tracked via UTM to Steam & Discord.',
    caption: (
      <>
        When your save file corrupts at 3am and the game just keeps going... Hollow Signal's free demo drops at Steam Next Fest.
        <br />
        <br />
        Wishlist on Steam: <Link>store.steampowered.com/app/hollowsignal?utm_source=tiktok</Link>
        <br />
        Join the Discord: <Link>discord.gg/hollowsignal</Link>
        <br />
        <br />
        <span className="c-2">#indiegame #gamedev #horrorgame #roguelite #steamnextfest #indiedev</span>
      </>
    ),
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
    openLabel: 'Open in TikTok Studio',
  },
  't-instagram': {
    duration: '0:15',
    handle: 'Promoted',
    subtitle: 'A 15-second paid teaser of the demo loop, boosted for 7 days and tracked via UTM to Steam.',
    caption: (
      <>
        The demo drops at Steam Next Fest on Aug 12. Can you survive the signal?
        <br />
        Wishlist Hollow Signal on Steam: <Link>store.steampowered.com/app/hollowsignal?utm_source=instagram</Link>
        <br />
        <span className="c-2">#indiegame #horrorgame #steamnextfest #indiedev</span>
      </>
    ),
    metrics: [
      { label: 'Reach', value: '41K', note: '▲ +43% vs median', positive: true },
      { label: 'Engagement rate', value: '15.2%', note: '▲ +1.6pp vs median', positive: true },
      { label: 'Wishlists attributed', value: '+67', note: 'via UTM link' },
      { label: 'Cost per wishlist', value: '$1.79', note: 'of $120 spend' },
    ],
    contributes: [{ goalId: 'g-steam', amount: 67 }],
    openLabel: 'Open in Instagram',
  },
};

/**
 * Only the TikTok and Instagram touchpoints have a Figma detail design. Every other
 * touchpoint links to one of those two overlays instead of a generated one:
 * press and storefront updates → the Instagram promo, everything else → the TikTok short.
 */
function designedId(t: Touchpoint): string {
  if (DETAILS[t.id]) return t.id;
  return t.kind === 'Press' || t.kind === 'Storefront' ? 't-instagram' : 't-tiktok';
}

/** The touchpoint whose designed overlay opens for `t` (falls back to the demo copy if it was deleted). */
function designedTouchpoint(t: Touchpoint, all: Touchpoint[]): Touchpoint {
  const id = designedId(t);
  if (id === t.id) return t;
  return all.find((x) => x.id === id) ?? demoState().touchpoints.find((x) => x.id === id)!;
}

/** Analytics tiles for a touchpoint (used by the detail dialog and Plan's expanded rows). */
export function touchpointMetrics(t: Touchpoint): Metric[] {
  return DETAILS[designedId(t)].metrics;
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

export function TouchpointDialog({ touchpoint, onClose, onEdit }: { touchpoint: Touchpoint; onClose: () => void; onEdit: () => void }) {
  const { state } = useStore();
  const t = designedTouchpoint(touchpoint, state.touchpoints);
  const d = DETAILS[t.id];
  const goals = d.contributes
    .map((c) => ({ ...c, goal: state.goals.find((g) => g.id === c.goalId) }))
    .filter((c) => c.goal);
  const posted = formatAgo(t.date, t.hoursAgo);

  return (
    <Dialog onClose={onClose} width={840} className="tp-dialog">
      <div className="tp-dialog__header">
        {t.thumb === 'video' || d.duration ? (
          <div className="tp-dialog__thumb">
            {d.duration && <span className="tp-dialog__duration t-sub2">{d.duration}</span>}
          </div>
        ) : null}
        <div className="tp-dialog__intro">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="tag-row">
              <span className="tag tp-dialog__tag t-banner pre">{`${t.kind}  •  ${t.platform}`}</span>
              <span className="t-body-2 c-2 pre">{`Posted ${posted === 'Yesterday' ? 'yesterday' : posted}  •  ${d.handle}`}</span>
            </div>
            <p className="t-h2 c-1">{t.title}</p>
            <p className="t-body-2 c-1">{d.subtitle}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="t-h4 c-1">Post caption</p>
            <p className="t-body c-1">{d.caption}</p>
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="t-h4 c-1">Analytics</p>
        <div className="metric-grid">
          {d.metrics.map((m) => (
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
        <button type="button" className="btn btn--outline btn--edit-tp t-btn" onClick={onEdit}>
          Edit touchpoint
          <Icon name="edit-14" size={14} tint />
        </button>
        <button type="button" className="btn btn--primary t-btn" style={{ borderRadius: 8, gap: 8, padding: '7px 11px' }} onClick={onClose}>
          {d.openLabel}
          <Icon name="external-14-white" size={14} tint />
        </button>
      </div>
    </Dialog>
  );
}
