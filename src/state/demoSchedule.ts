import { DEMO_DATE_UPDATES } from './demoDateUpdates';
import { demoState } from './seeds';
import type { AppState, Workspace } from './types';

/** Refresh unchanged built-in dates once, preserving added items and edited dates. */
export function withCurrentDemoSchedule(state: AppState): AppState {
  const demo = demoState();
  const templates: Workspace[] = [demo, ...(demo.otherGames ?? [])];

  const refresh = (workspace: Workspace): Workspace => {
    if (workspace.demoScheduleVersion === 2) return workspace;
    const template = templates.find((sample) => sample.project?.name === workspace.project?.name);
    if (!template) return { ...workspace, demoScheduleVersion: 2 };
    const dateUpdates: Record<string, readonly string[]> = workspace.demoScheduleVersion === 1
      ? { '2027-01-05': ['2026-12-28'], '2027-01-08': ['2026-12-31'] }
      : DEMO_DATE_UPDATES;

    const dates = <T extends object>(item: T, sample: T): T => {
      const patch: Record<string, string> = {};
      for (const [key, oldValue] of Object.entries(item)) {
        const nextValue = sample[key as keyof T];
        if (typeof oldValue === 'string' && typeof nextValue === 'string' && dateUpdates[oldValue]?.includes(nextValue)) {
          patch[key] = nextValue;
        }
      }
      return { ...item, ...patch };
    };
    const items = <T extends { id: string }>(saved: T[], samples: T[]): T[] =>
      saved.map((item) => {
        const sample = samples.find((candidate) => candidate.id === item.id);
        return sample ? dates(item, sample) : item;
      });

    return {
      ...workspace,
      demoScheduleVersion: 2,
      project: workspace.project && template.project ? dates(workspace.project, template.project) : workspace.project,
      goals: items(workspace.goals, template.goals),
      milestones: items(workspace.milestones, template.milestones),
      touchpoints: items(workspace.touchpoints, template.touchpoints),
      funds: items(workspace.funds, template.funds),
      events: items(workspace.events, template.events).map((event) => {
        const sample = template.events.find((candidate) => candidate.id === event.id);
        const previous = workspace.events.find((candidate) => candidate.id === event.id);
        return sample && previous && event.start !== previous.start ? { ...event, when: sample.when } : event;
      }),
      notifications: workspace.notifications.map((notice) =>
        notice.id === 'n2' && notice.title === 'Steam Next Fest demo submission is due in 6 days'
          ? { ...notice, title: 'Steam Next Fest demo submission is due in 2 days', meta: 'Milestone  •  Nov 27' }
          : notice,
      ),
    };
  };

  return { ...state, ...refresh(state), otherGames: state.otherGames?.map(refresh) };
}
