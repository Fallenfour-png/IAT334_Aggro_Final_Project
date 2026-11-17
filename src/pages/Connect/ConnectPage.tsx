import { useRef, useState } from 'react';
import { AppLayout } from '../../components/shell/AppLayout';
import { CloseButton, Dialog } from '../../components/ui/Dialog';
import { MenuOption, Popover } from '../../components/ui/Menu';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../lib/icons';
import { useClickOutside } from '../../lib/useClickOutside';
import { useStore } from '../../state/store';
import type { Connection, ConnectionId, ConnectionSettings } from '../../state/types';
import { APP_TYPES, APPS, appById, defaultSettings, type AppDef, type AppTypeFilter, type FormItem, type PickerField } from './connectData';
import '../Home/home.css';
import './connect.css';

type Open = { kind: 'sso'; id: ConnectionId } | { kind: 'edit'; id: ConnectionId } | null;

/** Demo connections were made before this page existed: give them filled-in picks. */
function savedSettings(app: AppDef, conn?: Connection): ConnectionSettings {
  if (conn?.settings) return conn.settings;
  const s = defaultSettings(app);
  for (const sec of app.sections)
    for (const item of sec.items) {
      const f = item.type === 'toggle' || item.type === 'choice' ? item.field : item.type === 'picker' ? item.field : undefined;
      if (f && (s[f.key] === '' || (Array.isArray(s[f.key]) && !(s[f.key] as string[]).length))) s[f.key] = f.multi ? f.options.slice(0, 2) : f.options[0];
    }
  return s;
}

/* ---------------- Type filter (Figma "Connections Filter menu") ---------------- */

function TypeFilter({ value, onChange }: { value: AppTypeFilter; onChange: (v: AppTypeFilter) => void }) {
  return (
    <Popover
      menuClassName="menu menu--filter filter-menu type-menu"
      trigger={({ open, toggle }) => (
        <button type="button" className={`range-btn type-btn ${value !== 'All types' ? 'is-active' : ''}`} aria-expanded={open} onClick={toggle}>
          <span className="t-btn">{value}</span>
          <Icon name="chevron-down" size={16} tint />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-column">
            <p className="t-banner menu-heading">TYPE</p>
            {APP_TYPES.map((t) => (
              <MenuOption
                key={t}
                label={t}
                selected={t === value}
                onSelect={() => {
                  onChange(t);
                  close();
                }}
              />
            ))}
          </div>
          <div className="menu-footer">
            <button
              type="button"
              className="t-btn c-accent"
              onClick={() => {
                onChange('All types');
                close();
              }}
            >
              Clear all
            </button>
          </div>
        </>
      )}
    </Popover>
  );
}

/* ---------------- App card (Figma Discord / Steamworks / … component states) ---------------- */

function AppCard({ app, conn, mode, onConnect, onEdit }: { app: AppDef; conn?: Connection; mode: 'connections' | 'catalog'; onConnect: () => void; onEdit: () => void }) {
  const connected = !!conn?.connected;
  const another = connected && app.multiple && mode === 'catalog';
  return (
    <div className="app-card">
      <div className="app-card__top">
        <img className="app-card__logo" src={app.logo} alt="" width={44} height={44} draggable={false} />
        <div className="app-card__id">
          <p className="app-card__name">{app.name}</p>
          <p className="app-card__meta">
            {connected && <span className="app-card__dot" />}
            <span className="nowrap">{connected ? app.connectedMeta : app.meta}</span>
            {!connected && conn?.failed && <span className="app-card__failed nowrap">Failed to connect. Please try again.</span>}
          </p>
        </div>
        {connected && !another ? (
          <button type="button" className="icon-btn" aria-label={`Edit ${app.name}`} onClick={onEdit}>
            <Icon name="edit-sm" size={16} tint />
          </button>
        ) : (
          <button type="button" className="btn btn--primary t-btn app-card__connect" onClick={onConnect}>
            {another ? 'Connect Another' : 'Connect'}
            <Icon name="plus-white-16" size={16} tint />
          </button>
        )}
      </div>
      <p className="app-card__desc">{app.description}</p>
    </div>
  );
}

