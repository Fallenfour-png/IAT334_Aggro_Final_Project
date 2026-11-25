import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../../components/shell/AppLayout';
import { Dialog, FieldError, focusFirstInvalid, StackedConfirm } from '../../components/ui/Dialog';
import { GameCover, GameThumb } from '../../components/ui/GameCover';
import { Toggle } from '../../components/ui/Toggle';
import { parseDate, TODAY } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { IMAGE_TYPES, readImage } from '../../lib/images';
import { freshState } from '../../state/seeds';
import { accountOf, initials } from '../../state/selectors';
import { useStore } from '../../state/store';
import type { Account } from '../../state/types';
import '../Home/home.css';
import './settings.css';

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'projects', label: 'Projects' },
  { id: 'notifications', label: 'Notifications' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function UploadButton({ label, hint, maxMb, size, onImage }: { label: string; hint: string; maxMb: number; size: [number, number]; onImage: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return (
    <div className="st-upload">
      <button type="button" className="btn btn--primary t-btn st-small-btn" onClick={() => input.current?.click()}>
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          readImage(file, maxMb, size[0], size[1])
            .then((url) => {
              setError('');
              onImage(url);
            })
            .catch((err: Error) => setError(err.message));
        }}
      />
      <p className={`st-hint ${error ? 'c-negative' : ''}`}>{error || hint}</p>
    </div>
  );
}

const maskEmail = (e: string) => e.replace(/^[^@]+/, '**********');
const maskPhone = (p: string) => '******' + p.replace(/\D/g, '').slice(-4);

/* ---------------- Rows (Figma "Input Field") ---------------- */

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>
      <Icon name="edit-sm" size={16} tint />
    </button>
  );
}

function Row({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="st-row-wrap">
      <div className="st-row">
        <p className="t-body st-row__label">{label}</p>
        <div className="st-row__value">{children}</div>
      </div>
      {sub}
    </div>
  );
}

/** Row with a chevron that opens a short list underneath (Logged-in Devices, Manage Team). */
function ExpandRow({ label, count, children }: { label: string; count: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="st-row-wrap">
      <button type="button" className="st-row st-row--button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <p className="t-body st-row__label">{label}</p>
        <span className="st-row__value">
          <span className="t-btn c-1">{count}</span>
          <span className="st-chev">
            <Icon name="chev-right" size={20} tint className={open ? 'rotate-90' : ''} />
          </span>
        </span>
      </button>
      {open && <div className="st-list">{children}</div>}
    </div>
  );
}

function Person({ name, detail, tag, avatar }: { name: string; detail: string; tag: string; avatar?: ReactNode }) {
  return (
    <div className="st-person">
      {avatar}
      <div className="st-person__text">
        <p className="t-btn-bold c-1">{name}</p>
        <p className="t-body-2 c-2">{detail}</p>
      </div>
      <span className="tag t-banner">{tag}</span>
    </div>
  );
}

function AvatarCircle({ account, size }: { account: Account; size: number }) {
  return (
    <span className="st-avatar" style={{ width: size, height: size, fontSize: size * 0.325 }}>
      {account.avatar ? <img src={account.avatar} alt="" /> : initials(account.username)}
    </span>
  );
}

/* ---------------- Dialogs ---------------- */

/** Figma "OV / Change Username": one text field + "Save changes". Also used for the project name. */
function TextDialog({ title, subtitle, label, value, onSave, onClose }: { title: string; subtitle: string; label: string; value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value);
  const clean = text.trim();
  return (
    <Dialog onClose={onClose} title={title} subtitle={subtitle} className="st-dialog">
      <div className="field">
        <p className="t-body c-2">{label}</p>
        <label className="input input--soft t-body">
          <input className="t-body" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </label>
      </div>
      <div className="st-actions">
        <button
          type="button"
          className="btn btn--save st-save"
          disabled={!clean || clean === value}
          onClick={() => {
            onSave(clean);
            onClose();
          }}
        >
          <Icon name="check-14-white" size={14} />
          Save changes
        </button>
      </div>
    </Dialog>
  );
}

function SoftClose({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="close-btn close-btn--soft" onClick={onClick} aria-label="Close">
      <Icon name="close-16" size={16} tint />
    </button>
  );
}

