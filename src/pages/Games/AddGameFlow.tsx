import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../lib/icons';
import { IMAGE_TYPES, readImage } from '../../lib/images';
import { useClickOutside } from '../../lib/useClickOutside';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { MenuOption } from '../../components/ui/Menu';
import { accountOf } from '../../state/selectors';
import { useStore } from '../../state/store';
import type { Member } from '../../state/types';

/* Figma "add game step 1–3", "add friend … step 1–3", "step 4 friends / no friends". */

function Shell({ width, onClose, children, className = '' }: { width: number; onClose: () => void; children: React.ReactNode; className?: string }) {
  return createPortal(
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className={`ob-dialog ${className}`} style={{ width }} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body,
  );
}

function RoundClose({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="ob-close" aria-label="Close" onClick={onClick}>
      <Icon name="close-16" size={18} tint />
    </button>
  );
}

function PeopleBadge({ count, label }: { count: number; label?: string }) {
  return (
    <span className="ob-badge">
      <Icon name="ob-person" size={14} />
      {label ?? count}
    </span>
  );
}

/** Name guessed from an invite email: "james.sullivan@…" → "James Sullivan". */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const words = local.replace(/[0-9]+/g, ' ').split(/[._\-+\s]+/).filter(Boolean);
  return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ') || email;
}

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const ROLES: Member['role'][] = ['Can View', 'Can Edit'];

