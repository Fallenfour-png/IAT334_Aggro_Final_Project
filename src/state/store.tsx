import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_KPIS, EVENTS, FUNDS, demoState, freshState } from './seeds';
import { withGame, withNewGame } from './games';
import { withTestData } from './testData';
import { formatShort } from '../lib/dates';
import { RANGES, type AppState, type Connection, type ConnectionId, type Member, type Workspace, type EventItem, type Fund, type Goal, type Milestone, type Notification, type Touchpoint } from './types';

const STORAGE_KEY = 'hollow-signal-state-v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 2) {
        if (!RANGES.includes(parsed.range)) parsed.range = 'Last 7 days';
        return withNewCatalog(withNewKpis(parsed));
      }
    }
  } catch {
    // ignore unreadable storage and fall back to the demo data
  }
  return demoState();
}

/** Data saved before the new Home KPI cards (views, Instagram) gets them, in Figma's order. */
function withNewKpis(s: AppState): AppState {
  const fix = (w: Workspace): Workspace => {
    if (DEMO_KPIS.every((d) => w.kpis.some((k) => k.id === d.id))) return w;
    const kpis = DEMO_KPIS.map((d) => {
      const had = w.kpis.find((k) => k.id === d.id);
      if (had) return { ...had, compact: d.compact };
      return w.seed === 'demo' ? d : { ...d, value: 0, delta7: 0, note: undefined };
    });
    const connections =
      w.seed === 'demo' ? w.connections.map((c) => (c.id === 'instagram' ? { ...c, connected: true } : c)) : w.connections;
    return { ...w, kpis, connections };
  };
  return { ...s, ...fix(s), otherGames: s.otherGames?.map(fix) };
}

/** Saved data gets funds/events added to the catalog later (not listed or saved; find them via Find). */
function withNewCatalog(s: AppState): AppState {
  const fix = (w: Workspace): Workspace => {
    const evIds = new Set(w.events.map((e) => e.id));
    const fdIds = new Set(w.funds.map((f) => f.id));
    const events = EVENTS.filter((e) => !evIds.has(e.id)).map((e) => ({ ...e, saved: false, listed: false }));
    const funds = FUNDS.filter((f) => !fdIds.has(f.id)).map((f) => ({ ...f, saved: false, listed: false }));
    if (!events.length && !funds.length) return w;
    return { ...w, events: [...w.events, ...events], funds: [...w.funds, ...funds] };
  };
  return { ...s, ...fix(s), otherGames: s.otherGames?.map(fix) };
}

export type ToastKind =
  | 'Goal updated'
  | 'Goal removed'
  | 'Goal added'
  | 'Milestone saved'
  | 'Milestone deleted'
  | 'Milestone added';

/** Toasts that offer Undo in the Figma component. */
const UNDOABLE: ToastKind[] = ['Goal updated', 'Goal removed', 'Milestone saved', 'Milestone deleted'];

interface Toast {
  id: number;
  label: ToastKind | string;
  undo?: AppState;
}

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState, toast?: ToastKind | string) => void;
  toast: Toast | null;
  undoToast: () => void;
  dismissToast: () => void;
  reset: (seed: 'demo' | 'fresh') => void;
  // convenience actions
  saveGoal: (goal: Goal, isNew: boolean) => void;
  removeGoal: (id: string) => void;
  saveMilestone: (m: Milestone, isNew: boolean) => void;
  removeMilestone: (id: string) => void;
  saveTouchpoint: (t: Touchpoint) => void;
  setFund: (id: string, patch: Partial<Fund>, toast?: string) => void;
  setEvent: (id: string, patch: Partial<EventItem>, toast?: string) => void;
  setConnection: (id: ConnectionId, patch: Partial<Connection>, toast?: string, notice?: { title: string; meta: string }) => void;
  /** "Add a game" → Next: the new game becomes the open one. */
  createGame: (game: { name: string; coverImage?: string; team: Member[] }) => void;
  /** Open one of `otherGames`. */
  switchGame: (index: number) => void;
}

/** Adds an unread notification to the top of the bell panel. */
function notify(s: AppState, title: string, meta: string, icon: Notification['icon']): AppState {
  return { ...s, notifications: [{ id: newId('n'), title, meta, icon, unread: true }, ...s.notifications] };
}

