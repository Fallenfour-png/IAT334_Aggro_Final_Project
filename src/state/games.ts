import { addDays, TODAY } from '../lib/dates';
import { freshState } from './seeds';
import type { AppState, Member, Workspace } from './types';

/** The current game's data without the account or the list of other games. */
export function workspaceOf(s: AppState): Workspace {
  const { otherGames: _others, account: _account, ...w } = s;
  return w;
}

/** "Add a game" → Next: park the current game and start a new, empty one that opens on the Welcome checklist. */
export function withNewGame(s: AppState, game: { name: string; coverImage?: string; team: Member[] }): AppState {
  const [top, ...rest] = game.name.toUpperCase().split(/\s+/);
  const fresh = freshState();
  return {
    ...fresh,
    project: {
      name: game.name,
      tagline: 'New marketing campaign',
      tags: ['Setup'],
      campaignStart: TODAY,
      launch: addDays(TODAY, 120),
      coverTop: top,
      coverBottom: rest.join(' '),
      coverImage: game.coverImage,
      setupDone: false,
      team: game.team,
    },
    account: s.account,
    otherGames: [...(s.otherGames ?? []), ...(s.project ? [workspaceOf(s)] : [])],
  };
}

/** "Switch Projects" / a Games card: open another game, keeping the list order. */
export function withGame(s: AppState, index: number): AppState {
  const others = [...(s.otherGames ?? [])];
  const [target] = others.splice(index, 1, workspaceOf(s));
  return target ? { ...target, account: s.account, otherGames: others } : s;
}
