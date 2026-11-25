import type { ConnectionId, ConnectionSettings } from '../../state/types';
import discordLogo from '../../assets/logos/discord.png';
import itchLogo from '../../assets/logos/itch.png';
import steamLogo from '../../assets/logos/steam.png';
import tiktokLogo from '../../assets/logos/tiktok.png';
import youtubeLogo from '../../assets/logos/youtube.png';

/** Figma "Connections Filter menu": None (All types) / Content / Storefront / Community. */
export const APP_TYPES = ['All types', 'Content', 'Storefront', 'Community'] as const;
export type AppTypeFilter = (typeof APP_TYPES)[number];
export type AppType = Exclude<AppTypeFilter, 'All types'>;

/** A dropdown in an Edit overlay (Figma "Dropdown Input" + "Channel Picker"). */
export interface PickerField {
  key: string;
  label: string;
  required?: boolean;
  placeholder: string;
  options: string[];
  /** Several picks with check marks (Figma "Channel Select"); otherwise one pick. */
  multi?: boolean;
  /** Search box at the top of the picker. */
  search?: string;
  /** Heading above the options ("Detected Channels"). */
  heading?: string;
  /** Accent hint under the field (Figma "Tip", Standard Message). */
  tip?: string;
  /** Red hint when a required field is empty (Figma "Tip", Error Message). */
  error?: string;
}

export type FormItem =
  /** "Connected Server" style line: bold value + grey detail. */
  | { type: 'info'; title: string; detail: string; plain?: boolean }
  /** Title, description and a toggle; `field` only shows while the toggle is on. */
  | { type: 'toggle'; key: string; title: string; detail: string; field?: PickerField }
  | { type: 'picker'; field: PickerField }
  /** Two toggles that exclude each other (YouTube / TikTok video selection). */
  | { type: 'choice'; key: string; all: string; selected: string; field: PickerField };

export interface FormSection {
  title: string;
  detail?: string;
  items: FormItem[];
}

export interface AppDef {
  id: ConnectionId;
  name: string;
  logo: string;
  type: AppType;
  group: 'recommended' | 'more';
  /** Card sentence. */
  description: string;
  /** Grey line under the name before connecting. */
  meta: string;
  /** Grey line under the name once connected (with the green dot). */
  connectedMeta: string;
  /** Discord can add more servers, so its Recommended card keeps "Connect Another". */
  multiple?: boolean;
  /** Edit overlay subtitle. */
  subtitle: string;
  sections: FormSection[];
  /** Mock sign-in window (Figma "Generic UTM Connect"). */
  ssoHost: string;
  ssoApp: string;
}

const DISCORD_CHANNELS = ['#general', '#marketing-updates', '#announcements', '#playtest-feedback', '#devlog'];
const VIDEOS_YT = ['Devlog #13: building the corruption effect', 'HOLLOW SIGNAL — Announcement Trailer', 'Devlog #12: the signal tower', 'Steam Next Fest demo walkthrough'];
const VIDEOS_TT = ['“When your save file corrupts”', 'POV: the signal finds you', '3am playtest moments', 'Boss reveal in 15 seconds'];

export const DISCORD_SERVER = 'HOLLOW SIGNAL OFFICIAL (GL)';

