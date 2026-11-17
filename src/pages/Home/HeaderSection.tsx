import { useNavigate } from 'react-router-dom';
import { daysBetween, formatShort, TODAY } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { useStore } from '../../state/store';
import { DUE_WINDOWS, RANGES, type Touchpoint } from '../../state/types';
import { MenuOption, Popover } from '../../components/ui/Menu';

export function inRange(t: Touchpoint, rangeDays: number): boolean {
  return daysBetween(t.date, TODAY) <= rangeDays;
}

/**
 * Figma Home (3596:54257) "Project Header": one row with the game name, the campaign
 * progress pill, the range and due-in controls and "Switch Project" (→ Games screen).
 */
export function ProjectHeader() {
  const { state } = useStore();
  const navigate = useNavigate();
  const project = state.project!;
  const day = Math.max(1, daysBetween(project.campaignStart, TODAY) + 1);
  const total = Math.max(1, daysBetween(project.campaignStart, project.launch));
  const pct = Math.min(100, Math.max(0, (day / total) * 100));

  return (
    <section className="home-title">
      <h1 className="t-h2 c-1 nowrap">{project.name}</h1>
      <div className="campaign-pill t-body c-1">
        <span className="nowrap pre">{`Campaign  ·  Day ${Math.min(day, total)} of ${total}`}</span>
        <span className="campaign-pill__bar">
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="nowrap pre">{`Launch  •  ${formatShort(project.launch)}`}</span>
      </div>
      <RangeControls />
      <button type="button" className="btn btn--cancel t-btn switch-btn" onClick={() => navigate('/games')}>
        <Icon name="switch-18" size={18} tint />
        Switch Project
      </button>
    </section>
  );
}

/** "Showing data for" + "Goals and milestones due in" (Figma "Dashboard Range"). */
function RangeControls() {
  const { state, update } = useStore();
  return (
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
              Goals and Upcoming Milestones use the Due in control instead.
            </p>
          </>
        )}
      </Popover>
      <div className="divider-v" />
      <p className="t-body c-1 nowrap">Goals and milestones due in</p>
      <Popover
        menuClassName="menu menu--list range-menu"
        trigger={({ open, toggle }) => (
          <button type="button" className="range-btn" aria-expanded={open} onClick={toggle}>
            <Icon name="clock" size={16} tint />
            <span className="t-btn nowrap">{state.due}</span>
            <Icon name="chevron-down" size={16} tint />
          </button>
        )}
      >
        {(close) => (
          <>
            {DUE_WINDOWS.map((d) => (
              <MenuOption
                key={d}
                label={d}
                selected={state.due === d}
                onSelect={() => {
                  update((s) => ({ ...s, due: d }));
                  close();
                }}
              />
            ))}
            <div className="menu-divider" />
            <p className="t-body-2 c-3" style={{ width: 236 }}>
              Only changes Goals and Upcoming Milestones.
            </p>
          </>
        )}
      </Popover>
    </div>
  );
}

/** Range bar on its own, used under the Welcome checklist once something is connected. */
export function DashboardRange() {
  const { state } = useStore();
  const anyConnected = state.connections.some((c) => c.connected);
  return (
    <section className="dashboard-range">
      <RangeControls />
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
