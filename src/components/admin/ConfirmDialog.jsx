import { useCallback, useEffect, useRef, useState } from 'react';

// Styled replacement for window.confirm.
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, cancelLabel, tone: 'danger' }))) return;
//   ...and render {confirmDialog} once somewhere in the page.
export function useConfirm() {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current?.(false); // a newer question replaces an unanswered one
        resolver.current = resolve;
        setOptions(opts);
      }),
    []
  );

  const answer = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  const dialog = options ? <ConfirmDialog {...options} onAnswer={answer} /> : null;
  return [confirm, dialog];
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'neutral', onAnswer }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // focus the safe choice first, and put focus back where it was when the dialog closes
  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onAnswer(false);
    } else if (e.key === 'Tab') {
      // keep keyboard focus inside the dialog
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onAnswer(false)}
      onKeyDown={onKeyDown}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-md bg-brand-dark border border-brand-blood/40 p-6 sm:p-8"
      >
        <h3 id="confirm-title" className="text-2xl font-serif text-brand-cream">{title}</h3>
        {message && (
          <p id="confirm-message" className="mt-3 text-sm font-light text-brand-muted whitespace-pre-line">{message}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onAnswer(false)}
            className="border border-brand-cream/40 text-brand-cream px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onAnswer(true)}
            className={`px-5 py-2.5 text-xs uppercase tracking-widest border transition-colors ${
              tone === 'danger'
                ? 'border-brand-blood bg-brand-blood text-brand-cream hover:bg-brand-cream hover:text-brand-black'
                : 'border-brand-cream bg-brand-cream text-brand-black hover:bg-transparent hover:text-brand-cream'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