function RoleSelect({ value, onChange, onRemove, compact }: { value: Member['role']; onChange: (r: Member['role']) => void; onRemove?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  return (
    <div className="popover-anchor" ref={ref}>
      <button type="button" className={`ob-role ${compact ? 'ob-role--compact' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {value}
        <Icon name="chevron-down" size={compact ? 14 : 16} tint />
      </button>
      {open && (
        <div className="menu menu--list ob-role-menu" role="menu">
          {ROLES.map((r) => (
            <MenuOption
              key={r}
              label={r}
              selected={r === value}
              onSelect={() => {
                onChange(r);
                setOpen(false);
              }}
            />
          ))}
          {onRemove && (
            <>
              <div className="menu-divider" />
              <MenuOption label="Remove" className="ob-remove" onSelect={onRemove} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AddPeople({ team, onChange, onBack, onDone, email, setEmail, role, setRole }: {
  team: Member[]; onChange: (t: Member[]) => void; onBack: () => void; onDone: () => void;
  email: string; setEmail: (email: string) => void; role: Member['role']; setRole: (role: Member['role']) => void;
}) {
  const { state } = useStore();
  const account = accountOf(state);
  const clean = email.trim().toLowerCase();
  const already = clean === account.email.toLowerCase() || team.some((m) => m.email === clean);
  const canInvite = validEmail(clean) && !already;
  const invite = () => {
    if (!canInvite) return;
    onChange([...team, { name: nameFromEmail(clean), email: clean, role }]);
    setEmail('');
    setRole('Can View');
  };

  return (
    <Shell width={546} onClose={onBack} className="ob-people">
      <p className="ob-people__title">Add People</p>
      <div className={`ob-email ${canInvite ? 'has-action' : ''}`}>
        <input
          className="ob-email__input"
          placeholder="Email Address"
          value={email}
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') invite();
          }}
        />
        {canInvite && (
          <>
            <RoleSelect value={role} onChange={setRole} compact />
            <button type="button" className="ob-invite" onClick={invite}>
              Invite
            </button>
          </>
        )}
      </div>
      {already && validEmail(clean) && <p className="t-body-2 c-negative">That person is already on this game.</p>}

      {canInvite ? (
        <button type="button" className="ob-suggest" onClick={invite}>
          <span className="ob-avatar ob-avatar--sm" />
          <span className="ob-person__text">
            <span className="ob-suggest__name">{nameFromEmail(clean)}</span>
            <span className="ob-suggest__email">{clean}</span>
          </span>
        </button>
      ) : (
        <div className="ob-members">
          <div className="ob-member">
            {account.avatar ? <img className="ob-avatar" src={account.avatar} alt="" /> : <span className="ob-avatar" />}
            <span className="ob-person__text">
              <span className="ob-member__name">{account.username}</span>
              <span className="ob-member__email">{account.email}</span>
            </span>
            <span className="ob-owner">Owner</span>
          </div>
          {team.map((m, i) => (
            <div key={m.email} className="ob-member">
              <span className="ob-avatar" />
              <span className="ob-person__text">
                <span className="ob-member__name">
                  {m.name}
                  <span className="ob-invited">Invited</span>
                </span>
                <span className="ob-member__email">{m.email}</span>
              </span>
              <RoleSelect
                value={m.role}
                onChange={(r) => onChange(team.map((x, j) => (j === i ? { ...x, role: r } : x)))}
                onRemove={() => onChange(team.filter((_, j) => j !== i))}
              />
            </div>
          ))}
        </div>
      )}

      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn--outline" onClick={onBack}>
          Back
        </button>
        <button type="button" className="ob-btn ob-btn--primary" disabled={team.length === 0} onClick={onDone}>
          Done
        </button>
      </div>
    </Shell>
  );
}

/** New Game → Add a game → (Invite People) → All Done! → Open. */
export function AddGameFlow({ onClose, onOpen }: { onClose: () => void; onOpen: () => void }) {
  const { createGame } = useStore();
  const [step, setStep] = useState<'game' | 'people' | 'done'>('game');
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState<string>();
  const [coverError, setCoverError] = useState('');
  const [team, setTeam] = useState<Member[]>([]);
  const [created, setCreated] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Member['role']>('Can View');
  const { requestLeave, confirmation } = useUnsavedChanges(step !== 'done' && !!(title || cover || team.length || inviteEmail || inviteRole !== 'Can View'));
  const requestClose = () => requestLeave(onClose);
  const file = useRef<HTMLInputElement>(null);
  const name = title.trim();

  if (step === 'people') return (
    <>
      <AddPeople team={team} onChange={setTeam} email={inviteEmail} setEmail={setInviteEmail} role={inviteRole} setRole={setInviteRole} onBack={() => setStep('game')} onDone={() => setStep('game')} />
      {confirmation}
    </>
  );

  if (step === 'done')
    return (
      <Shell width={759} onClose={onClose} className="ob-done">
        <RoundClose onClick={onClose} />
        <Icon name="ob-bigcheck" size={63} />
        <p className="t-h3" style={{ color: '#000' }}>
          All Done!
        </p>
        <p className="ob-done__sub">{created} has been added successfully</p>
        {team.length > 0 && <PeopleBadge count={team.length} label={`${team.length} Shared`} />}
        <button type="button" className="ob-btn ob-btn--primary ob-open" onClick={onOpen}>
          Open
        </button>
        <button type="button" className="ob-cancel-link" onClick={onClose}>
          Cancel
        </button>
      </Shell>
    );

  return (
    <Shell width={759} onClose={requestClose} className="ob-add">
      <RoundClose onClick={requestClose} />
      <p className="t-h3 ob-add__title" style={{ color: '#000' }}>
        Add a game
      </p>
      <p className="ob-add__sub">Set up a space to manage your game's marketing.</p>

      <div className="ob-cover-wrap">
        <button type="button" className={`ob-cover ${cover ? 'has-image' : ''}`} onClick={() => file.current?.click()} aria-label="Upload cover image">
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <>
              <Icon name="ob-upload" size={31} />
              <span>
                Upload Cover
                <br />
                Image
              </span>
            </>
          )}
        </button>
        {cover && (
          <button type="button" className="ob-swap" aria-label="Change cover image" onClick={() => file.current?.click()}>
            <Icon name="ob-swap" size={20} />
          </button>
        )}
        <input
          ref={file}
          type="file"
          hidden
          accept={IMAGE_TYPES.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            readImage(f, 50, 354, 456)
              .then((url) => {
                setCover(url);
                setCoverError('');
              })
              .catch((err: Error) => setCoverError(err.message));
          }}
        />
      </div>
      {coverError && <p className="t-body-2 c-negative ob-center">{coverError}</p>}

      <label className="ob-field">
        <span className="ob-label">
          Game title<span className="req">*</span>
        </span>
        <input
          className="ob-input"
          placeholder="Untitled Game"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name) (e.currentTarget.closest('.ob-dialog')?.querySelector('.ob-next') as HTMLButtonElement | null)?.click();
          }}
        />
      </label>

      <div className="ob-invite-row">
        <button type="button" className="ob-invite-link" onClick={() => setStep('people')}>
          Invite People
        </button>
        {team.length > 0 && <PeopleBadge count={team.length} />}
      </div>

      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn--outline" onClick={requestClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ob-btn ob-btn--primary ob-next"
          disabled={!name}
          onClick={() => {
            createGame({ name, coverImage: cover, team });
            setCreated(name);
            setStep('done');
          }}
        >
          Next
        </button>
      </div>
      {confirmation}
    </Shell>
  );
}
