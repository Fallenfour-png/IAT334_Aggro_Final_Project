import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/shell/AppLayout';
import { useStore } from '../../state/store';
import type { Goal, Milestone } from '../../state/types';
import { ConversionCard, GoalsCard, MilestonesCard, TouchpointsCard } from './Cards';
import { GoalDialog } from './GoalDialog';
import { DashboardRange, ProjectHeader } from './HeaderSection';
import { KpiCarousel } from './KpiCarousel';
import { MilestoneDialog } from './MilestoneDialog';
import { TouchpointDialog } from './TouchpointDialog';
import { WelcomeSetup } from './WelcomeSetup';
import './home.css';

type Open =
  | { kind: 'goal'; goal?: Goal }
  | { kind: 'milestone'; milestone?: Milestone }
  | { kind: 'touchpoint'; id: string }
  | null;

export function HomePage() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  // Touchpoints are logged from Connect in this prototype stage (Figma: "Add Touchpoint" → Connect).
  const newTouchpoint = () => navigate('/connect');
  const setup = state.project?.setupDone === false;
  const connected = state.connections.some((c) => c.connected);
  const touchpoint = open?.kind === 'touchpoint' ? state.touchpoints.find((t) => t.id === open.id) : undefined;

  return (
    <AppLayout crumbs={[{ label: 'Home' }]}>
      <main className="page">
        {setup ? (
          <>
            <WelcomeSetup onAddGoal={() => setOpen({ kind: 'goal' })} />
            {/* While setting up, the range bar and KPIs appear once something is connected (Figma "empty start" → "All Set Up"). */}
            {connected && (
              <>
                <DashboardRange />
                <KpiCarousel />
              </>
            )}
          </>
        ) : (
          <>
            <ProjectHeader onOpenTouchpoint={(t) => setOpen({ kind: 'touchpoint', id: t.id })} />
            <DashboardRange />
            <KpiCarousel />
          </>
        )}
        {/* Figma Home (3726:60269): Goals | Upcoming Milestones, then Conversion Points | Touchpoint updates. */}
        <div className="dash-row">
          <GoalsCard onAdd={() => setOpen({ kind: 'goal' })} onOpen={(goal) => setOpen({ kind: 'goal', goal })} />
          <MilestonesCard onAdd={() => setOpen({ kind: 'milestone' })} onOpen={(milestone) => setOpen({ kind: 'milestone', milestone })} />
        </div>
        <div className="dash-row">
          <ConversionCard />
          <TouchpointsCard onAdd={newTouchpoint} onOpen={(t) => setOpen({ kind: 'touchpoint', id: t.id })} />
        </div>
      </main>

      {open?.kind === 'goal' && <GoalDialog key={open.goal?.id ?? 'new'} goal={open.goal} onClose={close} />}
      {open?.kind === 'milestone' && <MilestoneDialog key={open.milestone?.id ?? 'new'} milestone={open.milestone} onClose={close} />}
      {touchpoint && <TouchpointDialog touchpoint={touchpoint} onClose={close} />}
    </AppLayout>
  );
}
