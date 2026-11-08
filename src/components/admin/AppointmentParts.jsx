import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MessageSquare, Phone } from 'lucide-react';
import { STATUS_LABEL, STATUS_STYLE } from '../../features/appointments/appointmentStatus';
import { smsHref, telHref } from '../../features/appointments/contact';
import { formatManila } from '../../services/api';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-widest border ${STATUS_STYLE[status] ?? ''}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Tap to call / tap to text. Hidden when there is no phone number.
export function ContactLinks({ phone, name }) {
  const tel = telHref(phone);
  if (!tel) return null;
  const linkClass =
    'inline-flex items-center gap-1.5 border border-brand-blood/30 px-2.5 py-1 text-[11px] uppercase tracking-widest text-brand-muted hover:text-brand-cream hover:border-brand-cream transition-colors';
  return (
    <span className="inline-flex flex-wrap gap-2">
      <a href={tel} aria-label={`Call ${name || 'client'}`} className={linkClass}>
        <Phone size={12} /> Call
      </a>
      <a href={smsHref(phone)} aria-label={`Text ${name || 'client'}`} className={linkClass}>
        <MessageSquare size={12} /> Text
      </a>
    </span>
  );
}

// Name, number, email, reference code and the client's notes.
export function ClientInfo({ apt, withContact = true }) {
  return (
    <div className="min-w-0">
      <div className="text-brand-cream tracking-wide">{apt.guest_name || 'Guest'}</div>
      <div className="text-xs text-brand-muted">{apt.guest_phone}</div>
      {apt.guest_email && <div className="text-xs text-brand-muted break-all">{apt.guest_email}</div>}
      {apt.reference_code && <div className="text-[10px] tracking-widest text-brand-muted/70 mt-1">Ref {apt.reference_code}</div>}
      {withContact && (
        <div className="mt-2">
          <ContactLinks phone={apt.guest_phone} name={apt.guest_name} />
        </div>
      )}
      {apt.notes && (
        <div className="mt-3 max-w-sm whitespace-pre-wrap break-words border-l-2 border-brand-gold/50 pl-3 text-xs text-brand-muted">
          <span className="block text-[10px] uppercase tracking-widest text-brand-gold">Customer notes</span>
          {apt.notes}
        </div>
      )}
    </div>
  );
}

// What each status can do. Primary buttons are the usual next step; the rest live in the More menu.
// (Mirrors the rules enforced in the database.)
const PRIMARY = {
  PENDING: [['approve', 'Approve', 'primary'], ['reject', 'Reject', 'quiet']],
  APPROVED: [['complete', 'Complete', 'primary']],
};
const MORE = {
  PENDING: [['reschedule', 'Reschedule'], ['cancel', 'Cancel appointment', 'danger']],
  APPROVED: [['no_show', 'Mark no-show'], ['reschedule', 'Reschedule'], ['cancel', 'Cancel appointment', 'danger']],
};

export function AppointmentActions({ apt, busy, onAction, onHistory, historyOpen, align = 'right' }) {
  const primary = PRIMARY[apt.status] ?? [];
  const more = MORE[apt.status] ?? [];
  const buttonClass = (kind) =>
    kind === 'primary'
      ? 'flex items-center gap-2 border border-brand-cream bg-brand-cream text-brand-black px-4 py-2 text-xs uppercase tracking-widest hover:bg-transparent hover:text-brand-cream transition-colors disabled:opacity-40'
      : 'px-3 py-2 text-xs uppercase tracking-widest text-brand-muted hover:text-brand-blood transition-colors disabled:opacity-40';
  return (
    <div className={`flex flex-wrap items-center gap-2 ${align === 'right' ? 'sm:justify-end' : ''}`}>
      {primary.map(([action, label, kind]) => (
        <button key={action} type="button" disabled={busy} onClick={() => onAction(apt, action)} className={buttonClass(kind)}>
          {kind === 'primary' && <Check size={14} />} {label}
        </button>
      ))}
      <MoreMenu
        disabled={busy}
        items={[
          ...more.map(([action, label, tone]) => ({ key: action, label, tone, run: () => onAction(apt, action) })),
          { key: 'history', label: historyOpen ? 'Hide history' : 'View history', run: () => onHistory(apt) },
        ]}
      />
    </div>
  );
}

// A small dropdown. Closes on outside click / Escape; arrow keys move between items.
function MoreMenu({ items, disabled }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menu = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  useEffect(() => {
    if (open) menu.current?.querySelector('button')?.focus();
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      wrap.current?.querySelector('[aria-haspopup]')?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const buttons = [...menu.current.querySelectorAll('button')];
      const i = buttons.indexOf(document.activeElement);
      buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  };

  return (
    <div ref={wrap} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 border border-brand-blood/30 px-3 py-2 text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream hover:border-brand-cream transition-colors disabled:opacity-40"
      >
        More <ChevronDown size={12} />
      </button>
      {open && (
        <ul ref={menu} role="menu" className="absolute right-0 z-30 mt-1 min-w-[12rem] border border-brand-blood/40 bg-brand-black shadow-xl">
          {items.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.run();
                }}
                className={`block w-full px-4 py-3 text-left text-xs uppercase tracking-widest hover:bg-brand-blood/10 ${item.tone === 'danger' ? 'text-brand-blood' : 'text-brand-cream'}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HistoryList({ history }) {
  if (!history) return null;
  return (
    <div className="text-xs text-brand-muted">
      {history.loading && 'Loading history…'}
      {!history.loading && history.events.length === 0 && 'No history recorded.'}
      <ul className="space-y-1">
        {history.events.map((ev) => (
          <li key={ev.id}>
            <span className="text-brand-cream">{formatManila(ev.created_at)}</span>
            <span className="mx-2 text-brand-blood">|</span>
            {ev.old_status && ev.old_status !== ev.new_status
              ? `${STATUS_LABEL[ev.old_status] ?? ev.old_status} → ${STATUS_LABEL[ev.new_status] ?? ev.new_status}`
              : STATUS_LABEL[ev.new_status] ?? ev.new_status}
            {ev.note ? ` · ${ev.note}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

// One appointment as a card (phones, and the selected day in the calendar view).
export function AppointmentCard({ apt, overdue, busy, history, onAction, onHistory }) {
  const slot = Array.isArray(apt.availability_slots) ? apt.availability_slots[0] : apt.availability_slots;
  return (
    <article className="bg-brand-dark border border-brand-blood/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-brand-cream">
          {slot ? formatManila(slot.starts_at) : '—'}
          <div className="text-xs text-brand-muted mt-0.5">{apt.services?.name ?? '—'}</div>
        </div>
        <StatusBadge status={apt.status} />
      </div>
      {overdue && (
        <p className="mt-3 text-xs text-brand-gold">This time has passed. Mark it Complete or No-show.</p>
      )}
      <div className="mt-4">
        <ClientInfo apt={apt} />
      </div>
      <div className="mt-5 border-t border-brand-blood/10 pt-4">
        <AppointmentActions apt={apt} busy={busy} onAction={onAction} onHistory={onHistory} historyOpen={history?.id === apt.id} align="left" />
      </div>
      {history?.id === apt.id && (
        <div className="mt-4 border-t border-brand-blood/10 pt-4">
          <HistoryList history={history} />
        </div>
      )}
    </article>
  );
}
