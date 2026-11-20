import { useState } from 'react';
import { parseDate, TODAY } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { AppLayout } from '../../components/shell/AppLayout';
import { useStore } from '../../state/store';
import type { Goal, Milestone } from '../../state/types';
import { GoalDialog } from '../Home/GoalDialog';
import { MilestoneDialog } from '../Home/MilestoneDialog';
import { CalendarCard, MilestoneHero } from './HeroAndCalendar';
import { EventsSection, FindDialog, FundsSection, OppDetailsDialog, type Opp } from './Opportunities';
import { nextMilestone, type CalItem } from './planData';
import { PlanMilestones, PlanTouchpoints } from './PlanLists';
import '../Home/home.css';
import './plan.css';

type Open =
  | { kind: 'milestone'; milestone?: Milestone; date?: string }
  | { kind: 'goal'; goal?: Goal; date?: string }
  | { kind: 'opp'; opp: Opp }
  | { kind: 'find'; what: 'fund' | 'event'; date?: string }
  | null;

export function PlanPage() {
  const { state } = useStore();
  const today = parseDate(TODAY);
  const [view, setView] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const upcoming = nextMilestone(state);

  /** "Date link to Calendar": jump the calendar to that day and highlight it. */
  const showOnCalendar = (iso: string) => {
    const d = parseDate(iso);
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setSelected([iso]);
    requestAnimationFrame(() => {
      document.getElementById('plan-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openItem = (item: CalItem) => {
    if (item.kind === 'milestone') {
      const m = state.milestones.find((x) => x.id === item.refId);
      if (m) setOpen({ kind: 'milestone', milestone: m });
    } else if (item.kind === 'goal') {
      const g = state.goals.find((x) => x.id === item.refId);
      if (g) setOpen({ kind: 'goal', goal: g });
    } else {
      setOpen({ kind: 'opp', opp: { kind: item.kind, id: item.refId } });
    }
  };

  return (
    <AppLayout crumbs={[{ label: 'Home', to: '/' }, { label: 'Plan' }]}>
      <main className="page">
        <div className="plan-title-row">
          <h1 className="t-h2" style={{ color: '#000' }}>
            Upcoming Milestone
          </h1>
          {upcoming && (
            <button type="button" className="btn btn--outline t-btn edit-ms-btn" onClick={() => setOpen({ kind: 'milestone', milestone: upcoming })}>
              Edit Milestone
              <Icon name="edit-14" size={14} tint />
            </button>
          )}
        </div>

        <MilestoneHero milestone={upcoming} onPickDate={showOnCalendar} onAddMilestone={() => setOpen({ kind: 'milestone' })} />

        <div className="plan-grid">
          <CalendarCard
            selected={selected}
            onSelect={setSelected}
            view={view}
            onView={setView}
            onOpenItem={openItem}
            onAdd={(kind, date) => {
              if (kind === 'milestone') setOpen({ kind: 'milestone', date });
              else if (kind === 'goal') setOpen({ kind: 'goal', date });
              else setOpen({ kind: 'find', what: kind, date });
            }}
          />
          <div className="plan-side">
            <FundsSection onOpen={(opp) => setOpen({ kind: 'opp', opp })} onFind={() => setOpen({ kind: 'find', what: 'fund' })} />
            <EventsSection onOpen={(opp) => setOpen({ kind: 'opp', opp })} onFind={() => setOpen({ kind: 'find', what: 'event' })} />
          </div>
        </div>

        <div className="dash-row">
          <PlanMilestones
            expanded={expanded}
            onExpand={setExpanded}
            onAdd={() => setOpen({ kind: 'milestone' })}
            onEdit={(milestone) => setOpen({ kind: 'milestone', milestone })}
          />
          <PlanTouchpoints />
        </div>
      </main>

      {open?.kind === 'milestone' && (
        <MilestoneDialog key={open.milestone?.id ?? `new-${open.date ?? ''}`} milestone={open.milestone} defaultDate={open.date} onClose={close} />
      )}
      {open?.kind === 'goal' && <GoalDialog key={open.goal?.id ?? `new-${open.date ?? ''}`} goal={open.goal} defaultDate={open.date} onClose={close} />}
      {open?.kind === 'opp' && <OppDetailsDialog opp={open.opp} onClose={close} />}
      {open?.kind === 'find' && <FindDialog kind={open.what} date={open.date} onClose={close} />}
    </AppLayout>
  );
}
