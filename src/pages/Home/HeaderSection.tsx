import { useNavigate } from 'react-router-dom';
import { daysBetween, formatNumber, formatShort, TODAY } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { RANGE_DAYS } from '../../state/selectors';
import { useStore } from '../../state/store';
import { RANGES, type Touchpoint } from '../../state/types';
import { MenuOption, Popover } from '../../components/ui/Menu';
import { GameCover } from '../../components/ui/GameCover';
import { THUMB_ICON } from './Cards';

export function inRange(t: Touchpoint, rangeDays: number): boolean {
  return daysBetween(t.date, TODAY) <= rangeDays;
}

/**
 * Figma Home (3726:60269) "Project Header": game cover, title + edit, campaign line and
 * progress, then Top Performer with "Add Touchpoint +" and "Switch Project" (→ Games screen).
 */
export function ProjectHeader({ onOpenTouchpoint }: { onOpenTouchpoint: (t: Touchpoint) => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const project = state.project!;
  const day = Math.max(1, daysBetween(project.campaignStart, TODAY) + 1);
  const total = Math.max(1, daysBetween(project.campaignStart, project.launch));
  const pct = Math.min(100, Math.max(0, (day / total) * 100));

  return (
    <section className="card project-header">
      <GameCover project={project} small />
      <div className="project-info">
        <div className="project-info__top">
          <div className="title-row">
            <h1 className="t-h1 c-1 nowrap">{project.name}</h1>
            <button type="button" className="icon-btn" aria-label="Edit project" onClick={() => navigate('/settings?tab=projects')}>
              <Icon name="edit-sm" size={16} tint />
            </button>
          </div>
          <p className="t-body c-2 pre">{project.tagline}</p>
        </div>
        <div className="campaign-progress">
          <div className="campaign-progress__labels t-body c-1">
            <span>{`Campaign  ·  Day ${Math.min(day, total)} of ${total}`}</span>
            <span>{`Launch  •  ${formatShort(project.launch)}`}</span>
          </div>
          <div className="bar bar--strong">
            <div className="bar__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="header-side">
        <TopPerformer onOpen={onOpenTouchpoint} />
        <div className="header-side__actions">
          <button type="button" className="btn btn--primary t-btn" onClick={() => navigate('/connect')}>
            {'Add Touchpoint + '}
          </button>
          <button type="button" className="btn btn--cancel t-btn switch-btn" onClick={() => navigate('/games')}>
            Switch Project
            <Icon name="switch-18" size={18} tint />
          </button>
        </div>
      </div>
    </section>
  );
}

/** Figma "Top Performer": the touchpoint with the most wishlists in the range bar's period. */
function TopPerformer({ onOpen }: { onOpen: (t: Touchpoint) => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const list = state.touchpoints.filter((t) => inRange(t, RANGE_DAYS[state.range]));
  const top = list.reduce<Touchpoint | undefined>((best, t) => (!best || t.wishlists > best.wishlists ? t : best), undefined);
  const average = list.reduce((sum, t) => sum + t.wishlists, 0) / Math.max(1, list.length);
  const multiplier = top && average > 0 ? top.wishlists / average : 0;

  return (
    <div
      className={`top-performer ${top ? '' : 'is-empty'}`}
      role={top ? 'button' : undefined}
      tabIndex={top ? 0 : undefined}
      onClick={() => top && onOpen(top)}
      onKeyDown={(e) => top && (e.key === 'Enter' || e.key === ' ') && onOpen(top)}
    >
      <div className="top-performer__head">
        <p className="t-banner c-2 pre">{`TOP PERFORMER  •  ${state.range.toUpperCase()}`}</p>
        <button
          type="button"
          className="track-link t-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/analytics');
          }}
        >
          Track
          <Icon name="arrow-right-accent" size={14} />
        </button>
      </div>
      {top ? (
        <div className="top-performer__body">
          <div className="post">
            {top.thumb === 'video' ? (
              <div className="thumb-video" />
            ) : (
              <div className="tp-thumb">
                <Icon name={THUMB_ICON[top.thumb]} size={20} />
              </div>
            )}
            <div className="post__meta">
              <p className="t-sub2 c-2 pre">{`${top.kind.toUpperCase()}  •  ${top.platform.toUpperCase()}`}</p>
              <p className="t-btn-bold c-1 ellipsis">{top.title}</p>
            </div>
          </div>
          <div className="result">
            <div className="result__value">
              <span className="t-h4 c-1">+{formatNumber(top.wishlists)}</span>
              <span className="t-body-2 c-2">wishlists</span>
            </div>
            {multiplier >= 1.05 && <span className="pill pill--positive t-banner">{multiplier.toFixed(1)}x your average</span>}
          </div>
        </div>
      ) : (
        <p className="t-body-2 c-3">No touchpoints in the {state.range.toLowerCase()} yet.</p>
      )}
    </div>
  );
}

/** Figma "Dashboard Range": "Showing data for" the KPI cards, plus the sync status. */
export function DashboardRange() {
  const { state, update } = useStore();
  const anyConnected = state.connections.some((c) => c.connected);
  const days = RANGE_DAYS[state.range];
  return (
    <section className="dashboard-range">
      <div className="dashboard-range__left">
        <p className="t-body c-1 nowrap">Showing data for</p>
        <Popover
          menuClassName="menu menu--list range-menu"
          trigger={({ open, toggle }) => (
            <button type="button" className="range-btn" aria-expanded={open} onClick={toggle}>
              <Icon name="calendar" size={16} tint />
              <span className="t-btn nowrap">{state.range}</span>
              <Icon name="chevron-down" size={16} tint />
            </button>
          )}
        >
          {(close) => (
            <>
              {RANGES.map((r) => (
                <MenuOption
                  key={r}
                  label={r}
                  selected={state.range === r}
                  onSelect={() => {
                    update((s) => ({ ...s, range: r }));
                    close();
                  }}
                />
              ))}
              <div className="menu-divider" />
              <p className="t-body-2 c-3" style={{ width: 236 }}>
                The cards below each have their own date filter.
              </p>
            </>
          )}
        </Popover>
        <p className="t-body c-1 nowrap">compared with the {days} days before</p>
      </div>
      <div className="sync-status">
        {anyConnected ? (
          <>
            <Icon name="dot-positive" size={8} />
            <p className="t-body-2 c-3">All accounts synced 10 min ago</p>
          </>
        ) : (
          <p className="t-body-2 c-3">No accounts connected yet</p>
        )}
      </div>
    </section>
  );
}
