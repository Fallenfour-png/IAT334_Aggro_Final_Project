import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatShort } from '../../lib/dates';
import { Icon, iconUrl } from '../../lib/icons';
import { GameThumb } from '../../components/ui/GameCover';
import { accountOf, initials } from '../../state/selectors';
import type { Project } from '../../state/types';
import { AddGameFlow } from './AddGameFlow';
import { useStore } from '../../state/store';
import { MenuOption, Popover } from '../../components/ui/Menu';
import './games.css';

const OWNERSHIP = ['Owned by Me', 'Shared with Me', 'All games'] as const;

/** Figma "setup home": the start of onboarding (Settings → Projects → New Project opens it with the wizard). */
export function GamesPage() {
  const { state, switchGame } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const adding = params.get('new') === '1';
  const [owner, setOwner] = useState<(typeof OWNERSHIP)[number]>('Owned by Me');
  const showOwned = owner !== 'Shared with Me';
  const account = accountOf(state);
  const games: { project: Project; index: number | null }[] = [
    ...(state.project ? [{ project: state.project, index: null }] : []),
    ...(state.otherGames ?? []).flatMap((w, i) => (w.project ? [{ project: w.project, index: i }] : [])),
  ];
  /** Opening another game swaps it in first, so every page shows that game. */
  const open = (index: number | null, to: string) => {
    if (index !== null) switchGame(index);
    navigate(to);
  };
  const startNew = () => setParams({ new: '1' });

  const links = [
    { label: 'Dashboard', to: '/' },
    { label: 'Planning', to: '/plan' },
    { label: 'Analytics', to: '/analytics' },
    { label: 'Connections', to: '/connect' },
  ];

  return (
    <div className="games-screen">
      <header className="topbar topbar--plain">
        <p className="t-body c-1">Aggro.</p>
        <div className="topbar-actions">
          <span className="bell">
            <img src={iconUrl('topbar-notifications')} alt="" />
          </span>
          <Link to="/settings" className="avatar" aria-label="Account settings">
            {account.avatar ? <img className="avatar__img" src={account.avatar} alt="" /> : initials(account.username)}
          </Link>
        </div>
      </header>

      <section className="games-hero">
        <div className="games-container games-hero__inner">
          <div className="games-hero__text">
            <h1 className="t-h2" style={{ color: '#000' }}>
              Games
            </h1>
            <p className="games-hero__sub c-2">Manage your games or add a new one.</p>
          </div>
          <button type="button" className="cta games-new" onClick={startNew}>
            <span className="t-body">New Game</span>
            <Icon name="plus-white" size={20} />
          </button>
        </div>
      </section>

      <section className="games-list">
        <div className="games-container">
          <div className="games-list__head">
            <h2 className="t-h4 c-2">Recent Games</h2>
            <Popover
              menuClassName="menu menu--list games-owner-menu"
              trigger={({ open, toggle }) => (
                <button type="button" className="owner-btn" aria-expanded={open} onClick={toggle}>
                  <span className="t-body c-2">{owner}</span>
                  <Icon name="chevron-down-sm" size={12} />
                </button>
              )}
            >
              {(close) =>
                OWNERSHIP.map((o) => (
                  <MenuOption
                    key={o}
                    label={o}
                    selected={owner === o}
                    onSelect={() => {
                      setOwner(o);
                      close();
                    }}
                  />
                ))
              }
            </Popover>
          </div>

          <div className="games-grid">
            {showOwned &&
              games.map(({ project, index }) => (
                <article key={`${project.name}-${index ?? 'current'}`} className="game-card">
                  <button type="button" className="game-card__head" onClick={() => open(index, '/')}>
                    <GameThumb project={project} size={[91, 90]} />
                    <span className="game-card__title">
                      <span className="game-card__name">{project.name}</span>
                      <span className="t-body pre game-card__launch">{`Launch  •  ${formatShort(project.launch)}`}</span>
                    </span>
                  </button>
                  <div className="game-card__links">
                    {links.map((l) => (
                      <button key={l.label} type="button" className="game-card__link t-btn" onClick={() => open(index, l.to)}>
                        {l.label}
                        <Icon name="arrow-right-18-white" size={18} />
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            {owner === 'Shared with Me' && <p className="t-body-2 c-3 games-none">No games have been shared with you yet.</p>}
            <article className="add-game">
              <div className="add-game__inner">
                <p className="add-game__title">+ Add a game</p>
                <p className="add-game__sub c-3">Create a dashboard for a new game here</p>
                <button type="button" className="btn btn--link t-btn" onClick={startNew}>
                  New Game
                  <Icon name="arrow-right-18" size={18} />
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {adding && (
        <AddGameFlow
          onClose={() => setParams({})}
          onOpen={() => navigate('/')}
        />
      )}
    </div>
  );
}
