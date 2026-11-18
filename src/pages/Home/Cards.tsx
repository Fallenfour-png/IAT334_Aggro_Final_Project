import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dayOfMonth, daysFromToday, formatAgo, formatNumber, monthTag } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { DUE_DAYS, goalCurrent, goalMeta, goalPercent, goalSortDate, goalStatus, RANGE_DAYS, funnelOf } from '../../state/selectors';
import { useStore } from '../../state/store';
import {
  DUE_WINDOWS,
  GOAL_CATEGORY,
  RANGES,
  type DueWindow,
  type Goal,
  type GoalCategory,
  type GoalStatus,
  type Milestone,
  type MilestoneType,
  type Range,
  type Touchpoint,
} from '../../state/types';
import { FilterButton, FilterChips, MenuOption, Popover } from '../../components/ui/Menu';
import { inRange } from './HeaderSection';

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn--primary t-btn" onClick={onClick}>
      {'Add + '}
    </button>
  );
}

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn--link t-btn" onClick={onClick}>
      {label}
      <Icon name="arrow-right-18" size={18} />
    </button>
  );
}

function EmptyState({ icon, title, lines, action }: { icon: string; title: string; lines: [string, string]; action: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon name={icon} size={24} />
      </div>
      <p className="t-h4 c-1">{title}</p>
      <p className="t-body-2 c-2">
        {lines[0]}
        <br />
        {lines[1]}
      </p>
      {action}
    </div>
  );
}

/** Figma "Empty" filter state: nothing matches the active filters. */
export function NoMatch({ title, lines, onClear }: { title: string; lines: [string, string]; onClear: () => void }) {
  return (
    <EmptyState icon="search-16" title={title} lines={lines} action={<LinkButton label="Clear filter" onClick={onClear} />} />
  );
}

/** Card date filter: outline button (calendar + period + chevron), one period per card. */
function DateFilter<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <Popover
      menuClassName="menu menu--list filter-menu"
      menuStyle={{ width: 220 }}
      trigger={({ open, toggle }) => (
        <button type="button" className="btn btn--outline date-filter" aria-expanded={open} onClick={toggle}>
          <Icon name="calendar-16" size={16} tint />
          <span className="t-btn">{value}</span>
          <Icon name="filter-chevron" size={18} tint />
        </button>
      )}
    >
      {(close) =>
        options.map((o) => (
          <MenuOption
            key={o}
            label={o}
            selected={value === o}
            onSelect={() => {
              onChange(o);
              close();
            }}
          />
        ))
      }
    </Popover>
  );
}

/* ---------------- Goals ---------------- */

const STATUS_OPTIONS: ('All goals' | GoalStatus)[] = ['All goals', 'On track', 'Behind', 'Completed', 'Not started'];
const CATEGORY_OPTIONS: ('All types' | GoalCategory)[] = ['All types', 'Wishlists', 'Community', 'Press', 'Content', 'Revenue'];
const SORTS = ['Due date', 'Progress', 'Name'] as const;
type GoalSort = (typeof SORTS)[number];

function statusClass(s: GoalStatus) {
  return `status--${s.toLowerCase().replace(' ', '-')}`;
}

