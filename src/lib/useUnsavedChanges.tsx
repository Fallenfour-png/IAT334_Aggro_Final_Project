import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlocker } from 'react-router-dom';
import { StackedConfirm } from '../components/ui/Dialog';

function DiscardPrompt({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
      } else if (event.key === 'Tab') {
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault();
        buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onCancel]);

  return createPortal(
    <div className="unsaved-changes" ref={ref}>
      <StackedConfirm
        tone="warning"
        title="Discard your changes?"
        body="You have unsaved changes. If you leave now, they won’t be saved."
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </div>,
    document.body,
  );
}

/** Guard local dismissal, router navigation (including Back), and leaving the page. */
export function useUnsavedChanges(dirty: boolean) {
  const bypass = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const blocker = useBlocker(useCallback(() => dirty && !bypass.current, [dirty]));

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      if (bypass.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const requestLeave = (action: () => void) => {
    if (dirty) setPending(() => action);
    else action();
  };
  const keepEditing = useCallback(() => {
    setPending(null);
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);
  const discard = () => {
    setPending(null);
    if (blocker.state === 'blocked') blocker.proceed();
    else if (pending) {
      // A confirmed close may itself navigate (for example, closing the new-game wizard).
      bypass.current = true;
      try { pending(); }
      finally { queueMicrotask(() => { bypass.current = false; }); }
    }
  };

  return {
    requestLeave,
    confirmation: pending || blocker.state === 'blocked' ? <DiscardPrompt onCancel={keepEditing} onConfirm={discard} /> : null,
  };
}
