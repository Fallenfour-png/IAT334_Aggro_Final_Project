import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/shell/AppLayout';
import { FilterButton, FilterChips, MenuOption, Popover } from '../../components/ui/Menu';
import { addDays, dayOfMonth, daysFromToday, formatAgo, monthTag, TODAY } from '../../lib/dates';
import { goalCurrent, goalPercent } from '../../state/selectors';
import { Icon } from '../../lib/icons';
import { useStore } from '../../state/store';
import type { Goal, Milestone, Touchpoint } from '../../state/types';
import { GoalDialog } from '../Home/GoalDialog';
import { MilestoneDialog } from '../Home/MilestoneDialog';
import { TouchpointDialog } from '../Home/TouchpointDialog';
import {
  buckets,
  dateLabel,
  FILTERS,
  keyMetrics,
  MAX_SQUARES,
  sections,
  SERIES,
  squareUnit,
  TIMEFRAMES,
  TRAFFIC_SCALE,
  type Bucket,
  type FilterId,
  type MetricCardData,
  type Timeframe,
} from './analyticsData';
import '../Home/home.css';
import './analytics.css';

const DAYS: Record<Timeframe, number> = { 'Last 7 Days': 7, 'Last 28 Days': 28, 'Last 60 Days': 60, 'Last 365 Days': 365, Custom: 14 };

type Open = { kind: 'goal'; goal: Goal } | { kind: 'milestone'; milestone: Milestone } | { kind: 'touchpoint'; t: Touchpoint } | null;

const LEGEND = [
  { label: 'Steam Wishlists', color: SERIES.wishlists },
  { label: 'Discord Members', color: SERIES.members },
  { label: 'Touchpoints', color: SERIES.touchpoints },
  { label: 'Traffic', color: SERIES.traffic },
];

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn--link t-btn" onClick={onClick}>
      {label}
      <Icon name="arrow-right-18" size={18} />
    </button>
  );
}

/* ---------------- Overview (original Analytics content, app text sizes) ---------------- */

const THUMB = { press: 'tp-press', storefront: 'tp-storefront', community: 'tp-community', megaphone: 'tp-megaphone', video: 'type-shorts' } as const;

function Placeholder({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="ov-placeholder" onClick={onClick} aria-label="Add">
      +
    </button>
  );
}