export const APPS: AppDef[] = [
  {
    id: 'discord',
    name: 'Discord',
    logo: discordLogo,
    type: 'Community',
    group: 'recommended',
    description: 'Track community growth, member counts, and aggregate server activity.',
    meta: 'Connect a Discord Server',
    connectedMeta: DISCORD_SERVER,
    multiple: true,
    subtitle: 'Configure your server tracking and bot settings.',
    ssoHost: 'discord.com',
    ssoApp: 'Discord',
    sections: [
      { title: 'Connected Server', items: [{ type: 'info', title: DISCORD_SERVER, detail: 'Aggro Bot installed', plain: true }] },
      {
        title: 'Community Insights',
        items: [
          { type: 'toggle', key: 'memberCount', title: 'Server Member Count', detail: 'Track your total server membership over time.' },
          { type: 'toggle', key: 'memberGrowth', title: 'Member Growth', detail: 'Track members joining and leaving your server.' },
          {
            type: 'toggle',
            key: 'messageActivity',
            title: 'Message Activity',
            detail: 'Count messages posted in selected channels.',
            field: {
              key: 'viewedChannels',
              label: 'Viewed Channels',
              required: true,
              placeholder: 'Choose a Channel',
              options: DISCORD_CHANNELS,
              multi: true,
              search: 'Search channels',
              heading: 'Detected Channels',
              tip: 'Message content will not be analyzed.',
              error: 'Choose at least one channel to track message activity.',
            },
          },
        ],
      },
      {
        title: 'Aggro Bot Notifications',
        items: [
          {
            type: 'toggle',
            key: 'campaignNotifications',
            title: 'Allow Campaign Notifications',
            detail: 'Let Aggro post marketing reminders, milestone updates, and performance summaries',
            field: {
              key: 'notificationChannel',
              label: 'Notification Channel',
              required: true,
              placeholder: 'Choose a Channel',
              options: DISCORD_CHANNELS,
              search: 'Search channels',
              heading: 'Detected Channels',
              tip: 'Aggro will send a Test Message to verify the bot’s posting permissions after setup.',
              error: 'Choose a channel to receive campaign notifications.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'steam',
    name: 'Steamworks',
    logo: steamLogo,
    type: 'Storefront',
    group: 'recommended',
    description: 'Import wishlist additions, removals, and historical growth.',
    meta: 'HOLLOW SIGNAL',
    connectedMeta: 'HOLLOW SIGNAL',
    subtitle: 'Configure wishlist and traffic for your game.',
    ssoHost: 'partner.steamgames.com',
    ssoApp: 'Steamworks',
    sections: [
      {
        title: 'Connected Publisher',
        items: [
          { type: 'info', title: 'MC Game Studio', detail: 'Authorized reporting connection' },
          {
            type: 'picker',
            field: {
              key: 'game',
              label: 'Select a game',
              placeholder: 'Choose a Steam game',
              options: ['HOLLOW SIGNAL', 'HOLLOW SIGNAL Demo'],
              tip: 'Only games you are authorized to access should appear.',
            },
          },
        ],
      },
      {
        title: 'Wishlist insights',
        items: [
          { type: 'toggle', key: 'wishlistCount', title: 'Wishlist Count', detail: 'Track the total number of outstanding wishlists.' },
          { type: 'toggle', key: 'dailyActivity', title: 'Daily Wishlist Activity', detail: 'Track wishlist additions and removals.' },
          { type: 'toggle', key: 'conversions', title: 'Wishlist Conversions', detail: 'Include reported purchases from wishlists.' },
          { type: 'toggle', key: 'regional', title: 'Regional Insights', detail: 'Import wishlist activity by country or region.' },
          { type: 'toggle', key: 'autoRefresh', title: 'Automatic Data Refresh', detail: 'Refresh available wishlist reports daily' },
        ],
      },
      {
        title: 'Storefront Traffic',
        items: [
          { type: 'toggle', key: 'storeTraffic', title: 'Total Store Traffic', detail: 'Track visits to your Steam store page over time.' },
          {
            type: 'toggle',
            key: 'trafficSources',
            title: 'Traffic Sources',
            detail: 'See where visitors discover your game, including Steam discovery features and external websites.',
          },
        ],
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    logo: youtubeLogo,
    type: 'Content',
    group: 'recommended',
    description: 'Track video views, subscriber growth, watch time, and engagement.',
    meta: 'Import Channel Analytics',
    connectedMeta: 'HOLLOW SIGNAL',
    subtitle: 'Choose how Aggro tracks your channel’s performance.',
    ssoHost: 'accounts.youtube.com',
    ssoApp: 'YouTube',
    sections: [
      { title: 'Connected Channel', items: [{ type: 'info', title: 'HOLLOW SIGNAL', detail: 'Read-only channel analytics', plain: true }] },
      {
        title: 'Channel Insights',
        items: [
          { type: 'toggle', key: 'videoPerformance', title: 'Video Performance', detail: 'Track views, likes, comments, and shares across your videos.' },
          { type: 'toggle', key: 'subscriberGrowth', title: 'Subscriber Growth', detail: 'Track subscribers gained and lost over time.' },
          { type: 'toggle', key: 'watchTime', title: 'Watch Time & Retention', detail: 'Import watch time and average view duration.' },
          { type: 'toggle', key: 'autoTracking', title: 'Automatic Video Tracking', detail: 'Add newly published videos to your Aggro timeline.' },
        ],
      },
      {
        title: 'Video Selection',
        detail: 'Choose which videos Aggro should include in your marketing reports.',
        items: [
          {
            type: 'choice',
            key: 'selectedOnly',
            all: 'All Channel Videos',
            selected: 'Selected Videos Only',
            field: { key: 'videos', label: 'Videos', placeholder: 'Video Title', options: VIDEOS_YT, multi: true, search: 'Search videos', heading: 'Channel Videos' },
          },
        ],
      },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    logo: tiktokLogo,
    type: 'Content',
    group: 'recommended',
    description: 'Track video views, likes, comments, shares, and follower growth.',
    meta: 'Import Video Performance',
    connectedMeta: '@hollow.signal',
    subtitle: 'Choose how Aggro tracks your short-form content.',
    ssoHost: 'www.tiktok.com',
    ssoApp: 'TikTok',
    sections: [
      { title: 'Connected Channel', items: [{ type: 'info', title: '@hollow.signal', detail: 'Public video access authorized' }] },
      {
        title: 'Content Insights',
        items: [
          { type: 'toggle', key: 'videoPerformance', title: 'Video Performance', detail: 'Track views, likes, comments, and shares across your videos.' },
          { type: 'toggle', key: 'followerGrowth', title: 'Follower Growth', detail: 'Record changes in your follower count over time.' },
          { type: 'toggle', key: 'history', title: 'Performance History', detail: 'Save periodic performance snapshots.' },
          { type: 'toggle', key: 'autoTracking', title: 'Automatic Video Tracking', detail: 'Add newly published videos to your Aggro timeline.' },
        ],
      },
      {
        title: 'Content Selection',
        detail: 'Choose which videos Aggro should include in your marketing reports.',
        items: [
          {
            type: 'choice',
            key: 'selectedOnly',
            all: 'All Public Videos',
            selected: 'Selected Videos Only',
            field: { key: 'videos', label: 'Videos', placeholder: 'Video Title', options: VIDEOS_TT, multi: true, search: 'Search videos', heading: 'Public Videos' },
          },
        ],
      },
    ],
  },
  {
    id: 'itch',
    name: 'itch.io',
    logo: itchLogo,
    type: 'Storefront',
    group: 'more',
    description: 'Track game-page visits, downloads, and available engagement statistics.',
    meta: 'Import Project Analytics',
    connectedMeta: 'HOLLOW SIGNAL',
    subtitle: 'Manage how Aggro uses your itch.io connection.',
    ssoHost: 'itch.io',
    ssoApp: 'itch.io',
    sections: [
      { title: 'Connected Account', items: [{ type: 'info', title: '@mcgamestudio', detail: 'Account successfully linked' }] },
      {
        title: 'Connection preferences',
        items: [
          { type: 'toggle', key: 'listings', title: 'Game Listings', detail: 'Access the titles, cover images, and page links of games.' },
          {
            type: 'picker',
            field: { key: 'game', label: 'Link a game to Aggro', placeholder: 'Game Project Name', options: ['HOLLOW SIGNAL', 'HOLLOW SIGNAL (Jam build)'] },
          },
          { type: 'toggle', key: 'keepUpdated', title: 'Keep Game Details Updated', detail: 'Periodically refresh basic game information.' },
        ],
      },
    ],
  },
];

export const appById = (id: ConnectionId) => APPS.find((a) => a.id === id);

/** Settings a fresh connection starts with: every toggle on, Figma's default picks. */
export function defaultSettings(app: AppDef): ConnectionSettings {
  const s: ConnectionSettings = {};
  for (const sec of app.sections)
    for (const item of sec.items) {
      if (item.type === 'toggle') {
        s[item.key] = true;
        if (item.field) s[item.field.key] = item.field.multi ? [] : '';
      } else if (item.type === 'picker') {
        s[item.field.key] = item.field.options[0];
      } else if (item.type === 'choice') {
        s[item.key] = true;
        s[item.field.key] = [];
      }
    }
  return s;
}
