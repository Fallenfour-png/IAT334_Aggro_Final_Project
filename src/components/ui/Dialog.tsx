import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../lib/icons';
import { useClickOutside } from '../../lib/useClickOutside';
import { MenuOption } from './Menu';

export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  width = 600,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`dialog ${className}`} style={{ width }} role="dialog" aria-modal="true">
        {title !== undefined && (
          <div className="dialog-header">
            <div className="dialog-title">
              <p className="t-h3">{title}</p>
              {subtitle && <p className="t-body-2 dialog-subtitle">{subtitle}</p>}
            </div>
            <CloseButton onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="close-btn" onClick={onClick} aria-label="Close">
      <Icon name="close-16" size={16} tint />
    </button>
  );
}

/** Confirm stacked on top of a dialog (Figma "Confirm dialog (stacked)"). */
export function StackedConfirm({
  tone,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  tone: 'danger' | 'warning';
  title: string;
  body: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="confirm-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="confirm" role="alertdialog">
        <div className={`confirm-icon confirm-icon--${tone}`}>
          <Icon name={tone === 'danger' ? 'trash-22' : 'warning-22'} size={22} />
        </div>
        <p className="t-h4 c-1">{title}</p>
        <p className="t-body-2 c-2">{body}</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn--cancel t-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn--danger t-btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <p className="t-body field-label">
      {children}
      {required && (
        <>
          {' '}
          <span className="req">*</span>
        </>
      )}
    </p>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <label className={`input t-body ${error ? 'is-error' : ''}`}>
      <input className="t-body" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function NumberField({
  value,
  onChange,
  placeholder,
  suffix,
  error,
  readOnly,
}: {
  value: number | '';
  onChange?: (v: number | '') => void;
  placeholder?: string;
  suffix?: string;
  error?: boolean;
  readOnly?: boolean;
}) {
  const text = value === '' ? '' : value.toLocaleString('en-US');
  return (
    <label className={`input t-body ${error ? 'is-error' : ''} ${readOnly ? 'input--readonly' : ''}`}>
      <input
        className="t-body"
        inputMode="numeric"
        value={text}
        readOnly={readOnly}
        placeholder={placeholder}
        size={Math.max(1, text.length || (placeholder?.length ?? 1))}
        style={suffix ? { flex: '0 0 auto' } : undefined}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '');
          onChange?.(digits === '' ? '' : Number(digits));
        }}
      />
      {suffix && <span className="suffix t-body">{suffix}</span>}
      {suffix && <span style={{ flex: 1 }} />}
    </label>
  );
}

export function DateField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = (event: React.MouseEvent | React.KeyboardEvent) => {
    const input = inputRef.current;
    if (!input || typeof input.showPicker !== 'function') return;
    input.focus({ preventScroll: true });
    try {
      input.showPicker();
      // Avoid the label forwarding a second click or the input toggling the picker again.
      event.preventDefault();
    } catch {
      // Keep the native input's default interaction when showPicker is unavailable here.
    }
  };

  return (
    <label className={`input date-input t-body ${error ? 'is-error' : ''}`} onClick={openPicker}>
      <span>{value ? value.replace(/-/g, '/') : <span className="c-2">YYYY/MM/DD</span>}</span>
      <Icon name="calendar-16" size={16} />
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') openPicker(event);
        }}
        aria-label="Date"
        aria-invalid={error || undefined}
      />
    </label>
  );
}

/** Figma dropdown field: value + literal "v" chevron, opens an option list. */
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  renderValue,
}: {
  value: T | '';
  options: readonly T[];
  onChange: (v: T) => void;
  placeholder?: string;
  renderValue?: (v: T) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  return (
    <div className="popover-anchor" ref={ref} style={{ width: '100%' }}>
      <button type="button" className={`input t-body ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className={`nowrap ${value ? '' : 'c-2'}`}>{value ? (renderValue ? renderValue(value) : value) : placeholder}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="select-menu" role="listbox">
          {options.map((o) => (
            <MenuOption
              key={o}
              label={o}
              selected={o === value}
              onSelect={() => {
                onChange(o);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
