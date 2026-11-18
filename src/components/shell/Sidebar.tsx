import { NavLink, useNavigate } from 'react-router-dom';
import { iconUrl } from '../../lib/icons';
import { useStore } from '../../state/store';

const ITEMS = [
  { to: '/', label: 'Home', icon: 'nav-home', end: true },
  { to: '/analytics', label: 'Analytics', icon: 'nav-analytics' },
  { to: '/plan', label: 'Plan', icon: 'nav-plan' },
  { to: '/connect', label: 'Connect', icon: 'nav-connect' },
  { to: '/settings', label: 'Settings', icon: 'nav-settings' },
];

function NavIcon({ icon, active }: { icon: string; active?: boolean }) {
  return (
    <span className="nav-item__icon">
      <img className="icon-default" src={iconUrl(icon)} width={20} height={20} alt="" />
      {active !== false && <img className="icon-active" src={iconUrl(`${icon}-active`)} width={20} height={20} alt="" />}
    </span>
  );
}

export function Sidebar() {
  const { state } = useStore();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-project" title={state.project?.name}>
        AG
      </div>
      <nav className="sidebar-nav">
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'is-selected' : ''}`}>
            <NavIcon icon={item.icon} />
            <span className="t-sub2">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      {/* Log out returns to project selection (the Games screen). */}
      <button type="button" className="nav-item" onClick={() => navigate('/games')}>
        <NavIcon icon="nav-logout" />
        <span className="t-sub2">Log out</span>
      </button>
    </aside>
  );
}