const StoreContext = createContext<Store | null>(null);

let nextToastId = 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<Toast | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode); the app still works in memory
    }
  }, [state]);

  // Figma: "Auto-dismisses after 4 seconds."
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const update = useCallback((fn: (s: AppState) => AppState, label?: ToastKind | string) => {
    const before = stateRef.current;
    setState(fn(before));
    if (label) {
      setToast({ id: nextToastId++, label, undo: UNDOABLE.includes(label as ToastKind) || /removed|deleted/i.test(label) ? before : undefined });
    }
  }, []);

  const undoToast = useCallback(() => {
    setToast((t) => {
      if (t?.undo) setState(t.undo);
      return null;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      state,
      update,
      toast,
      undoToast,
      dismissToast: () => setToast(null),
      reset: (seed) => {
        setState(seed === 'demo' ? demoState() : freshState());
        setToast(null);
      },
      saveGoal: (goal, isNew) =>
        update(
          (s) =>
            isNew
              ? notify({ ...s, goals: [...s.goals, goal] }, `New goal: ${goal.title}`, `Goal  •  Due ${formatShort(goal.due)}  •  Just now`, 'News')
              : { ...s, goals: s.goals.map((g) => (g.id === goal.id ? goal : g)) },
          isNew ? 'Goal added' : 'Goal updated',
        ),
      removeGoal: (id) => update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }), 'Goal removed'),
      saveMilestone: (m, isNew) =>
        update(
          (s) =>
            isNew
              ? notify({ ...s, milestones: [...s.milestones, m] }, `${m.title} is due ${formatShort(m.date)}`, `Milestone  •  ${formatShort(m.date)}  •  Just now`, 'Event')
              : { ...s, milestones: s.milestones.map((x) => (x.id === m.id ? m : x)) },
          isNew ? 'Milestone added' : 'Milestone saved',
        ),
      removeMilestone: (id) =>
        update((s) => ({ ...s, milestones: s.milestones.filter((m) => m.id !== id) }), 'Milestone deleted'),
      setFund: (id, patch, label) =>
        update((s) => {
          const fund = s.funds.find((f) => f.id === id);
          const next = { ...s, funds: s.funds.map((f) => (f.id === id ? { ...f, ...patch } : f)) };
          return fund && patch.saved && !fund.saved
            ? notify(next, `${fund.title} added to your calendar`, `Fund  •  Deadline ${formatShort(fund.deadline)}  •  Just now`, 'Event')
            : next;
        }, label),
      setEvent: (id, patch, label) =>
        update((s) => {
          const ev = s.events.find((e) => e.id === id);
          const next = { ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
          return ev && patch.saved && !ev.saved
            ? notify(next, `${ev.name} added to your calendar`, `Event  •  ${formatShort(ev.start)}  •  Just now`, 'Event')
            : next;
        }, label),
      setConnection: (id, patch, label, notice) =>
        update((s) => {
          const exists = s.connections.some((c) => c.id === id);
          const connections = exists
            ? s.connections.map((c) => (c.id === id ? { ...c, ...patch } : c))
            : [...s.connections, { id, connected: false, ...patch }];
          let next = { ...s, connections };
          // After onboarding, a newly connected app gets test data right away (the demo game keeps its own figures).
          if (patch.connected && next.seed !== 'demo' && next.project?.setupDone !== false) next = withTestData(next);
          return notice ? notify(next, notice.title, notice.meta, 'Storefront') : next;
        }, label),
      createGame: (game) =>
        update((s) => notify(withNewGame(s, game), `${game.name} was created`, `Game  •  ${game.team.length ? `${game.team.length} invited  •  ` : ''}Just now`, 'Event')),
      switchGame: (index) => update((s) => withGame(s, index)),
      saveTouchpoint: (t) =>
        update((s) => {
          const exists = s.touchpoints.some((x) => x.id === t.id);
          return { ...s, touchpoints: exists ? s.touchpoints.map((x) => (x.id === t.id ? t : x)) : [t, ...s.touchpoints] };
        }),
    }),
    [state, toast, update, undoToast],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