export function GoalRow({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const { state } = useStore();
  const status = goalStatus(state, goal);
  const pct = goalPercent(goalCurrent(state, goal), goal.target);
  const fill = status === 'Behind' ? 'bar__fill--behind' : status === 'Completed' ? 'bar__fill--completed' : '';
  return (
    <button type="button" className="goal-row" onClick={onOpen}>
      <div className="goal-row__body">
        <div className="goal-row__top">
          <p className="t-body c-1">{goal.title}</p>
          <span className={`status t-sub2 ${statusClass(status)}`}>{status}</span>
          <p className="t-body c-1 nowrap">{pct}%</p>
        </div>
        <div className="bar">
          <div className={`bar__fill ${fill}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="t-body-2 c-2 pre">{goalMeta(state, goal)}</p>
      </div>
      <span className="icon-btn" aria-hidden>
        <Icon name="edit-sm" size={16} tint />
      </span>
    </button>
  );
}

export function GoalsCard({ onAdd, onOpen }: { onAdd: () => void; onOpen: (g: Goal) => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('All goals');
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>('All types');
  const [sort, setSort] = useState<GoalSort>('Due date');
  const [due, setDue] = useState<DueWindow>(state.due);
  const filtered = status !== 'All goals' || category !== 'All types';
  const goalFilterCount = (status !== 'All goals' ? 1 : 0) + (category !== 'All types' ? 1 : 0);
  const clearGoalFilters = () => {
    setStatus('All goals');
    setCategory('All types');
  };

  const windowDays = DUE_DAYS[due];
  const goals = state.goals
    .filter((g) => goalStatus(state, g) === 'Completed' || daysFromToday(g.due) <= windowDays)
    .filter((g) => status === 'All goals' || goalStatus(state, g) === status)
    .filter((g) => category === 'All types' || GOAL_CATEGORY[g.type] === category)
    .sort((a, b) => {
      if (sort === 'Name') return a.title.localeCompare(b.title);
      if (sort === 'Progress') return goalPercent(goalCurrent(state, b), b.target) - goalPercent(goalCurrent(state, a), a.target);
      return goalSortDate(state, a).localeCompare(goalSortDate(state, b));
    });
  // Every goal, in a scrolling list like Touchpoint updates.
  const shown = goals;

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="t-h3 c-1">Goals</h2>
        <div className="card-actions">
          <DateFilter value={due} options={DUE_WINDOWS} onChange={setDue} />
          <Popover
            menuClassName="menu menu--filter filter-menu"
            menuStyle={{ width: 420 }}
            trigger={({ open, toggle }) => <FilterButton open={open} onClick={toggle} count={goalFilterCount} />}
          >
            {() => (
              <>
                <div className="menu-columns">
                  <div className="menu-column">
                    <p className="t-banner menu-heading">STATUS</p>
                    {STATUS_OPTIONS.map((o) => (
                      <MenuOption key={o} label={o} selected={status === o} onSelect={() => setStatus(o)} />
                    ))}
                  </div>
                  <div className="menu-column">
                    <p className="t-banner menu-heading">TYPE OF GOAL</p>
                    {CATEGORY_OPTIONS.map((o) => (
                      <MenuOption key={o} label={o} selected={category === o} onSelect={() => setCategory(o)} />
                    ))}
                  </div>
                </div>
                <div className="menu-divider" />
                <p className="t-banner menu-heading">SORT BY</p>
                <div className="menu-sort">
                  {SORTS.map((o) => (
                    <MenuOption key={o} label={o} selected={sort === o} onSelect={() => setSort(o)} />
                  ))}
                </div>
                <div className="menu-footer">
                  <button
                    type="button"
                    className="t-btn c-accent"
                    onClick={() => {
                      setStatus('All goals');
                      setCategory('All types');
                      setSort('Due date');
                    }}
                  >
                    Clear all
                  </button>
                  <p className="t-body-2 c-3">Applies as you select</p>
                </div>
              </>
            )}
          </Popover>
          <AddButton onClick={onAdd} />
        </div>
      </div>

      <FilterChips
        chips={[
          ...(status !== 'All goals' ? [{ label: status, onRemove: () => setStatus('All goals') }] : []),
          ...(category !== 'All types' ? [{ label: category, onRemove: () => setCategory('All types') }] : []),
        ]}
        onClear={clearGoalFilters}
      />

      {state.goals.length === 0 ? (
        <EmptyState
          icon="empty-target-24"
          title="No goals yet"
          lines={['Set a target like 25,000 wishlists by launch', 'and track it here automatically.']}
          action={<LinkButton label="Add a goal" onClick={onAdd} />}
        />
      ) : (
        <>
          {shown.length === 0 && filtered ? (
            <NoMatch
              title="No goals match this filter"
              lines={[
                status !== 'All goals' ? `Nothing is marked ${status}.` : `No ${category.toLowerCase()} goals yet.`,
                'Try another status or clear the filter.',
              ]}
              onClear={clearGoalFilters}
            />
          ) : (
            <div className="tp-scroll tp-scroll--goals">
              <div className="card-list">
                {shown.map((g) => (
                  <GoalRow key={g.id} goal={g} onOpen={() => onOpen(g)} />
                ))}
                {shown.length === 0 && <p className="t-body-2 c-3 filter-empty">No goals due in the {due.toLowerCase()}.</p>}
              </div>
            </div>
          )}
          <div className="card-footer">
            <p className="t-body-2 c-3 nowrap">
              {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
            </p>
            <LinkButton label="View all" onClick={() => navigate('/plan')} />
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- Milestones ---------------- */

const MS_TYPES: ('All types' | MilestoneType)[] = ['All types', 'Deliverable', 'Content', 'Event', 'Fund', 'Press', 'Revenue'];

export function MilestoneRow({ m, onOpen, className = '', trailing }: { m: Milestone; onOpen: () => void; className?: string; trailing?: React.ReactNode }) {
  const days = daysFromToday(m.date);
  const soon = days <= 7;
  return (
    <button type="button" className={`milestone-row ${className}`} onClick={onOpen}>
      <div className={`date-tile ${soon ? 'date-tile--soon' : ''}`}>
        <span className="t-overview-header">{monthTag(m.date)}</span>
        <span className="t-h4">{dayOfMonth(m.date)}</span>
      </div>
      <div className="milestone-row__body">
        <p className="t-body c-1">{m.title}</p>
        <p className="t-body-2 c-2">
          {m.type} • {m.channel}
        </p>
      </div>
      <p className={`t-body-2 nowrap ${soon ? 'c-warning' : 'c-1'}`}>{days === 0 ? 'Today' : days < 0 ? `${-days}d ago` : `in ${days}d`}</p>
      {trailing ?? <Icon name="chev-right" size={20} tint className="row-chev" />}
    </button>
  );
}

export function MilestonesCard({ onAdd, onOpen }: { onAdd: () => void; onOpen: (m: Milestone) => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [type, setType] = useState<(typeof MS_TYPES)[number]>('All types');
  const [due, setDue] = useState<DueWindow>(state.due);
  const windowDays = DUE_DAYS[due];
  const upcoming = state.milestones
    .filter((m) => daysFromToday(m.date) >= 0 && daysFromToday(m.date) <= windowDays)
    .filter((m) => type === 'All types' || m.type === type)
    .sort((a, b) => a.date.localeCompare(b.date));
  // Every upcoming milestone, in a scrolling list like Touchpoint updates.
  const shown = upcoming;

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="t-h3 c-1">Upcoming Milestones</h2>
        <div className="card-actions">
          <DateFilter value={due} options={DUE_WINDOWS} onChange={setDue} />
          <Popover
            menuClassName="menu menu--filter filter-menu"
            menuStyle={{ width: 240 }}
            trigger={({ open, toggle }) => <FilterButton open={open} onClick={toggle} count={type !== 'All types' ? 1 : 0} />}
          >
            {() => (
              <>
                <div className="menu-column">
                  <p className="t-banner menu-heading">TYPE</p>
                  {MS_TYPES.map((o) => (
                    <MenuOption key={o} label={o} selected={type === o} onSelect={() => setType(o)} />
                  ))}
                </div>
                <div className="menu-footer">
                  <button type="button" className="t-btn c-accent" onClick={() => setType('All types')}>
                    Clear all
                  </button>
                  <p className="t-body-2 c-3">1 selected</p>
                </div>
              </>
            )}
          </Popover>
          <AddButton onClick={onAdd} />
        </div>
      </div>

      <FilterChips
        chips={type !== 'All types' ? [{ label: type, onRemove: () => setType('All types') }] : []}
        onClear={() => setType('All types')}
      />

      {state.milestones.length === 0 ? (
        <EmptyState
          icon="empty-calendar-24"
          title="No milestones yet"
          lines={['Add deadlines, events and funds', 'you’re working toward.']}
          action={<LinkButton label="Add a milestone" onClick={onAdd} />}
        />
      ) : (
        <>
          {shown.length === 0 && type !== 'All types' ? (
            <NoMatch
              title="No milestones match this filter"
              lines={[`No ${type.toLowerCase()} milestones are due in the ${due.toLowerCase()}.`, 'Try another date or clear the filter.']}
              onClear={() => setType('All types')}
            />
          ) : (
            <div className="tp-scroll tp-scroll--goals">
              <div className="card-list card-list--tight">
                {shown.map((m) => (
                  <MilestoneRow key={m.id} m={m} onOpen={() => onOpen(m)} />
                ))}
                {shown.length === 0 && <p className="t-body-2 c-3 filter-empty">No milestones due in the {due.toLowerCase()}.</p>}
              </div>
            </div>
          )}
          <div className="card-footer">
            <p className="t-body-2 c-3 nowrap">
              {upcoming.length} {upcoming.length === 1 ? 'milestone' : 'milestones'}
            </p>
            <LinkButton label="View all" onClick={() => navigate('/plan')} />
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- Conversion points ---------------- */

const FUNNEL_WIDTHS = [100, (420 / 586) * 100, (282 / 586) * 100, (231 / 586) * 100, (198 / 586) * 100];

/** Figma Funnel hover tooltips (Stage 1-5): label, rate label, change vs last month, top source. */
const FUNNEL_TIPS = [
  { total: 'Total impressions', rate: 'Share of funnel', change: 8.2, source: 'TikTok (58%)' },
  { total: 'Store + profile clicks', rate: 'From impressions', change: 0.6, source: 'Steam (46%)' },
  { total: 'Wishlists + follows', rate: 'From profile clicks', change: 1.4, source: 'TikTok (41%)' },
  { total: 'Paying patrons', rate: 'From wishlists', change: 0.3, source: 'Discord (62%)' },
  { total: 'Orders', rate: 'From wishlists', change: -0.2, source: 'Patreon (48%)' },
];

export function ConversionCard() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);
  const [range, setRange] = useState<Range>(state.range);
  const live = state.connections.some((c) => c.connected) && state.touchpoints.length > 0;
  const m = RANGE_DAYS[range] / 7;
  const patrons = state.kpis.find((k) => k.id === 'patreon')?.value ?? 0;
  const f = funnelOf(state);
  const impressions = f.impressions * m;
  const clicks = f.clicks * m;
  const wishlists = f.wishlists * m;
  const merch = f.merch * m;
  const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}%`;
  const stages = [
    { name: 'Impressions', value: impressions, note: 'Baseline — top of conversion', rate: '100%' },
    { name: 'Profile / Store clicks', value: clicks, note: `${pct(clicks, impressions)} click-through from impressions`, rate: pct(clicks, impressions) },
    { name: 'Wishlist / Follow', value: wishlists, note: `${pct(wishlists, clicks)} conversion from clicks`, rate: pct(wishlists, clicks) },
    { name: 'Patreon Patrons', value: patrons, note: `${pct(patrons, wishlists)} paid conversion`, rate: pct(patrons, wishlists) },
    { name: 'Merch sales', value: merch, note: `${pct(merch, wishlists)} paid conversion`, rate: pct(merch, wishlists) },
  ];

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="t-h3 c-1">Conversion Points</h2>
        <div className="card-actions">
          <DateFilter value={range} options={RANGES} onChange={setRange} />
          <LinkButton label="View analytics" onClick={() => navigate('/analytics')} />
        </div>
      </div>
      <div className={`funnel ${live && hovered !== null ? 'has-hover' : ''}`} onMouseLeave={() => setHovered(null)}>
        {stages.map((s, i) => {
          const tip = FUNNEL_TIPS[i];
          return (
            <div
              key={s.name}
              className={`funnel-stage funnel-stage--${i + 1} ${live ? '' : 'is-empty'} ${hovered === i ? 'is-hovered' : ''}`}
              style={{ width: `${FUNNEL_WIDTHS[i]}%` }}
              onMouseEnter={() => live && setHovered(i)}
            >
              <div className="funnel-stage__top t-body">
                <span>{s.name}</span>
                <span>{live ? formatNumber(s.value) : 0}</span>
              </div>
              <p className="t-body-2">{live ? s.note : 'No data yet'}</p>
              {live && hovered === i && (
                <div className={`funnel-tip ${i < 2 ? 'funnel-tip--below' : 'funnel-tip--side'}`} role="tooltip">
                  <span className="funnel-tip__caret" />
                  <p className="t-h4 c-1">{s.name}</p>
                  <div className="funnel-tip__row t-body-2">
                    <span className="c-2">{tip.total}</span>
                    <span className="t-btn c-1">{formatNumber(s.value)}</span>
                  </div>
                  <div className="funnel-tip__row t-body-2">
                    <span className="c-2">{tip.rate}</span>
                    <span className="t-btn c-1">{s.rate}</span>
                  </div>
                  <div className="funnel-tip__row t-body-2">
                    <span className="c-2">vs last month</span>
                    <span className={`t-btn ${tip.change >= 0 ? 'c-positive' : 'c-negative'}`}>
                      {tip.change >= 0 ? '▲' : '▼'} {Math.abs(tip.change).toFixed(1)}%
                    </span>
                  </div>
                  <div className="funnel-tip__row t-body-2">
                    <span className="c-2">Top source</span>
                    <span className="t-btn c-1">{tip.source}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Touchpoint updates ---------------- */

const TP_TYPES = ['All types', 'Short-form', 'Press', 'Storefront', 'Event'] as const;
const TP_PLATFORMS = ['All platforms', 'TikTok', 'Instagram', 'YouTube', 'Steam'] as const;
export const THUMB_ICON = { press: 'tp-press', storefront: 'tp-storefront', community: 'tp-community', megaphone: 'tp-megaphone' } as const;

export function TouchpointRow({ t, onOpen, className = '', trailing }: { t: Touchpoint; onOpen: () => void; className?: string; trailing?: React.ReactNode }) {
  return (
    <button type="button" className={`tp-row ${className}`} onClick={onOpen}>
      {t.thumb === 'video' ? (
        <div className="tp-thumb tp-thumb--video" />
      ) : (
        <div className="tp-thumb">
          <Icon name={THUMB_ICON[t.thumb]} size={20} />
        </div>
      )}
      <div className="tp-row__body">
        <div className="tp-row__text">
          <p className="t-banner c-1 pre">{`${t.kind.toUpperCase()}  •  ${t.platform.toUpperCase()}`}</p>
          <p className="t-body c-1">{t.title}</p>
          <p className="t-body-2 c-1 pre">{t.stats}</p>
        </div>
        <p className="t-body-2 c-2 nowrap">{formatAgo(t.date, t.hoursAgo)}</p>
      </div>
      {trailing ?? <Icon name="chev-right" size={20} tint className="row-chev" />}
    </button>
  );
}

export function TouchpointsCard({ onAdd, onOpen }: { onAdd: () => void; onOpen: (t: Touchpoint) => void }) {
  const { state } = useStore();
  const [type, setType] = useState<(typeof TP_TYPES)[number]>('All types');
  const [platform, setPlatform] = useState<(typeof TP_PLATFORMS)[number]>('All platforms');
  const [range, setRange] = useState<Range>(state.range);
  const list = state.touchpoints
    .filter((t) => inRange(t, RANGE_DAYS[range]))
    .filter((t) => type === 'All types' || t.kind === type)
    .filter((t) => platform === 'All platforms' || t.platform === platform)
    .sort((a, b) => b.date.localeCompare(a.date) || (a.hoursAgo ?? 24) - (b.hoursAgo ?? 24));

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="t-h3" style={{ color: '#000' }}>
          Touchpoint updates
        </h2>
        <div className="card-actions">
          <DateFilter value={range} options={RANGES} onChange={setRange} />
          <Popover
            menuClassName="menu menu--filter filter-menu"
            menuStyle={{ width: 440 }}
            trigger={({ open, toggle }) => (
              <FilterButton open={open} onClick={toggle} count={(type !== 'All types' ? 1 : 0) + (platform !== 'All platforms' ? 1 : 0)} />
            )}
          >
            {() => (
              <>
                <div className="menu-columns">
                  <div className="menu-column">
                    <p className="t-banner menu-heading">TYPE</p>
                    {TP_TYPES.map((o) => (
                      <MenuOption key={o} label={o} selected={type === o} onSelect={() => setType(o)} />
                    ))}
                  </div>
                  <div className="menu-column">
                    <p className="t-banner menu-heading">PLATFORM</p>
                    {TP_PLATFORMS.map((o) => (
                      <MenuOption key={o} label={o} selected={platform === o} onSelect={() => setPlatform(o)} />
                    ))}
                  </div>
                </div>
                <div className="menu-footer">
                  <button
                    type="button"
                    className="t-btn c-accent"
                    onClick={() => {
                      setType('All types');
                      setPlatform('All platforms');
                    }}
                  >
                    Clear all
                  </button>
                  <p className="t-body-2 c-3">Dates use the date filter</p>
                </div>
              </>
            )}
          </Popover>
          <button type="button" className="btn btn--primary t-btn" onClick={onAdd}>
            {'Add Touchpoint + '}
          </button>
        </div>
      </div>

      <FilterChips
        chips={[
          ...(type !== 'All types' ? [{ label: type, onRemove: () => setType('All types') }] : []),
          ...(platform !== 'All platforms' ? [{ label: platform, onRemove: () => setPlatform('All platforms') }] : []),
        ]}
        onClear={() => {
          setType('All types');
          setPlatform('All platforms');
        }}
      />

      {state.touchpoints.length === 0 ? (
        <EmptyState
          icon="empty-plus-24"
          title="Log your first touchpoint"
          lines={['Add a post, press piece or store update', 'to start seeing what drives wishlists.']}
          action={
            <button type="button" className="cta" style={{ width: 'auto', boxShadow: 'var(--shadow-card)' }} onClick={onAdd}>
              <span className="t-body">New Touchpoint</span>
              <Icon name="plus-white" size={20} tint />
            </button>
          }
        />
      ) : list.length === 0 && (type !== 'All types' || platform !== 'All platforms') ? (
        <NoMatch
          title="No touchpoints match this filter"
          lines={[`Nothing from the ${range.toLowerCase()} matches.`, 'Try another type or platform, or clear the filter.']}
          onClear={() => {
            setType('All types');
            setPlatform('All platforms');
          }}
        />
      ) : (
        <div className="tp-scroll">
          <div className="card-list">
            {list.map((t) => (
              <TouchpointRow key={t.id} t={t} onOpen={() => onOpen(t)} />
            ))}
            {list.length === 0 && <p className="t-body-2 c-3 filter-empty">No touchpoints in the {range.toLowerCase()}.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
