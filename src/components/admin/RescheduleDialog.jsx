import { useEffect, useMemo, useRef, useState } from 'react';
import AdminCalendar from './AdminCalendar';
import { getAvailableSlots } from '../../features/appointments/appointmentService';
import {
  addDays,
  addMonths,
  atManila,
  dateKey,
  formatKeyLong,
  formatTime,
  monthGrid,
  monthKeyOf,
  todayKey,
} from '../../features/appointments/dateKeys';
import { toUserMessage } from '../../services/api';

const LEGEND = [['open', 'Has open times'], ['none', 'Nothing open']];

// Pick a new day on the calendar, then a time, then confirm. onPick(slot) does the actual change.
export default function RescheduleDialog({ appointment, onClose, onPick }) {
  const currentSlot = Array.isArray(appointment.availability_slots) ? appointment.availability_slots[0] : appointment.availability_slots;
  const startMonth = (() => {
    const key = currentSlot ? dateKey(currentSlot.starts_at) : todayKey();
    return monthKeyOf(key < todayKey() ? todayKey() : key);
  })();

  const [monthKey, setMonthKey] = useState(startMonth);
  const [selectedKey, setSelectedKey] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef(null);
  const loadId = useRef(0);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const id = (loadId.current += 1);
    setLoading(true);
    setError('');
    const grid = monthGrid(monthKey);
    const from = new Date(Math.max(Date.now(), atManila(grid[0], '00:00').getTime()));
    const to = atManila(addDays(grid[grid.length - 1], 1), '00:00');
    getAvailableSlots(from, to)
      .then((rows) => id === loadId.current && setSlots(rows.filter((s) => s.id !== appointment.slot_id)))
      .catch((e) => id === loadId.current && setError(toUserMessage(e)))
      .finally(() => id === loadId.current && setLoading(false));
  }, [monthKey, appointment.slot_id]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const k = dateKey(s.starts_at);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    return map;
  }, [slots]);

  const getDay = (key) => {
    const n = byDay.get(key)?.length ?? 0;
    return n ? { tone: 'open', label: `${n} open` } : { tone: 'none', label: '' };
  };

  const dayTimes = selectedKey ? byDay.get(selectedKey) ?? [] : [];

  const confirm = async () => {
    if (!picked) return;
    setSaving(true);
    await onPick(picked); // the page closes the dialog and shows any error
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="resched-title" className="w-full max-w-xl bg-brand-dark border border-brand-blood/30 p-5 sm:p-8 my-4">
        <h3 id="resched-title" className="text-2xl font-serif text-brand-cream">Reschedule</h3>
        <p className="mt-1 mb-5 text-xs text-brand-muted">
          {appointment.guest_name}: {appointment.services?.name}. Pick a new day, then a time.
        </p>

        <div aria-busy={loading} className={loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
          <AdminCalendar
            monthKey={monthKey}
            onMonthChange={(m) => {
              setMonthKey(m);
              setSelectedKey(null);
              setPicked(null);
            }}
            selectedKey={selectedKey}
            onSelect={(k) => {
              setSelectedKey(k);
              setPicked(null);
            }}
            getDay={getDay}
            minMonthKey={monthKeyOf(todayKey())}
            maxMonthKey={addMonths(monthKeyOf(todayKey()), 12)}
            legend={LEGEND}
            pendingLegend={null}
          />
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-brand-blood">{error}</p>}

        {selectedKey && (
          <div className="mt-5">
            <p className="text-sm text-brand-cream">{formatKeyLong(selectedKey)}</p>
            {dayTimes.length === 0 ? (
              <p className="mt-2 text-sm text-brand-muted">No open times on this day. Pick a day marked "open".</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {dayTimes.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={picked?.id === s.id}
                      onClick={() => setPicked(s)}
                      className={`border px-4 py-2 text-sm transition-colors ${picked?.id === s.id ? 'border-brand-cream bg-brand-cream text-brand-black' : 'border-brand-blood/40 text-brand-cream hover:border-brand-cream'}`}
                    >
                      {formatTime(s.starts_at)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="border border-brand-cream/40 text-brand-cream px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!picked || saving}
            onClick={confirm}
            className="border border-brand-cream bg-brand-cream text-brand-black px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-transparent hover:text-brand-cream transition-colors disabled:opacity-40"
          >
            {saving ? 'Moving…' : picked ? `Move to ${formatTime(picked.starts_at)}` : 'Choose a time'}
          </button>
        </div>
      </div>
    </div>
  );
}
