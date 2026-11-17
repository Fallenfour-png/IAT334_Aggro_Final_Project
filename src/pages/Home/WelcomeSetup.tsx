import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../lib/icons';
import { newId, useStore } from '../../state/store';
import { withTestData } from '../../state/testData';
import type { AppState } from '../../state/types';
import '../Games/games.css';

/** Bell notification for the first data arriving. */
function notifyReady(s: AppState): AppState {
  const n = { id: newId('n'), title: `${s.project?.name ?? 'Your game'} is set up: your first week of data is in`, meta: 'Dashboard  •  Just now', icon: 'News' as const, unread: true };
  return { ...s, notifications: [n, ...s.notifications] };
}

/** Figma "empty start" / "… selection" frames: the checklist that replaces the project header until setup is finished. */
export function WelcomeSetup({ onAddGoal }: { onAddGoal: () => void }) {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const project = state.project!;
  const connected = state.connections.some((c) => c.connected);
  const hasGoal = state.goals.length > 0;
  const steps = [
    {
      key: 'connect',
      icon: 'ob-link',
      title: 'Connect Your Platform(s)',
      detail: 'Connect your platform to start tracking performance.',
      done: connected,
      action: connected ? 'Add Another' : 'New Touchpoint',
      onClick: () => navigate('/connect'),
    },
    {
      key: 'goal',
      icon: 'ob-target',
      title: 'Set Your First Goal',
      detail: 'Choose a metric, then set a target and deadline.',
      done: hasGoal,
      action: hasGoal ? 'Add Another Goal' : 'Add a Goal',
      onClick: onAddGoal,
    },
    {
      key: 'game',
      icon: 'ob-game',
      title: 'Add Your Game',
      detail: 'Enter your game’s name and upload an image to get started.',
      done: true,
      action: 'Edit Name',
      onClick: () => navigate('/settings?tab=projects'),
    },
  ];
  const complete = steps.filter((s) => s.done).length;

  return (
    <>
      <section className="welcome">
        <span className="welcome__tag">{project.name}</span>
        <h1 className="t-h1 c-1">
          Welcome <span className="welcome__wave">👋</span>
        </h1>
        <p className="welcome__sub">
          <span className="t-h3 c-1">Let’s get your dashboard ready!</span>
          <span className="t-h4">
            <span className="c-1">{complete} of 3</span> <span className="c-3">complete</span>
          </span>
        </p>
      </section>

      <div className="welcome-steps">
        {steps.map((s) => (
          <article key={s.key} className={`card welcome-step ${s.done ? 'is-done' : ''}`}>
            <span className="welcome-step__icon">
              <Icon name={s.icon} size={22} />
            </span>
            <p className="welcome-step__title">
              {s.title}
              {s.done && <Icon name="ob-check" size={19} />}
            </p>
            <p className="t-body welcome-step__detail">{s.detail}</p>
            <button type="button" className={`welcome-step__btn ${s.done ? 'is-outline' : ''}`} onClick={s.onClick}>
              {s.action}
              {!s.done && <Icon name="plus-white-16" size={16} tint />}
            </button>
          </article>
        ))}
      </div>

      {complete === 3 &&
        createPortal(
          <div className="scrim">
            <div className="ob-dialog ob-done" style={{ width: 759 }} role="dialog" aria-modal="true">
              <Icon name="ob-bigcheck" size={63} />
              <p className="t-h3" style={{ color: '#000' }}>
                All Set Up!
              </p>
              <p className="ob-done__sub">Congrats! {project.name} is now ready to go.</p>
              <button
                type="button"
                className="ob-btn ob-btn--primary ob-open"
                onClick={() =>
                  // Finishing setup fills the dashboard with test data for what was connected.
                  update(
                    (st) =>
                      withTestData({
                        ...notifyReady(st),
                        project: st.project && { ...st.project, setupDone: true },
                      }),
                    `${project.name} is ready`,
                  )
                }
              >
                Finish
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
