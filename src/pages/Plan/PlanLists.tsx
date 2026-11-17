import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daysFromToday, formatNumber } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { goalPercent } from '../../state/selectors';
import { useStore } from '../../state/store';
import type { Milestone, MilestoneType } from '../../state/types';
import { FilterButton, FilterChips, MenuOption, Popover } from '../../components/ui/Menu';
import { MilestoneRow, TouchpointRow } from '../Home/Cards';
import { MetricTile, touchpointMetrics } from '../Home/TouchpointDialog';
import { metricCurrent } from './planData';

const PRETTY: Record<string, string> = {
  'Steam wishlists': 'Steam Wishlists',
  'Discord members': 'Discord Members',
  'Patreon members': 'Patreon Members',
  'Press features': 'Press Features',
  'Short-form videos': 'Short-form Videos',
  'Newsletter subscribers': 'Newsletter Subscribers',
  Custom: 'Custom',
};

const MS_TYPES: ('All types' | MilestoneType)[] = ['All types', 'Deliverable', 'Content', 'Event', 'Fund', 'Press', 'Revenue'];

function EmptyBlock({ icon, title, lines, action }: { icon: string; title: string; lines: string[]; action?: React.ReactNode }) {
  return (
    <div className="empty-state plan-empty-list">
      <div className="empty-state__icon">
        <Icon name={icon} size={24} />
      </div>
      <p className="t-h4 c-1">{title}</p>
      <p className="t-body-2 c-2">
        {lines.map((l, i) => (
          <span key={l}>
            {l}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
      {action}
    </div>
  );
}

export function PlanMilestones({
  expanded,
  onExpand,
  onAdd,
  onEdit,
}: {
  expanded: string | null;
  onExpand: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (m: Milestone) => void;
}) {
  const { state } = useStore();
  const [type, setType] = useState<(typeof MS_TYPES)[number]>('All types');
  const list = state.milestones
    .filter((m) => daysFromToday(m.date) >= 0)
    .filter((m) => type === 'All types' || m.type === type)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="card" style={{ minHeight: 564 }}>
      <div className="card-header">
        <h2 className="t-h3" style={{ color: '#000' }}>
          Milestones
        </h2>
        <div className="card-actions">
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
                  <p className="t-body-2 c-3">{type === 'All types' ? 'All types' : '1 selected'}</p>
                </div>
              </>
            )}
          </Popover>
          <button type="button" className="btn btn--primary t-btn" onClick={onAdd}>
            {state.milestones.length ? 'Add + ' : '+ Add'}
          </button>
        </div>
      </div>

      <FilterChips
        chips={type !== 'All types' ? [{ label: type, onRemove: () => setType('All types') }] : []}
        onClear={() => setType('All types')}
      />

      {state.milestones.length === 0 ? (
        <EmptyBlock
          icon="empty-calendar-24"
          title="No milestones yet"
          lines={['Add deadlines, events and funds', 'you’re working toward.']}
          action={
            <button type="button" className="cta" style={{ width: 'auto' }} onClick={onAdd}>
              <span className="t-body">Add a milestone</span>
              <Icon name="plus-white" size={20} tint />
            </button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyBlock
          icon="search-16"
          title="No milestones match this filter"
          lines={[`No ${type.toLowerCase()} milestones are coming up.`, 'Try another type or clear the filter.']}
          action={
            <button type="button" className="btn btn--link t-btn" onClick={() => setType('All types')}>
              Clear filter
              <Icon name="arrow-right-18" size={18} />
            </button>
          }
        />
      ) : (
        <div className="plan-list">
          {list.map((m) => {
            const open = expanded === m.id;
            return (
              <div key={m.id}>
                <MilestoneRow
                  m={m}
                  className={`milestone-row--plan ${open ? 'expand-head' : ''}`}
                  onOpen={() => onExpand(open ? null : m.id)}
                  trailing={<Icon name="chev-right" size={20} tint className={`row-chev ${open ? 'rotate-90' : ''}`} />}
                />
                {open && (
                  <div className="expand-body">
                    <p className="expand-label">GOALS</p>
                    {m.goals.length === 0 ? (
                      <p className="t-body-2 c-2">No goals linked to this milestone yet.</p>
                    ) : (
                      <div className="expand-goals">
                        {m.goals.map((g, i) => {
                          const current = metricCurrent(state, g);
                          return (
                            <div className="expand-goal" key={`${g.metric}-${i}`}>
                              <div className="expand-goal__body">
                                <div className="expand-goal__top">
                                  <span className="t-body-2">{PRETTY[g.metric]}</span>
                                  <span className="expand-goal__value">
                                    {formatNumber(current)}/{formatNumber(g.target)}
                                  </span>
                                </div>
                                <div className="expand-bar">
                                  <span style={{ width: `${goalPercent(current, g.target)}%` }} />
                                </div>
                              </div>
                              <button type="button" className="icon-btn" aria-label="Edit goal" onClick={() => onEdit(m)}>
                                <Icon name="edit-sm" size={16} tint />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="expand-actions">
                      <button type="button" className="btn edit-ms-small" onClick={() => onEdit(m)}>
                        Edit milestone
                        <Icon name="edit-sm" size={16} tint />
                      </button>
                      <button type="button" className="btn btn--primary t-btn" onClick={() => onEdit(m)}>
                        Add Goals
                        <Icon name="plus-white-16" size={16} tint />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const TP_TYPES = ['All types', 'Short-form', 'Press', 'Storefront', 'Event'] as const;
const TP_PLATFORMS = ['All platforms', 'TikTok', 'Instagram', 'YouTube', 'Steam'] as const;

export function PlanTouchpoints() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [type, setType] = useState<(typeof TP_TYPES)[number]>('All types');
  const [platform, setPlatform] = useState<(typeof TP_PLATFORMS)[number]>('All platforms');
  const toConnect = () => navigate('/connect');
  const list = state.touchpoints
    .filter((t) => type === 'All types' || t.kind === type)
    .filter((t) => platform === 'All platforms' || t.platform === platform)
    .sort((a, b) => b.date.localeCompare(a.date) || (a.hoursAgo ?? 24) - (b.hoursAgo ?? 24));

  return (
    <section className="card" style={{ minHeight: 564 }}>
      <div className="card-header">
        <h2 className="t-h3" style={{ color: '#000' }}>
          Touchpoint updates
        </h2>
        <div className="card-actions">
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
                  <p className="t-body-2 c-3">Showing every touchpoint</p>
                </div>
              </>
            )}
          </Popover>
          <button type="button" className="btn btn--primary t-btn" onClick={toConnect}>
            {state.touchpoints.length ? 'Add Touchpoint + ' : '+ Add'}
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
        <EmptyBlock
          icon="empty-plus-24"
          title="Log your first touchpoint"
          lines={['Add a post, press piece or store update', 'to start seeing what drives wishlists.']}
          action={
            <button type="button" className="cta" style={{ width: 'auto' }} onClick={toConnect}>
              <span className="t-body">New Touchpoint</span>
              <Icon name="plus-white" size={20} tint />
            </button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyBlock
          icon="search-16"
          title="No touchpoints match this filter"
          lines={['Nothing matches these filters.', 'Try another type or platform, or clear the filter.']}
          action={
            <button
              type="button"
              className="btn btn--link t-btn"
              onClick={() => {
                setType('All types');
                setPlatform('All platforms');
              }}
            >
              Clear filter
              <Icon name="arrow-right-18" size={18} />
            </button>
          }
        />
      ) : (
        <div className="plan-list">
          {list.map((t) => {
            const open = expanded === t.id;
            return (
              <div key={t.id}>
                <TouchpointRow
                  t={t}
                  className={open ? 'expand-head' : ''}
                  onOpen={() => setExpanded(open ? null : t.id)}
                  trailing={<Icon name="chev-right" size={20} tint className={`row-chev ${open ? 'rotate-90' : ''}`} />}
                />
                {open && (
                  <div className="expand-body">
                    <div className="tp-expand-head">
                      <p className="expand-label" style={{ paddingTop: 0 }}>
                        ANALYTICS
                      </p>
                      <button type="button" className="edit-tp-btn has-tip" aria-label="Edit touchpoint" onClick={toConnect}>
                        <Icon name="edit-14" size={16} tint />
                        <span className="tip">Edit Touchpoint</span>
                      </button>
                    </div>
                    <div className="tp-metrics">
                      {touchpointMetrics(t).map((m) => (
                        <MetricTile key={m.label + m.value} m={m} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