/** Four single-digit boxes (Figma "Verification code"). */
function CodeBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, ' ').slice(0, 4).split('');
  return (
    <div className="st-code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="st-code__box t-body"
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={d.trim()}
          autoFocus={i === 0}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            const next = digits.map((x, j) => (j === i ? ch || ' ' : x)).join('').trimEnd();
            onChange(next);
            if (ch && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            if (pasted) {
              e.preventDefault();
              onChange(pasted);
              refs.current[Math.min(pasted.length, 3)]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

/** "Send OTP" with Figma's disabled state while the 15-second resend timer runs. */
function useOtp() {
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return {
    sent,
    left,
    send: () => {
      setSent(true);
      setLeft(15);
    },
  };
}

function OtpLine({ otp, disabled }: { otp: ReturnType<typeof useOtp>; disabled?: boolean }) {
  return (
    <>
      <div className="st-otp">
        <p className="t-body-2 c-2">Please send the OTP code to continue</p>
        <button type="button" className="btn st-otp__btn" disabled={disabled || otp.left > 0} onClick={otp.send}>
          Send OTP
        </button>
      </div>
      {otp.sent && (
        <p className="t-body-2 c-accent">
          {otp.left > 0 ? `An authentication code has been sent, you can send again in ${otp.left} seconds` : 'An authentication code has been sent. Didn’t get it? Send it again.'}
        </p>
      )}
    </>
  );
}

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPhone = (v: string) => v.replace(/\D/g, '').length >= 10;

/**
 * Figma "OV / Change Email": verify the current value with a code, enter the new one,
 * verify that with a code, then "Save changes". Phone numbers use the same flow.
 */
function VerifyDialog({
  kind,
  current,
  onSave,
  onClose,
}: {
  kind: 'email' | 'phone';
  current?: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const noun = kind === 'email' ? 'Email' : 'Phone Number';
  const first = useOtp();
  const second = useOtp();
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [next, setNext] = useState('');
  const currentOk = !current || (first.sent && code1.length === 4);
  const nextValid = kind === 'email' ? validEmail(next.trim()) : validPhone(next);
  const done = currentOk && second.sent && code2.length === 4;

  return (
    <Dialog onClose={onClose} className="st-dialog">
      <div className="dialog-header" style={{ alignItems: 'flex-start' }}>
        <div className="dialog-title">
          <p className="t-h3 c-1">{current ? `Change ${noun}` : `Add ${noun}`}</p>
          <p className="t-body-2 c-2">{current ? `You must verify your ${noun.toLowerCase()} before changing` : `We’ll send a code to verify your ${noun.toLowerCase()}`}</p>
        </div>
        <SoftClose onClick={onClose} />
      </div>

      {current && (
        <>
          <div className="st-field">
            <p className="t-body c-1">Current {noun}</p>
            <p className="st-strong">{current}</p>
            <OtpLine otp={first} />
          </div>
          {first.sent && (
            <div className="st-field">
              <p className="t-body c-1">Verification code</p>
              <CodeBoxes value={code1} onChange={setCode1} />
            </div>
          )}
        </>
      )}

      {currentOk && (
        <>
          <div className="st-field">
            <p className="t-body c-1">New {noun}</p>
            <label className="input input--soft t-body">
              <input
                className="t-body"
                value={next}
                type={kind === 'email' ? 'email' : 'tel'}
                placeholder={kind === 'email' ? 'new-email@sample.com' : '604-888-9876'}
                onChange={(e) => setNext(e.target.value)}
                autoFocus={!current}
              />
            </label>
            <OtpLine otp={second} disabled={!nextValid} />
          </div>
          {second.sent && (
            <div className="st-field">
              <p className="t-body c-1">Verification code</p>
              <CodeBoxes value={code2} onChange={setCode2} />
            </div>
          )}
        </>
      )}

      {done && (
        <div className="st-actions">
          <button
            type="button"
            className="btn btn--save st-save"
            onClick={() => {
              onSave(next.trim());
              onClose();
            }}
          >
            <Icon name="check-14-white" size={14} />
            Save changes
          </button>
        </div>
      )}
    </Dialog>
  );
}

/** Not in Figma: password change built like "Change Username". Nothing is stored. */
function PasswordDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const formId = useId();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [tried, setTried] = useState(false);
  const short = pw.length < 8;
  const mismatch = pw !== again;
  const ok = cur && !short && !mismatch;
  const field = (label: string, value: string, set: (v: string) => void, error?: string) => {
    const id = `${formId}-${label.replace(/\s+/g, '-')}`;
    return (
      <div className="field">
        <label className="t-body field-label" htmlFor={id}>{label}</label>
        <label className={`input input--soft t-body ${error ? 'is-error' : ''}`}>
          <input id={id} className="t-body" type="password" value={value} onChange={(e) => set(e.target.value)} autoComplete={label === 'Current password' ? 'current-password' : 'new-password'} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined} />
        </label>
        <FieldError id={`${id}-error`} message={error} />
      </div>
    );
  };
  return (
    <Dialog onClose={onClose} title="Change Password" subtitle="Use at least 8 characters" className="st-dialog">
      {field('Current password', cur, setCur, tried && !cur ? 'Enter your current password.' : undefined)}
      {field('New password', pw, setPw, tried && short ? 'Enter a new password with at least 8 characters.' : undefined)}
      {field('Confirm new password', again, setAgain, tried && (!again || mismatch) ? 'Re-enter your new password so both passwords match.' : undefined)}
      <div className="st-actions">
        <button
          type="button"
          className="btn btn--save st-save"
          onClick={(event) => {
            setTried(true);
            if (!ok) {
              focusFirstInvalid(event.currentTarget.closest('[role="dialog"]'));
              return;
            }
            onSaved();
            onClose();
          }}
        >
          <Icon name="check-14-white" size={14} />
          Save changes
        </button>
      </div>
    </Dialog>
  );
}

/* ---------------- Tabs ---------------- */

type Open = 'username' | 'email' | 'phone' | 'password' | 'project' | 'delete' | null;

/** The prototype's "today" with the current time, e.g. "Aug 6, 2026 at 3:54 PM". */
function stamp(): string {
  const date = parseDate(TODAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}

function AccountTab() {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const account = accountOf(state);
  const [open, setOpen] = useState<Open>(null);
  const [reveal, setReveal] = useState({ email: false, phone: false });
  const setAccount = (patch: Partial<Account>, toast: string) => update((s) => ({ ...s, account: { ...accountOf(s), ...patch } }), toast);
  const close = () => setOpen(null);

  return (
    <div className="st-columns">
      <div className="st-col">
        <section className="card">
          <h2 className="t-h3" style={{ color: '#000' }}>
            Profile Picture
          </h2>
          <div className="st-media">
            <AvatarCircle account={account} size={96} />
            <UploadButton
              label="Update Profile Picture"
              hint="Must be JPEG, PNG, or GIF and cannot exceed 10MB"
              maxMb={10}
              size={[192, 192]}
              onImage={(avatar) => setAccount({ avatar }, 'Profile picture updated')}
            />
          </div>
        </section>

        <section className="card">
          <h2 className="t-h3" style={{ color: '#000' }}>
            Account Info
          </h2>
          <div className="st-rows">
            <Row label="Username">
              <span className="t-btn c-1">{account.username}</span>
              <EditButton label="Edit username" onClick={() => setOpen('username')} />
            </Row>
            <Row label="Email">
              <span className="t-btn c-1">{reveal.email ? account.email : maskEmail(account.email)}</span>
              <button type="button" className="t-btn st-reveal" onClick={() => setReveal((r) => ({ ...r, email: !r.email }))}>
                {reveal.email ? 'Hide' : 'Reveal'}
              </button>
              <EditButton label="Edit email" onClick={() => setOpen('email')} />
            </Row>
            <Row label="Phone Number">
              {account.phone ? (
                <>
                  <span className="t-btn c-1">{reveal.phone ? account.phone : maskPhone(account.phone)}</span>
                  <button type="button" className="t-btn st-reveal" onClick={() => setReveal((r) => ({ ...r, phone: !r.phone }))}>
                    {reveal.phone ? 'Hide' : 'Reveal'}
                  </button>
                </>
              ) : (
                <span className="t-btn c-1">Add Phone Number</span>
              )}
              <EditButton label={account.phone ? 'Edit phone number' : 'Add phone number'} onClick={() => setOpen('phone')} />
            </Row>
          </div>
        </section>
      </div>

      <div className="st-col">
        <section className="card">
          <h2 className="t-h3" style={{ color: '#000' }}>
            Password &amp; Security
          </h2>
          <div className="st-rows">
            <Row label="Password">
              <EditButton label="Change password" onClick={() => setOpen('password')} />
            </Row>
            <Row
              label="Two-Factor Authentication"
              sub={account.phone && account.verified ? <p className="t-body-2 c-2">Last Verified: {account.verified}</p> : undefined}
            >
              <span className="t-btn c-1">{account.phone ? `Phone Number: ${maskPhone(account.phone)}` : 'Phone Number Needed'}</span>
              <EditButton label="Edit two-factor phone number" onClick={() => setOpen('phone')} />
            </Row>
            <ExpandRow label="Logged-in Devices" count="1 device">
              <Person name="Chrome on Windows" detail="Vancouver, BC  ·  Active now" tag="This device" />
            </ExpandRow>
          </div>
        </section>

        {/* Log out returns to project selection (the Games screen), like the sidebar Log out. */}
        <button type="button" className="st-logout t-body" onClick={() => navigate('/games')}>
          Log Out
          <Icon name="nav-logout" size={20} tint />
        </button>
      </div>

      {open === 'username' && (
        <TextDialog
          title="Change Username"
          subtitle="Details about change limitations"
          label="Username"
          value={account.username}
          onSave={(username) => setAccount({ username }, 'Username updated')}
          onClose={close}
        />
      )}
      {open === 'email' && <VerifyDialog kind="email" current={account.email} onSave={(email) => setAccount({ email }, 'Email updated')} onClose={close} />}
      {open === 'phone' && (
        <VerifyDialog
          kind="phone"
          current={account.phone}
          onSave={(phone) => setAccount({ phone, verified: stamp() }, account.phone ? 'Phone number updated' : 'Phone number added')}
          onClose={close}
        />
      )}
      {open === 'password' && <PasswordDialog onSaved={() => update((s) => s, 'Password updated')} onClose={close} />}
    </div>
  );
}

function ProjectsTab() {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const account = accountOf(state);
  const project = state.project;
  const team = project?.team ?? [];
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const others = (state.otherGames ?? []).flatMap((w, index) => (w.project ? [{ w, project: w.project, index }] : []));
  /** New Project and Switch Projects both open the Games screen (the start of onboarding). */
  const toGames = () => navigate('/games');

  return (
    <>
      <button type="button" className="cta st-new" onClick={toGames}>
        <span className="t-body">New Project</span>
        <Icon name="plus-white" size={20} tint />
      </button>

      <div className="st-columns">
        {project && (
          <section className="card">
            <div className="st-title-row">
              <h2 className="t-h3 c-1 upper">{project.name}</h2>
              <EditButton label="Edit project name" onClick={() => setOpen('project')} />
            </div>
            <div className="st-media st-media--cover">
              <GameCover project={project} />
              <UploadButton
                label="Update Project Cover"
                hint="Must be JPEG, PNG, or GIF and cannot exceed 50MB"
                maxMb={50}
                size={[354, 456]}
                onImage={(coverImage) => update((s) => ({ ...s, project: s.project && { ...s.project, coverImage } }), 'Project cover updated')}
              />
            </div>
            <ExpandRow label="Manage Team" count={`${team.length + 1} ${team.length ? 'members' : 'member'}`}>
              <div className="st-people">
                <Person name={account.username} detail={account.email} tag="Owner" avatar={<AvatarCircle account={account} size={36} />} />
                {team.map((m) => (
                  <Person key={m.email} name={m.name} detail={`${m.email}  ·  ${m.role}`} tag="Invited" avatar={<span className="st-avatar st-avatar--blank" style={{ width: 36, height: 36 }} />} />
                ))}
              </div>
            </ExpandRow>
            <button type="button" className="btn btn--remove t-btn st-delete" onClick={() => setOpen('delete')}>
              Delete project
              <Icon name="trash-14" size={14} tint />
            </button>
          </section>
        )}

        <section className="card">
          <h2 className="t-h3" style={{ color: '#000' }}>
            Other Projects
          </h2>
          {others.length ? (
            <div className="st-rows">
              {others.map(({ w, project: p, index }) => {
                const goals = w.goals.filter((g) => !g.completedAt && g.due >= TODAY).length;
                const milestones = w.milestones.filter((m) => m.date >= TODAY).length;
                return (
                  <div key={`${p.name}-${index}`} className="st-project">
                    <GameThumb project={p} size={[89, 112]} />
                    <div className="st-project__text">
                      <div>
                        <p className="t-h4 c-1">{p.name}</p>
                        <p className="st-by">By MC Game Studio</p>
                      </div>
                      <p className="t-body-2 c-2">
                        {goals} Upcoming {goals === 1 ? 'Goal' : 'Goals'} · {milestones} {milestones === 1 ? 'Milestone' : 'Milestones'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary t-btn st-small-btn"
                      onClick={toGames}
                    >
                      Switch Projects
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state st-empty">
              <div className="empty-state__icon">
                <Icon name="search-16" size={24} tint />
              </div>
              <p className="t-h4 c-1">No other games</p>
              <p className="t-body-2 c-2">No other projects yet. Let’s correct that by starting a new project.</p>
              <button type="button" className="btn btn--primary t-btn st-small-btn" onClick={toGames}>
                {'New Project + '}
              </button>
            </div>
          )}
        </section>
      </div>

      {open === 'project' && project && (
        <TextDialog
          title="Change Project Name"
          subtitle="Shown on your dashboard and game cover"
          label="Project name"
          value={project.name}
          onSave={(name) => {
            const [top, ...rest] = name.toUpperCase().split(/\s+/);
            update(
              (s) => ({ ...s, project: s.project && { ...s.project, name, coverTop: top, coverBottom: rest.join(' ') } }),
              'Project name updated',
            );
          }}
          onClose={close}
        />
      )}
      {open === 'delete' && project && (
        <StackedConfirm
          tone="danger"
          title={`Delete ${project.name.toUpperCase()}?`}
          body="Its goals, milestones, touchpoints and connections will be removed. You can undo this right after."
          cancelLabel="Cancel"
          confirmLabel="Delete project"
          onCancel={close}
          onConfirm={() => {
            // Another game takes its place; with none left, the account goes back to a brand-new game.
            update((s) => {
              const [next, ...rest] = s.otherGames ?? [];
              return next ? { ...next, account: s.account, otherGames: rest } : { ...freshState(), account: s.account };
            }, 'Project deleted');
            close();
          }}
        />
      )}
    </>
  );
}

const NOTIFY_ROWS = [
  { key: 'goals', title: 'Goal updates', detail: 'When a goal falls behind or is reached.' },
  { key: 'milestones', title: 'Milestone reminders', detail: 'A week and a day before each milestone is due.' },
  { key: 'touchpoints', title: 'Touchpoint performance', detail: 'When a touchpoint passes a views or wishlist mark.' },
  { key: 'connections', title: 'Connection alerts', detail: 'When an app connects, disconnects or stops syncing.' },
  { key: 'weekly', title: 'Weekly summary email', detail: 'Every Monday: wishlists, members and your top touchpoints.' },
];

/** Not designed in Figma: toggles in the Settings card style. */
function NotificationsTab() {
  const { state, update } = useStore();
  const account = accountOf(state);
  return (
    <div className="st-columns">
      <section className="card">
        <h2 className="t-h3" style={{ color: '#000' }}>
          Notifications
        </h2>
        <div className="st-rows">
          {NOTIFY_ROWS.map((r) => {
            const on = account.notify[r.key] !== false;
            return (
              <div key={r.key} className="st-row st-row--toggle">
                <div>
                  <p className="t-body c-1">{r.title}</p>
                  <p className="t-body-2 c-2">{r.detail}</p>
                </div>
                <Toggle
                  on={on}
                  label={r.title}
                  onChange={(v) =>
                    update((s) => {
                      const a = accountOf(s);
                      return { ...s, account: { ...a, notify: { ...a.notify, [r.key]: v } } };
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'account') as Tab;
  const label = TABS.find((t) => t.id === tab)!.label;

  return (
    <AppLayout crumbs={[{ label: 'Home', to: '/' }, { label: 'Settings', to: '/settings' }, { label }]}>
      <main className="page">
        <div className="st-header">
          <h1 className="t-h2" style={{ color: '#000' }}>
            Settings
          </h1>
          <div className="st-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === tab}
                className={`st-tab t-btn-bold ${t.id === tab ? 'is-active' : ''}`}
                onClick={() => setParams(t.id === 'account' ? {} : { tab: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'account' && <AccountTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'notifications' && <NotificationsTab />}
      </main>
    </AppLayout>
  );
}
