import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../../lib/icons';
import { useClickOutside } from '../../lib/useClickOutside';

export function MenuOption({
  label,
  selected,
  onSelect,
  className = '',
}: {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={`menu-option ${className}`} onClick={onSelect} role="menuitemradio" aria-checked={!!selected}>
      <span className={selected ? 't-btn-bold' : 't-btn'}>{label}</span>
      {selected && <Icon name="check-small" size={10} />}
    </button>
  );
}

/** A trigger with a popover that closes on outside click / Escape. */
export function Popover({
  trigger,
  children,
  menuStyle,
  menuClassName = 'menu menu--list',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  menuStyle?: CSSProperties;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);
  return (
    <div className="popover-anchor" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={menuClassName} style={menuStyle} role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
}

/** Figma "Small buttons" Filter: turns tinted with a count when filters are on ("Filter · 1"). */
export function FilterButton({ open, onClick, count = 0 }: { open: boolean; onClick: () => void; count?: number }) {
  const active = count > 0;
  return (
    <button type="button" className={`btn btn--outline ${active ? 'btn--filter-active' : ''}`} aria-expanded={open} onClick={onClick}>
      <span className="t-btn">{active ? `Filter · ${count}` : 'Filter'}</span>
      <Icon name="filter-chevron" size={18} tint />
    </button>
  );
}

export interface Chip {
  label: string;
  onRemove: () => void;
}

/** Figma "Active filters": removable chips plus "Clear", shown under the card header. */
export function FilterChips({ chips, onClear }: { chips: Chip[]; onClear: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="filter-chips">
      {chips.map((c) => (
        <span key={c.label} className="filter-chip t-btn">
          {c.label}
          <button type="button" className="filter-chip__x" aria-label={`Remove ${c.label} filter`} onClick={c.onRemove}>
            <Icon name="chip-x" size={10} />
          </button>
        </span>
      ))}
      <button type="button" className="t-btn c-accent filter-clear" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
