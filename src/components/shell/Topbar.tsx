import { Fragment, useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuOption, Popover } from '../ui/Menu';
import { Icon, iconUrl } from '../../lib/icons';
import { useClickOutside } from '../../lib/useClickOutside';
import { accountOf, initials } from '../../state/selectors';
import { useStore } from '../../state/store';

export interface Crumb {
  label: string;
  to?: string;
}

/** Avatar opens account options, including resetting the prototype data for testing. */
function AvatarMenu() {
  const { state, reset } = useStore();
  const navigate = useNavigate();
  const account = accountOf(state);
  return (
    <Popover
      menuClassName="menu menu--list avatar-menu"
      trigger={({ open, toggle }) => (
        <button type="button" className="avatar" aria-label="Account menu" aria-expanded={open} onClick={toggle}>
          {account.avatar ? <img className="avatar__img" src={account.avatar} alt="" /> : initials(account.username)}
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuOption
            label="Account settings"
            onSelect={() => {
              close();
              navigate('/settings');
            }}
          />
          <MenuOption
            label="Switch project"
            onSelect={() => {
              close();
              navigate('/games');
            }}
          />
          {/* No destination in the prototype: hover state only. */}
          <MenuOption label="Log out" />
          <div className="menu-divider" />
          <p className="t-banner menu-heading" style={{ padding: '4px 8px 0' }}>
            TESTING
          </p>
          <MenuOption
            label="Reset demo data"
            onSelect={() => {
              reset('demo');
              close();
            }}
          />
          <MenuOption
            label="Start with an empty account"
            onSelect={() => {
              reset('fresh');
              close();
            }}
          />
        </>
      )}
    </Popover>
  );
}

const NOTIFICATION_ICON = { Shorts: 'type-shorts', Event: 'type-event', News: 'type-news', Storefront: 'type-storefront' };

export function Topbar({ crumbs }: { crumbs: Crumb[] }) {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const unread = state.notifications.filter((n) => n.unread).length;
  const markAllRead = () =>
    update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
  const markRead = (id: string) =>
    update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)) }));

  return (
    <header className="topbar">
      <div className="breadcrumb t-body">
        {crumbs.map((c, i) => (
          <Fragment key={c.label}>
            {i > 0 && <span className="c-3">/</span>}
            {c.to ? <Link to={c.to}>{c.label}</Link> : <span className="c-1">{c.label}</span>}
          </Fragment>
        ))}
      </div>
      <div className="topbar-actions">
        <div className="popover-anchor" ref={ref}>
          <button
            type="button"
            className={`bell ${unread ? '' : 'no-unread'}`}
            aria-label="Notifications"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <img src={iconUrl('topbar-notifications')} alt="" />
          </button>
          {open && (
            <div className="notifications" role="dialog" aria-label="Notifications">
              <div className="notifications-head">
                <p className="t-h4 c-1">Notifications</p>
                {state.notifications.length > 0 && (
                  <button type="button" className={`t-btn ${unread ? 'c-accent' : 'c-3'}`} onClick={markAllRead} disabled={!unread}>
                    Mark all as read
                  </button>
                )}
              </div>
              {state.notifications.length === 0 ? (
                <div className="notifications-empty">
                  <div className="notifications-empty__icon">
                    <Icon name="bell" size={22} />
                  </div>
                  <p className="t-h4 c-1">You’re all caught up</p>
                  <p className="t-body-2 c-2" style={{ width: 320 }}>
                    New touchpoint data, due dates and goals that fall behind will show up here.
                  </p>
                </div>
              ) : (
                <div className="notifications-list">
                {state.notifications.map((n) => (
                  <button type="button" key={n.id} className="notification" onClick={() => markRead(n.id)}>
                    <span className="notification-icon">
                      <Icon name={NOTIFICATION_ICON[n.icon]} size={20} />
                    </span>
                    <span className="notification-body">
                      <span className={`${n.unread ? 't-btn-bold' : 't-btn'} c-1`}>{n.title}</span>
                      <span className="t-body-2 c-2 pre">{n.meta}</span>
                    </span>
                    {n.unread && <span className="notification-dot" />}
                  </button>
                ))}
                </div>
              )}
              <div className="notifications-foot">
                <button
                  type="button"
                  className="t-btn c-accent"
                  onClick={() => {
                    close();
                    navigate('/settings?tab=notifications');
                  }}
                >
                  Notification settings
                </button>
              </div>
            </div>
          )}
        </div>
        <AvatarMenu />
      </div>
    </header>
  );
}