function OverviewPanel({ onClose, onOpen }: { onClose: () => void; onOpen: (o: Open) => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const goals = [...state.goals].filter((g) => !g.completedAt).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
  const milestones = [...state.milestones].filter((m) => daysFromToday(m.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const updates = [...state.touchpoints].sort((a, b) => b.date.localeCompare(a.date) || (a.hoursAgo ?? 24) - (b.hoursAgo ?? 24)).slice(0, 4);

  const head = (title: string, link: string, to: string) => (
    <div className="ov-section__head">
      <h3 className="t-h4 c-1">{title}</h3>
      <button type="button" className="ov-link t-btn" onClick={() => navigate(to)}>
        {link}
      </button>
    </div>
  );

  return (
    <aside className="card ov">
      <div className="card-header">
        <h2 className="t-h3 c-1">Overview</h2>
        <button type="button" className="close-btn" aria-label="Close overview" onClick={onClose}>
          <Icon name="close-16" size={16} tint />
        </button>
      </div>

      <div className="ov-scroll">
      <section className="ov-section">
        {head('Goals', 'View all', '/plan')}
        {goals.length === 0
          ? [0, 1, 2].map((i) => <Placeholder key={i} onClick={() => navigate('/plan')} />)
          : goals.map((g) => (
              <button type="button" key={g.id} className="ov-card" onClick={() => onOpen({ kind: 'goal', goal: g })}>
                <span className="ov-date">
                  <span>{monthTag(g.due)}</span>
                  <b>{String(dayOfMonth(g.due)).padStart(2, '0')}</b>
                </span>
                <span className="ov-card__text">
                  <span className="t-btn c-1 ov-ellipsis">{g.title}</span>
                  <span className="t-body-2 c-2 ov-ellipsis">
                    {goalCurrent(state, g).toLocaleString('en-US')} / {g.target.toLocaleString('en-US')}
                  </span>
                </span>
                <span className="t-btn c-2 nowrap">{goalPercent(goalCurrent(state, g), g.target)}%</span>
              </button>
            ))}
      </section>

      <section className="ov-section">
        {head('Next Milestone', 'View all', '/plan')}
        {milestones.length === 0
          ? [0, 1, 2].map((i) => <Placeholder key={i} onClick={() => navigate('/plan')} />)
          : milestones.map((m) => (
              <button type="button" key={m.id} className="ov-card" onClick={() => onOpen({ kind: 'milestone', milestone: m })}>
                <span className="ov-date">
                  <span>{monthTag(m.date)}</span>
                  <b>{dayOfMonth(m.date)}</b>
                </span>
                <span className="ov-card__text">
                  <span className="t-btn c-1 ov-ellipsis">{m.title}</span>
                  <span className="t-body-2 c-2 ov-ellipsis">
                    {m.type} • {m.channel}
                  </span>
                </span>
                <span className="t-btn c-2 nowrap">in {daysFromToday(m.date)}d</span>
              </button>
            ))}
      </section>

      <section className="ov-section">
        {head('Updates', 'LU: 30m', '/plan')}
        {updates.length === 0
          ? [0, 1].map((i) => <Placeholder key={i} onClick={() => navigate('/connect')} />)
          : updates.map((t) => (
              <button type="button" key={t.id} className="ov-card" onClick={() => onOpen({ kind: 'touchpoint', t })}>
                <span className="ov-icon">
                  <Icon name={THUMB[t.thumb]} size={20} />
                </span>
                <span className="ov-card__text">
                  <span className="t-overview-header c-2 pre">{`${t.kind.toUpperCase()}  •  ${t.platform.toUpperCase()}`}</span>
                  <span className="t-btn c-1 ov-ellipsis">{t.title}</span>
                  <span className="t-sub2 c-2 ov-ellipsis">{t.stats.split('•').slice(0, 2).join('•')}</span>
                </span>
                <span className="t-btn c-2 nowrap">{formatAgo(t.date, t.hoursAgo).replace('Yesterday', '1d ago')}</span>
              </button>
            ))}
      </section>
      </div>
    </aside>
  );
}

/* ---------------- Graph ---------------- */

/** Figma "Touchpoint" (Right/Left Active): the dark square's card, clicking opens the touchpoint overlay. */
function TouchpointCard({ tps, left, onOpen }: { tps: Touchpoint[]; left: boolean; onOpen: (t: Touchpoint) => void }) {
  return (
    <div className={`tp-card ${left ? 'tp-card--left' : ''}`} role="tooltip">
      {tps.map((t) => (
        <button type="button" key={t.id} className="tp-card__row" onClick={() => onOpen(t)}>
          <span className="tp-card__icon">
            <Icon name={THUMB[t.thumb]} size={20} />
          </span>
          <span className="tp-card__text">
            <span className="t-overview-header c-2 pre ov-ellipsis">{`${t.kind.toUpperCase()}  •  ${t.platform.toUpperCase()}`}</span>
            <span className="t-btn c-1 ov-ellipsis">{t.title}</span>
            <span className="t-sub2 c-2 ov-ellipsis">{t.stats.split('•').slice(0, 2).join('•')}</span>
          </span>
          <span className="t-sub2 c-2 nowrap">{formatAgo(t.date, t.hoursAgo).replace('Yesterday', '1d ago')}</span>
        </button>
      ))}
    </div>
  );
}

function Graph({
  data,
  show,
  empty,
  days,
  onOpenTouchpoint,
}: {
  data: Bucket[];
  show: Record<'tp' | 'wl' | 'dm', boolean>;
  empty: boolean;
  days: number;
  onOpenTouchpoint: (t: Touchpoint) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  /** Column whose dark touchpoint square is hovered: shows that touchpoint instead of the column summary. */
  const [tpHover, setTpHover] = useState<number | null>(null);
  const unit = squareUnit(data);
  const labelEvery = days <= 7 ? 6 : days <= 28 ? 7 : days <= 60 ? 14 : 60;

  return (
    <div className="graph">
      <div className="graph__y">
        {[16, 12, 8, 4, 0].map((n) => (
          <span key={n} className="t-sub2 c-2">
            {(n * unit).toLocaleString('en-US')} <i />
          </span>
        ))}
      </div>
      <div className="graph__plot" onMouseLeave={() => setHover(null)}>
        <div className="graph__cols" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((b, i) => {
            const squares: string[] = [];
            if (empty) {
              for (let s = 0; s < MAX_SQUARES; s++) squares.push(SERIES.traffic);
            } else {
              if (show.tp && b.tp) squares.push(SERIES.touchpoints);
              for (let s = 0; s < (b.wl ? Math.max(1, Math.round(b.wl / unit)) : 0) && show.wl; s++) squares.push(SERIES.wishlists);
              for (let s = 0; s < (b.dm ? Math.max(1, Math.round(b.dm / unit)) : 0) && show.dm; s++) squares.push(SERIES.members);
              for (let s = 0; s < Math.round(b.tt / (unit * TRAFFIC_SCALE)); s++) squares.push(SERIES.traffic);
            }
            const rows = [
              { k: 'Touchpoints', v: String(b.tp), c: SERIES.touchpoints, on: show.tp },
              { k: 'Traffic', v: b.tt.toLocaleString('en-US'), c: '#9aa2ae', on: true },
              { k: 'Wishlists', v: b.wl.toLocaleString('en-US'), c: SERIES.wishlists, on: show.wl },
              { k: 'Discord members', v: b.dm.toLocaleString('en-US'), c: SERIES.members, on: show.dm },
            ].filter((r) => r.on);
            return (
              <div key={i} className={`graph__col ${hover === i ? 'is-hover' : ''} ${tpHover === i ? 'is-tp' : ''}`} onMouseEnter={() => !empty && setHover(i)}>
                {squares.slice(0, MAX_SQUARES).map((color, s) =>
                  color === SERIES.touchpoints && !empty && b.tps.length ? (
                    <span
                      key={s}
                      className={`graph__sq graph__sq--tp ${tpHover === i ? 'is-active' : ''}`}
                      style={{ background: color }}
                      onMouseEnter={() => setTpHover(i)}
                      onMouseLeave={() => setTpHover(null)}
                      onClick={() => onOpenTouchpoint(b.tps[0])}
                    >
                      {tpHover === i && <TouchpointCard tps={b.tps} left={i > data.length * 0.7} onOpen={onOpenTouchpoint} />}
                    </span>
                  ) : (
                    <span key={s} className="graph__sq" style={{ background: color }} />
                  ),
                )}
                {hover === i && tpHover === null && (
                  <>
                    <span className="scrubber" />
                    <span className="scrubber__dot" />
                    <div className={`funnel-tip graph-tip ${i > data.length * 0.7 ? 'graph-tip--left' : ''}`} role="tooltip">
                      <div>
                        <p className="t-h4 c-1">{b.label}</p>
                        <p className="t-body-2 c-2">{b.sub}</p>
                      </div>
                      {rows.map((r) => (
                        <div key={r.k} className="funnel-tip__row t-body-2">
                          <span className="c-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="sq" style={{ background: r.c }} />
                            {r.k}
                          </span>
                          <span className="t-btn c-1">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="graph__x" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((b, i) =>
            i % labelEvery === 0 ? (
              <span key={i} className="graph__tick">
                <i />
                <span className="t-sub2 c-2">{dateLabel(b.start, false)}</span>
              </span>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Metric cards (Home KPI card styling) ---------------- */

function MetricCard({ m, filtered }: { m: MetricCardData; filtered?: boolean }) {
  return (
    <div className={`kpi-card m-card ${filtered ? 'is-filtered' : ''}`}>
      <div className="kpi-card__label">
        <span className="m-card__swatch" style={{ background: m.color }} />
        <span className="t-body c-2 m-card__name">
          {m.label}
          {filtered ? ' (Filtered)' : ''}
        </span>
      </div>
      <div className="kpi-card__value">
        <span className="t-h2 c-1 kpi-card__number">{m.value}</span>
        <span className={`status t-sub2 ${m.positive && !filtered ? 'status--completed' : 'm-card__rate'}`}>{m.rate}</span>
      </div>
      <div className="m-card__foot">
        <p className={`t-body nowrap ${m.positive && !filtered ? 'c-positive' : 'c-2'}`}>{m.change}</p>
        <p className="t-body-2 c-2 nowrap">{m.lu} ago</p>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('Last 7 Days');
  const [hidden, setHidden] = useState<FilterId[]>([]);
  // Key Metrics collapses like the sections below, but starts open.
  const [openSections, setOpenSections] = useState<string[]>(['key']);
  const toggleSection = (id: string) => setOpenSections((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const keyOpen = openSections.includes('key');
  const [open, setOpen] = useState<Open>(null);

  const empty = !state.connections.some((c) => c.connected);
  const days = DAYS[timeframe];
  const data = useMemo(() => buckets(state, empty ? 28 : days), [state, days, empty]);
  const tpHidden = (['tiktok', 'youtube', 'events', 'press'] as FilterId[]).every((f) => hidden.includes(f));
  const show = { tp: !tpHidden, wl: !hidden.includes('wishlists'), dm: !hidden.includes('members') };
  const metrics = keyMetrics(state, days);
  const isFiltered = (series?: string) =>
    (series === 'wishlists' && !show.wl) || (series === 'members' && !show.dm) || (series === 'touchpoints' && !show.tp);
  const toggle = (id: FilterId) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));

  return (
    <AppLayout crumbs={[{ label: 'Home', to: '/' }, { label: 'Analytics' }]}>
      <main className={`page analytics ${overview ? '' : 'is-closed'}`}>
        {overview ? (
          <OverviewPanel onClose={() => setOverview(false)} onOpen={setOpen} />
        ) : (
          <button type="button" className="ov-open" aria-label="Open overview" onClick={() => setOverview(true)}>
            <Icon name="chevron-right" size={20} tint />
          </button>
        )}

        <div className="an-main">
          {/* Insights: chart and its controls */}
          <section className="card">
            <div className="card-header">
              <div className="an-title">
                <h1 className="t-h3 c-1">Insights</h1>
                <div className="an-subrow">
                  <p className="t-body c-2 nowrap">
                    {dateLabel(addDays(TODAY, empty ? -28 : -days))} – {dateLabel(TODAY)}
                  </p>
                  <div className="legend an-legend">
                    {LEGEND.map((l) => (
                      <span key={l.label} className="legend-tag t-body" style={{ cursor: 'default' }}>
                        <span className="legend-dot" style={{ background: l.color, borderRadius: 2 }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-actions">
                {!empty && (
                  <>
                    <Popover
                      menuClassName="menu menu--list range-menu an-range-menu"
                      trigger={({ open: o, toggle: t }) => (
                        <button type="button" className="range-btn" aria-expanded={o} onClick={t}>
                          <Icon name="calendar" size={16} tint />
                          <span className="t-btn">{timeframe}</span>
                          <Icon name="chevron-down" size={16} tint />
                        </button>
                      )}
                    >
                      {(close) =>
                        TIMEFRAMES.map((t) => (
                          <MenuOption
                            key={t}
                            label={t}
                            selected={t === timeframe}
                            onSelect={() => {
                              setTimeframe(t);
                              close();
                            }}
                          />
                        ))
                      }
                    </Popover>
                    <Popover
                      menuClassName="menu menu--filter filter-menu"
                      menuStyle={{ width: 260 }}
                      trigger={({ open: o, toggle: t }) => <FilterButton open={o} onClick={t} count={hidden.length} />}
                    >
                      {() => (
                        <>
                          <div className="menu-column">
                            <p className="t-banner menu-heading">SHOW ON GRAPH</p>
                            {FILTERS.map((f) => {
                              const on = !hidden.includes(f.id);
                              return (
                                <button type="button" key={f.id} className="menu-option" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(f.id)}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="sq" style={{ background: f.color }} />
                                    <span className={on ? 't-btn-bold' : 't-btn c-3'}>{f.label}</span>
                                  </span>
                                  {on && <Icon name="check-small" size={10} />}
                                </button>
                              );
                            })}
                          </div>
                          <div className="menu-footer">
                            <button type="button" className="t-btn c-accent" onClick={() => setHidden([])}>
                              Show all
                            </button>
                            <p className="t-body-2 c-3">Applies as you select</p>
                          </div>
                        </>
                      )}
                    </Popover>
                  </>
                )}
                <button type="button" className="btn btn--primary t-btn" onClick={() => navigate('/connect')}>
                  {'New Touchpoint + '}
                </button>
              </div>
            </div>

            <FilterChips
              chips={hidden.map((id) => ({ label: `${FILTERS.find((f) => f.id === id)!.label} hidden`, onRemove: () => toggle(id) }))}
              onClear={() => setHidden([])}
            />

            <Graph data={data} show={show} empty={empty} days={empty ? 28 : days} onOpenTouchpoint={(t) => setOpen({ kind: 'touchpoint', t })} />
          </section>

          <section className="card an-section">
            <button type="button" className="an-section__head" aria-expanded={keyOpen} onClick={() => toggleSection('key')}>
              <h2 className="t-h4 c-1">Key Metrics</h2>
              <Icon name="chevron-down" size={18} tint className={`an-arrow ${keyOpen ? 'is-open' : ''}`} />
            </button>
            {!keyOpen ? null : empty ? (
              <div className="empty-state" style={{ minHeight: 200 }}>
                <div className="empty-state__icon">
                  <Icon name="empty-plus-24" size={24} />
                </div>
                <p className="t-h4 c-1">No metrics yet</p>
                <p className="t-body-2 c-2">Connect Steam, Discord or a social account to start tracking.</p>
                <LinkButton label="Go to Connect" onClick={() => navigate('/connect')} />
              </div>
            ) : (
              <div className="m-grid m-grid--key">
                {metrics.map((m) => (
                  <MetricCard key={m.label} m={m} filtered={isFiltered(m.series)} />
                ))}
              </div>
            )}
            {keyOpen && <p className="t-body-2 c-3">Estimated from in-app reporting and UTM traffic.</p>}
          </section>

          {!empty &&
            sections(state, days).map((s) => {
              const isOpen = openSections.includes(s.id);
              return (
                <section key={s.id} className="card an-section">
                  <button
                    type="button"
                    className="an-section__head"
                    aria-expanded={isOpen}
                    onClick={() => toggleSection(s.id)}
                  >
                    <span className="an-title an-title--row">
                      <span className="m-card__swatch" style={{ background: s.color }} />
                      <span className="t-h4 c-1">{s.title}</span>
                      <span className="t-body c-2">{s.total}</span>
                    </span>
                    <Icon name="chevron-down" size={18} tint className={`an-arrow ${isOpen ? 'is-open' : ''}`} />
                  </button>
                  {isOpen && (
                    <>
                      <div className="m-grid">
                        {s.cards.map((m) => (
                          <MetricCard key={m.label} m={m} filtered={isFiltered(s.series)} />
                        ))}
                      </div>
                      <p className="t-body-2 c-3">Estimated from UTM traffic and the number gained each day.</p>
                    </>
                  )}
                </section>
              );
            })}
        </div>
      </main>

      {open?.kind === 'goal' && <GoalDialog key={open.goal.id} goal={open.goal} onClose={() => setOpen(null)} />}
      {open?.kind === 'milestone' && <MilestoneDialog key={open.milestone.id} milestone={open.milestone} onClose={() => setOpen(null)} />}
      {open?.kind === 'touchpoint' && <TouchpointDialog touchpoint={open.t} onClose={() => setOpen(null)} onEdit={() => navigate('/connect')} />}
    </AppLayout>
  );
}