function NoMatches({ type, onClear }: { type: AppTypeFilter; onClear: () => void }) {
  return (
    <div className="empty-state connect-empty">
      <div className="empty-state__icon">
        <Icon name="search-16" size={24} tint />
      </div>
      <p className="t-h4 c-1">No apps match these filters</p>
      <p className="t-body-2 c-2">
        There are no {type} apps yet.
        <br />
        Remove a filter or connect a new app.
      </p>
      <button type="button" className="btn btn--cancel t-btn" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}

function AppSection({
  title,
  apps,
  mode,
  onConnect,
  onEdit,
}: {
  title: string;
  apps: AppDef[];
  mode: 'connections' | 'catalog';
  onConnect: (id: ConnectionId) => void;
  onEdit: (id: ConnectionId) => void;
}) {
  const { state } = useStore();
  const [type, setType] = useState<AppTypeFilter>('All types');
  const shown = apps.filter((a) => type === 'All types' || a.type === type);
  return (
    <section className="card">
      <div className="card-header">
        <h2 className="t-h3" style={{ color: '#000' }}>
          {title}
        </h2>
        <TypeFilter value={type} onChange={setType} />
      </div>
      {shown.length === 0 ? (
        type !== 'All types' ? (
          <NoMatches type={type} onClear={() => setType('All types')} />
        ) : (
          <div className="empty-state connect-empty">
            <div className="empty-state__icon">
              <Icon name="search-16" size={24} tint />
            </div>
            <p className="t-h4 c-1">No apps connected</p>
            <p className="t-body-2 c-2">Try connecting an application.</p>
          </div>
        )
      ) : (
        <div className="app-grid">
          {shown.map((a) => (
            <AppCard
              key={a.id}
              app={a}
              conn={state.connections.find((c) => c.id === a.id)}
              mode={mode}
              onConnect={() => onConnect(a.id)}
              onEdit={() => onEdit(a.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Mock sign-in window (Figma "OV / SSO …", "Generic UTM Connect") ---------------- */

function SsoWindow({ app, onCancel, onConnect }: { app: AppDef; onCancel: () => void; onConnect: () => void }) {
  return (
    <Dialog onClose={onCancel} width={776} className="sso">
      <div className="sso__bar">
        <img src={app.logo} alt="" width={16} height={16} className="sso__favicon" />
        <span className="sso__title">Authorize with {app.ssoApp} App</span>
        <span className="sso__controls" aria-hidden>
          <i className="sso__min" />
          <i className="sso__max" />
        </span>
        <button type="button" className="sso__x" aria-label="Close window" onClick={onCancel}>
          ✕
        </button>
      </div>
      <div className="sso__url">
        <span className="sso__avatar" />
        <span className="nowrap">{`${app.ssoHost}/auth/authorize/?client_key=UUID&response_type=code&direct_uri=https://auth.aggro.com/connect`}</span>
      </div>
      <div className="sso__body">
        <div className="sso__panel">
          <p className="sso__heading">
            Aggro wants to access your
            <br />
            {app.ssoApp} account
          </p>
          <div className="sso__foot">
            <p className="sso__legal">
              By connecting, you agree to Aggro’s Terms of Service and acknowledge that you have read the Privacy Policy. You can always see or remove access in
              the {app.ssoApp} App.
            </p>
            <div className="sso__actions">
              <button type="button" className="sso__btn sso__btn--cancel" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="sso__btn sso__btn--connect" onClick={onConnect}>
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------------- Edit overlay pieces ---------------- */

/** Figma "Dropdown Input" + "Channel Picker" / "Channel Select". */
function Picker({ field, value, onChange, error }: { field: PickerField; value: string | string[]; onChange: (v: string | string[]) => void; error?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  const picked = Array.isArray(value) ? value : value ? [value] : [];
  const options = field.options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const choose = (o: string) => {
    if (field.multi) onChange(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]);
    else {
      onChange(o);
      setOpen(false);
    }
  };
  return (
    <div className="popover-anchor" ref={ref} style={{ width: '100%' }}>
      <button type="button" className={`input t-body ${open ? 'is-open' : ''} ${error ? 'is-error' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="nowrap picker-value">{picked.length ? picked.join(', ') : field.placeholder}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="picker" role="listbox" aria-multiselectable={field.multi}>
          {field.search && (
            <label className="event-search picker__search">
              <Icon name="search-16" size={16} />
              <input className="t-body" placeholder={field.search} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            </label>
          )}
          {field.heading && <p className="t-sub2 c-2 picker__heading">{field.heading}</p>}
          {options.map((o) => {
            const on = picked.includes(o);
            return (
              <button type="button" key={o} role="option" aria-selected={on} className={`picker__option t-body ${on ? 'is-selected' : ''}`} onClick={() => choose(o)}>
                <span className="nowrap">{o}</span>
                {on && <Icon name="check-accent-16" size={16} />}
              </button>
            );
          })}
          {options.length === 0 && <p className="t-body-2 c-2 picker__none">No matches</p>}
        </div>
      )}
    </div>
  );
}

function FieldBlock({ field, settings, set, showErrors }: { field: PickerField; settings: ConnectionSettings; set: (k: string, v: ConnectionSettings[string]) => void; showErrors: boolean }) {
  const value = settings[field.key] as string | string[];
  const missing = !!field.required && (Array.isArray(value) ? value.length === 0 : !value);
  const error = showErrors && missing;
  return (
    <div className="cx-field">
      {field.label && (
        <p className="cx-label">
          {field.label}
          {field.required && <span className="req"> *</span>}
        </p>
      )}
      <Picker field={field} value={value} onChange={(v) => set(field.key, v)} error={error} />
      {(error || field.tip) && <p className={`t-body-2 ${error ? 'c-negative' : 'c-accent'}`}>{error ? field.error : field.tip}</p>}
    </div>
  );
}

function Subject({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <div className="cx-subject">
      <div className="cx-subject__text">
        <p className="cx-label">{title}</p>
        {detail && <p className="t-body-2 c-2">{detail}</p>}
      </div>
      {children}
    </div>
  );
}

function FormRow({ item, settings, set, showErrors }: { item: FormItem; settings: ConnectionSettings; set: (k: string, v: ConnectionSettings[string]) => void; showErrors: boolean }) {
  if (item.type === 'info')
    return (
      <div className="cx-info">
        <p className={item.plain ? 't-body c-1' : 'cx-label'}>{item.title}</p>
        <p className="t-body-2 c-2">{item.detail}</p>
      </div>
    );
  if (item.type === 'picker') return <FieldBlock field={item.field} settings={settings} set={set} showErrors={showErrors} />;
  if (item.type === 'choice') {
    const selectedOnly = settings[item.key] !== false;
    return (
      <>
        <Subject title={item.all}>
          <Toggle on={!selectedOnly} label={item.all} onChange={(v) => set(item.key, !v)} />
        </Subject>
        <Subject title={item.selected}>
          <Toggle on={selectedOnly} label={item.selected} onChange={(v) => set(item.key, v)} />
        </Subject>
        {selectedOnly && <FieldBlock field={{ ...item.field, label: '' }} settings={settings} set={set} showErrors={showErrors} />}
      </>
    );
  }
  const on = settings[item.key] !== false;
  return (
    <>
      <Subject title={item.title} detail={item.detail}>
        <Toggle on={on} label={item.title} onChange={(v) => set(item.key, v)} />
      </Subject>
      {item.field && on && <FieldBlock field={item.field} settings={settings} set={set} showErrors={showErrors} />}
    </>
  );
}

function missingRequired(app: AppDef, s: ConnectionSettings): boolean {
  for (const sec of app.sections)
    for (const item of sec.items) {
      const field = item.type === 'picker' ? item.field : item.type === 'toggle' && s[item.key] !== false ? item.field : undefined;
      if (!field?.required) continue;
      const v = s[field.key];
      if (Array.isArray(v) ? v.length === 0 : !v) return true;
    }
  return false;
}

/** Figma "OV / Disconnect …" (Confirm dialog, stacked). */
function DisconnectConfirm({ app, onCancel, onConfirm }: { app: AppDef; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className="confirm-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="confirm" role="alertdialog">
        <div className="confirm-icon confirm-icon--danger">
          <span className="minus-mark" />
        </div>
        <p className="t-h4 c-1">Remove {app.name}?</p>
        <p className="t-body-2 c-2">“{app.name}” and it’s preferences will be removed. Existing statistics are kept.</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn--cancel t-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger t-btn" onClick={onConfirm}>
            Remove app
          </button>
        </div>
      </div>
    </div>
  );
}

function EditOverlay({ app, onClose }: { app: AppDef; onClose: () => void }) {
  const { state, setConnection } = useStore();
  const conn = state.connections.find((c) => c.id === app.id);
  const [settings, setSettings] = useState<ConnectionSettings>(() => savedSettings(app, conn));
  const [showErrors, setShowErrors] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (k: string, v: ConnectionSettings[string]) => setSettings((s) => ({ ...s, [k]: v }));

  const save = () => {
    if (missingRequired(app, settings)) {
      setShowErrors(true);
      return;
    }
    setConnection(app.id, { settings }, `${app.name} settings saved`);
    onClose();
  };

  return (
    <Dialog onClose={onClose} className="cx-dialog">
        <div className="cx-header">
          <img className="app-card__logo" src={app.logo} alt="" width={44} height={44} />
          <div className="cx-header__text">
            <p className="t-h3 c-1">{app.name}</p>
            <p className="t-body-2 c-2">{app.subtitle}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {app.sections.map((sec) => (
          <section key={sec.title} className={`cx-section ${sec.items[0]?.type === 'info' && sec.items.length === 1 ? 'cx-section--tight' : ''}`}>
            <div>
              <p className="t-h4 c-1">{sec.title}</p>
              {sec.detail && <p className="t-body-2 c-2">{sec.detail}</p>}
            </div>
            {sec.items.map((item, i) => (
              <FormRow key={i} item={item} settings={settings} set={set} showErrors={showErrors} />
            ))}
          </section>
        ))}

        <div className="cx-actions">
          <button type="button" className="btn btn--remove t-btn cx-disconnect" onClick={() => setConfirm(true)}>
            <span className="minus-mark minus-mark--sm" />
            Disconnect
          </button>
          <button type="button" className="btn btn--save t-btn" onClick={save}>
            Save
            <Icon name="check-14-white" size={14} />
          </button>
        </div>

        {confirm && (
          <DisconnectConfirm
            app={app}
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              setConnection(app.id, { connected: false, failed: false, settings: undefined }, `${app.name} removed`);
              onClose();
            }}
          />
        )}
    </Dialog>
  );
}

/* ---------------- Page ---------------- */

export function ConnectPage() {
  const { state, setConnection } = useStore();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const isConnected = (id: ConnectionId) => state.connections.some((c) => c.id === id && c.connected);

  const connectApp = (app: AppDef) => {
    const already = isConnected(app.id);
    setConnection(
      app.id,
      { connected: true, failed: false, settings: already ? state.connections.find((c) => c.id === app.id)?.settings : defaultSettings(app) },
      already ? `${app.name} server connected` : `${app.name} connected`,
      { title: already ? `Another ${app.name} server connected` : `${app.name} connected`, meta: `Connection  •  ${app.connectedMeta}  •  Just now` },
    );
    // Figma: a successful sign-in opens that app's Edit overlay.
    setOpen({ kind: 'edit', id: app.id });
  };

  const cancelSso = (app: AppDef) => {
    // Figma: cancelling marks the card "Failed to connect" (unless it was already connected).
    if (!isConnected(app.id)) setConnection(app.id, { failed: true });
    close();
  };

  const sso = open?.kind === 'sso' ? appById(open.id) : undefined;
  const edit = open?.kind === 'edit' ? appById(open.id) : undefined;

  return (
    <AppLayout crumbs={[{ label: 'Home', to: '/' }, { label: 'Connect' }]}>
      <main className="page">
        <h1 className="t-h2" style={{ color: '#000' }}>
          Connected Apps
        </h1>
        <AppSection
          title="Connections"
          mode="connections"
          apps={APPS.filter((a) => isConnected(a.id))}
          onConnect={(id) => setOpen({ kind: 'sso', id })}
          onEdit={(id) => setOpen({ kind: 'edit', id })}
        />
        <AppSection
          title="Recommended Connections"
          mode="catalog"
          apps={APPS.filter((a) => a.group === 'recommended')}
          onConnect={(id) => setOpen({ kind: 'sso', id })}
          onEdit={(id) => setOpen({ kind: 'edit', id })}
        />
        <AppSection
          title="More Connections"
          mode="catalog"
          apps={APPS.filter((a) => a.group === 'more')}
          onConnect={(id) => setOpen({ kind: 'sso', id })}
          onEdit={(id) => setOpen({ kind: 'edit', id })}
        />
      </main>

      {sso && <SsoWindow app={sso} onCancel={() => cancelSso(sso)} onConnect={() => connectApp(sso)} />}
      {edit && <EditOverlay key={edit.id} app={edit} onClose={close} />}
    </AppLayout>
  );
}
