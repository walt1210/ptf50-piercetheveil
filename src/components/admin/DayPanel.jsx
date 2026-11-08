import { useState } from 'react';
import { Ban, CalendarPlus, Phone, Unlock } from 'lucide-react';
import { formatKeyLong, formatTime, todayKey } from '../../features/appointments/dateKeys';

const inputClass =
  'w-full bg-brand-black border border-brand-blood/30 p-3 text-brand-cream text-sm focus:outline-none focus:border-brand-cream color-scheme-dark';
const labelClass = 'text-[10px] text-brand-muted uppercase tracking-widest';

// Everything about one day: its slots, who booked them, block/unblock, and adding slots.
// The page owns the data and the actions; this component only draws and reports clicks.
export default function DayPanel({ dayKey, slots, bookingsBySlot, busy, onBlockDay, onToggleSlot, onAddSlots }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ start: '10:00', end: '19:00', length: '60', capacity: '1' });
  const isPast = dayKey < todayKey();
  const anyOpen = slots.some((s) => !s.is_blocked);
  const anyBlocked = slots.some((s) => s.is_blocked);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    const ok = await onAddSlots(form);
    if (ok) setShowAdd(false);
  };

  return (
    <section className="bg-brand-dark border border-brand-blood/20 p-6 sm:p-8 h-fit" aria-labelledby="day-panel-title">
      <h3 id="day-panel-title" className="text-xl sm:text-2xl font-serif text-brand-cream tracking-wide">{formatKeyLong(dayKey)}</h3>
      <p className="mt-1 text-brand-muted text-sm font-light">
        {slots.length === 0 ? 'No slots on this day.' : `${slots.length} slot${slots.length === 1 ? '' : 's'}`}
        {isPast && ' · This day has passed, so it is view-only.'}
      </p>

      {!isPast && slots.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          {anyOpen && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onBlockDay(true)}
              className="flex items-center gap-2 border border-brand-blood text-brand-blood px-4 py-2 text-xs uppercase tracking-widest hover:bg-brand-blood hover:text-brand-cream transition-all disabled:opacity-50"
            >
              <Ban size={14} /> Block {anyBlocked ? 'remaining slots' : 'whole day'}
            </button>
          )}
          {anyBlocked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onBlockDay(false)}
              className="flex items-center gap-2 border border-brand-cream/40 text-brand-cream px-4 py-2 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all disabled:opacity-50"
            >
              <Unlock size={14} /> Unblock {anyOpen ? 'blocked slots' : 'whole day'}
            </button>
          )}
        </div>
      )}

      {slots.length > 0 && (
        <ul className="mt-6 space-y-3">
          {slots.map((slot) => {
            const bookings = bookingsBySlot.get(slot.id) ?? [];
            const full = bookings.length >= slot.capacity;
            const state = slot.is_blocked ? 'Blocked' : full ? 'Full' : bookings.length > 0 ? `${bookings.length}/${slot.capacity} booked` : 'Open';
            return (
              <li key={slot.id} className="bg-brand-black border border-brand-blood/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-brand-cream text-sm tracking-wide">
                      {formatTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                    </p>
                    <p className={`text-xs mt-1 uppercase tracking-widest ${slot.is_blocked ? 'text-brand-blood' : full ? 'text-brand-cream' : 'text-brand-muted'}`}>
                      {state}
                    </p>
                  </div>
                  {!isPast && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleSlot(slot)}
                      className="text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream transition-colors disabled:opacity-50"
                    >
                      {slot.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                  )}
                </div>
                {bookings.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-brand-blood/10 pt-3">
                    {bookings.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <span className="text-brand-cream">{b.guest_name || 'Guest'}</span>
                          <span className="text-brand-muted"> · {b.services?.name ?? 'Service'}</span>
                          <span className={`ml-2 text-[10px] uppercase tracking-widest ${b.status === 'PENDING' ? 'text-brand-gold' : 'text-brand-muted'}`}>
                            {b.status === 'PENDING' ? 'Pending' : 'Approved'}
                          </span>
                        </span>
                        {b.guest_phone && (
                          <a href={`tel:${b.guest_phone}`} aria-label={`Call ${b.guest_name || 'guest'}`} className="shrink-0 text-brand-muted hover:text-brand-cream">
                            <Phone size={14} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!isPast && (
        <div className="mt-6">
          {showAdd && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>From</span>
                <input type="time" className={`${inputClass} mt-1`} value={form.start} onChange={set('start')} />
              </label>
              <label className="block">
                <span className={labelClass}>Until</span>
                <input type="time" className={`${inputClass} mt-1`} value={form.end} onChange={set('end')} />
              </label>
              <label className="block">
                <span className={labelClass}>Slot length (mins)</span>
                <input type="number" min="1" className={`${inputClass} mt-1`} value={form.length} onChange={set('length')} />
              </label>
              <label className="block">
                <span className={labelClass}>People per slot</span>
                <input type="number" min="1" className={`${inputClass} mt-1`} value={form.capacity} onChange={set('capacity')} />
              </label>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="col-span-2 border border-brand-blood text-brand-blood py-3 text-xs uppercase tracking-widest hover:bg-brand-blood hover:text-brand-cream transition-all disabled:opacity-50"
              >
                {busy ? 'Adding…' : 'Create slots'}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="w-full flex items-center justify-center gap-2 border border-brand-cream text-brand-cream py-3 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all"
          >
            <CalendarPlus size={14} /> {showAdd ? 'Cancel' : 'Add slots to this day'}
          </button>
        </div>
      )}
    </section>
  );
}
