export const GOAL_TYPES = [
  'Steam wishlists',
  'Discord members',
  'Patreon members',
  'Press features',
  'Short-form videos',
  'Newsletter subscribers',
  'Custom',
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

/** Goal types that update on their own from a connected account. */
export const AUTO_GOAL_SOURCE: Partial<Record<GoalType, ConnectionId>> = {
  'Steam wishlists': 'steam',
  'Discord members': 'discord',
  'Patreon members': 'patreon',
};

export type GoalCategory = 'Wishlists' | 'Community' | 'Press' | 'Content' | 'Revenue';
export const GOAL_CATEGORY: Record<GoalType, GoalCategory> = {
  'Steam wishlists': 'Wishlists',
  'Discord members': 'Community',
  'Patreon members': 'Revenue',
  'Press features': 'Press',
  'Short-form videos': 'Content',
  'Newsletter subscribers': 'Community',
  Custom: 'Content',
};

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  current: number;
  target: number;
  due: string;
  completedAt?: string;
}

export type GoalStatus = 'On track' | 'Behind' | 'Completed' | 'Not started';

export const MILESTONE_TYPES = ['Deliverable', 'Content', 'Event', 'Fund', 'Press', 'Revenue'] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export interface MilestoneGoal {
  metric: GoalType;
  target: number;
}

export interface Milestone {
  id: string;
  title: string;
  type: MilestoneType;
  channel: string;
  date: string;
  eventId?: string;
  goals: MilestoneGoal[];
}

export type TouchpointKind = 'Short-form' | 'Press' | 'Storefront' | 'Community' | 'Devlog' | 'Event';
export type TouchpointThumb = 'video' | 'press' | 'storefront' | 'community' | 'megaphone';

export interface Touchpoint {
  id: string;
  kind: TouchpointKind;
  platform: string;
  title: string;
  stats: string;
  date: string;
  hoursAgo?: number;
  thumb: TouchpointThumb;
  wishlists: number;
  caption?: string;
  analytics?: { label: string; value: string; delta?: string }[];
  contributes?: { goalId: string; amount: number }[];
  link?: string;
}

export type ConnectionId =
  | 'steam'
  | 'discord'
  | 'patreon'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'itch'
  | 'newsletter';

/** Values saved from a Connect "Edit" overlay: toggles, single picks and multi picks. */
export type ConnectionSettings = Record<string, boolean | string | string[]>;

export interface Connection {
  id: ConnectionId;
  connected: boolean;
  /** Last sign-in was cancelled (Figma card state "Failed to connect. Please try again."). */
  failed?: boolean;
  settings?: ConnectionSettings;
}

export interface Kpi {
  id: string;
  label: string;
  icon: string;
  source: ConnectionId | 'touchpoints' | 'press';
  value: number;
  delta7: number;
  note?: string;
  updated: string;
  spark: string;
  /** Large view counts read as 24.6K / +9.4K (Figma Home KPI cards). */
  compact?: boolean;
}

export interface EventItem {
  id: string;
  name: string;
  where: string;
  /** Short line used in the milestone event picker. */
  when: string;
  start: string;
  end?: string;
  kind: string;
  line1: string;
  audience: string;
  about: string;
  /** Bookmarked = shown on the Plan calendar. */
  saved: boolean;
  /** Shown in "Upcoming Events" on Plan. */
  listed: boolean;
  recommended?: boolean;
  /** Official page opened by "See more". */
  url?: string;
}

export interface Fund {
  id: string;
  org: string;
  name: string;
  title: string;
  deadline: string;
  amount: string;
  line2: string;
  who: string;
  about: string;
  /** Bookmarked = shown on the Plan calendar. */
  saved: boolean;
  /** Shown in "Upcoming Funds" on Plan. */
  listed: boolean;
  /** Official page opened by "See more". */
  url?: string;
}

export interface Notification {
  id: string;
  title: string;
  meta: string;
  icon: 'Shorts' | 'Event' | 'News' | 'Storefront';
  unread: boolean;
}

export interface Project {
  name: string;
  tagline: string;
  tags: string[];
  campaignStart: string;
  launch: string;
  coverTop: string;
  coverBottom: string;
  /** Uploaded cover (data URL), shown instead of the drawn Hollow Signal cover. */
  coverImage?: string;
  /** Plain gradient cover for games without art (e.g. Project Fraser). */
  coverGradient?: [string, string];
  /** false while the Home "Welcome, let's get your dashboard ready" checklist is showing. */
  setupDone?: boolean;
  /** People invited from "Add a game" → "Invite People" (the owner is the account). */
  team?: Member[];
}

export interface Member {
  name: string;
  email: string;
  role: 'Can View' | 'Can Edit';
}

/** Settings → Account. Passwords are never stored in the prototype. */
export interface Account {
  username: string;
  email: string;
  phone?: string;
  /** Uploaded profile picture (data URL); the avatar shows initials without one. */
  avatar?: string;
  /** When the 2FA phone number was last verified, e.g. "Jul 30, 2026 at 3:54 AM". */
  verified?: string;
  /** Settings → Notifications toggles. */
  notify: Record<string, boolean>;
}

export const RANGES = ['Last 7 days', 'Last 2 weeks', 'Last 30 days', 'Since campaign start'] as const;
export type Range = (typeof RANGES)[number];

export const DUE_WINDOWS = ['Next week', 'Next 2 weeks', 'Next month', 'Next 3 months', 'All time'] as const;
export type DueWindow = (typeof DUE_WINDOWS)[number];

export interface AppState {
  version: 2;
  seed: 'demo' | 'fresh';
  project: Project | null;
  /** Optional so data saved before Settings existed still loads (see `accountOf`). */
  account?: Account;
  goals: Goal[];
  milestones: Milestone[];
  touchpoints: Touchpoint[];
  connections: Connection[];
  kpis: Kpi[];
  events: EventItem[];
  funds: Fund[];
  notifications: Notification[];
  range: Range;
  due: DueWindow;
  /** Weekly conversion funnel (Home "Conversion Points", Analytics traffic). Hollow Signal's figures when unset. */
  funnel?: Funnel;
  /** The user's other games, each a complete saved workspace (Games screen, Settings → Other Projects). */
  otherGames?: Workspace[];
}

export interface Funnel {
  impressions: number;
  clicks: number;
  wishlists: number;
  merch: number;
}

/** One game's data. The account is shared by every game. */
export type Workspace = Omit<AppState, 'otherGames' | 'account'>;
