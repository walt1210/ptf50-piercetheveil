import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, CalendarX } from 'lucide-react';
import {
  listSlots,
  createSlot,
  listActiveBookingsOnSlots,
  setSlotBlocked,
} from '../../features/appointments/appointmentService';
import { toUserMessage } from '../../services/api';

const TZ = 'Asia/Manila'; // UTC+8, no daylight saving
const WINDOW_DAYS = 90;
const MAX_NEW_SLOTS = 50;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ---- Manila time helpers (DB stays in UTC) ---- */
const dateKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(d)); // YYYY-MM-DD
const weekdayOf = (d) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date(d));
const minutesOfDay = (d) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(d));
  return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
};
const fmtMinutes = (m) => {
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtDateKey = (key) =>
  new Date(`${key}T00:00:00+08:00`).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: '2-digit', year: 'numeric' });
const manilaToDate = (date, time) => new Date(`${date}T${time}:00+08:00`);

const inputClass =
  'w-full bg-brand-black border border-brand-blood/30 p-3 text-brand-cream text-sm focus:outline-none focus:border-brand-cream color-scheme-dark';

export default function ScheduleManagement() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [blockDate, setBlockDate] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState({ date: '', start: '10:00', end: '19:00', length: '60', capacity: '1' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = manilaToDate(dateKey(new Date()), '00:00');
      const to = new Date(from.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
      setSlots(await listSlots(from, to));
      setError('');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Weekly pattern derived from real slots (no separate hours table exists).
  const hours = useMemo(() => {
    const byDay = new Map();
    for (const s of slots) {
      const day = weekdayOf(s.starts_at);
      const open = minutesOfDay(s.starts_at);
      const close = minutesOfDay(s.ends_at);
      const cur = byDay.get(day);
      byDay.set(day, cur ? { open: Math.min(cur.open, open), close: Math.max(cur.close, close) } : { open, close });
    }
    return WEEKDAYS.map((day) => {
      const h = byDay.get(day);
      return h ? { day, open: fmtMinutes(h.open), close: fmtMinutes(h.close) } : { day, open: 'Closed', close: 'Closed' };
    });
  }, [slots]);

  // A date counts as blocked when it has slots and every one of them is blocked.
  const blockedDates = useMemo(() => {
    const byDate = new Map();
    for (const s of slots) {
      const k = dateKey(s.starts_at);
      const cur = byDate.get(k) ?? { total: 0, blocked: 0 };
      cur.total += 1;
      if (s.is_blocked) cur.blocked += 1;
      byDate.set(k, cur);
    }
    return [...byDate.entries()]
      .filter(([, v]) => v.blocked === v.total)
      .map(([key, v]) => ({ key, total: v.total }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [slots]);

  const setDayBlocked = async (key, blocked) => {
    setError('');
    setNotice('');
    const targets = slots.filter((s) => dateKey(s.starts_at) === key && s.is_blocked !== blocked);
    if (targets.length === 0) {
      setError(blocked ? 'There are no open slots on that date to block.' : 'Nothing to unblock on that date.');
      return;
    }
    setBusy(true);
    try {
      // Blocking does NOT cancel bookings that already exist, so tell the admin before doing it.
      if (blocked) {
        const booked = await listActiveBookingsOnSlots(targets.map((s) => s.id));
        if (booked.length > 0) {
          const pendingCount = booked.filter((b) => b.status === 'PENDING').length;
          const approvedCount = booked.length - pendingCount;
          const ok = window.confirm(
            `${fmtDateKey(key)} already has ${booked.length} active booking${booked.length === 1 ? '' : 's'} ` +
              `(${approvedCount} approved, ${pendingCount} pending). Blocking the date will NOT cancel them. ` +
              `You will need to reschedule or cancel them in Appointments.\n\nBlock the date anyway?`
          );
          if (!ok) return;
        }
      }
      await Promise.all(targets.map((s) => setSlotBlocked(s.id, blocked)));
      setNotice(
        `${blocked ? 'Blocked' : 'Unblocked'} ${targets.length} slot${targets.length === 1 ? '' : 's'} on ${fmtDateKey(key)}.` +
          (blocked ? ' Existing bookings on that date were not changed.' : '')
      );
      await load();
    } catch (e) {
      setError(toUserMessage(e));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!blockDate) return setError('Pick a date to block.');
    await setDayBlocked(blockDate, true);
    setBlockDate('');
  };

  const handleAddSlots = async () => {
    setError('');
    setNotice('');
    const length = Number(add.length);
    const capacity = Number(add.capacity);
    if (!add.date) return setError('Pick a date for the new slots.');
    if (!Number.isInteger(length) || length <= 0) return setError('Slot length must be a whole number of minutes.');
    if (!Number.isInteger(capacity) || capacity <= 0) return setError('Capacity must be at least 1.');

    const start = manilaToDate(add.date, add.start);
    const end = manilaToDate(add.date, add.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return setError('End time must be after the start time.');
    }

    if (end.getTime() <= Date.now()) return setError('That time has already passed. Pick a future date.');

    // skip any new slot that overlaps an existing one (not just an identical start time)
    const existing = slots.map((s) => [new Date(s.starts_at).getTime(), new Date(s.ends_at).getTime()]);
    const overlaps = (a, b) => existing.some(([es, ee]) => a < ee && b > es);
    const planned = [];
    let skipped = 0;
    for (let t = start.getTime(); t + length * 60000 <= end.getTime(); t += length * 60000) {
      const tEnd = t + length * 60000;
      if (t <= Date.now()) continue; // never create slots in the past
      if (overlaps(t, tEnd)) skipped += 1;
      else planned.push({ startsAt: new Date(t), endsAt: new Date(tEnd), capacity });
    }
    if (planned.length === 0) {
      return setError(
        skipped > 0
          ? 'No new slots to add: every slot in that window overlaps an existing one.'
          : 'No new slots to add. The window is shorter than one slot, or already in the past.'
      );
    }
    if (planned.length > MAX_NEW_SLOTS) return setError(`That would create ${planned.length} slots. Add at most ${MAX_NEW_SLOTS} at a time.`);

    setBusy(true);
    let created = 0;
    try {
      for (const p of planned) {
        await createSlot(p);
        created += 1;
      }
      setNotice(
        `Added ${created} slot${created === 1 ? '' : 's'} on ${fmtDateKey(add.date)}.` +
          (skipped > 0 ? ` Skipped ${skipped} that overlapped existing slots.` : '')
      );
      setShowAdd(false);
    } catch (e) {
      setError(`Added ${created} of ${planned.length} slots. ${toUserMessage(e)}`);
    } finally {
      setBusy(false);
      await load();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6">
        <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Schedule & Availability</h2>
        <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Set operating hours and block specific dates.</p>
      </header>

      {error && (
        <p role="alert" className="border border-brand-blood/50 bg-brand-dark text-brand-blood text-sm p-4">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border border-brand-cream/30 bg-brand-dark text-brand-cream text-sm p-4">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Operating Hours */}
        <div className="bg-brand-dark border border-brand-blood/20 p-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-brand-blood" size={20} />
            <h3 className="text-xl font-serif text-brand-cream tracking-wide">Operating Hours</h3>
          </div>
          <p className="text-brand-muted text-xs font-light mb-6">Based on bookable slots in the next {WINDOW_DAYS} days.</p>

          {loading ? (
            <p className="text-brand-muted text-sm font-light">Loading hours...</p>
          ) : (
            <div className="space-y-4">
              {hours.map((h) => (
                <div key={h.day} className="flex justify-between items-center border-b border-brand-blood/10 pb-4">
                  <span className="text-brand-cream font-light tracking-wider">{h.day}</span>
                  <span className={`text-sm tracking-widest uppercase ${h.open === 'Closed' ? 'text-brand-blood' : 'text-brand-muted'}`}>
                    {h.open === 'Closed' ? 'Closed' : `${h.open} - ${h.close}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showAdd && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <label className="block col-span-2">
                <span className="text-[10px] text-brand-muted uppercase tracking-widest">Date</span>
                <input type="date" className={`${inputClass} mt-1`} value={add.date} onChange={(e) => setAdd({ ...add, date: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[10px] text-brand-muted uppercase tracking-widest">From</span>
                <input type="time" className={`${inputClass} mt-1`} value={add.start} onChange={(e) => setAdd({ ...add, start: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[10px] text-brand-muted uppercase tracking-widest">Until</span>
                <input type="time" className={`${inputClass} mt-1`} value={add.end} onChange={(e) => setAdd({ ...add, end: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[10px] text-brand-muted uppercase tracking-widest">Slot length (mins)</span>
                <input type="number" min="1" className={`${inputClass} mt-1`} value={add.length} onChange={(e) => setAdd({ ...add, length: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[10px] text-brand-muted uppercase tracking-widest">Capacity per slot</span>
                <input type="number" min="1" className={`${inputClass} mt-1`} value={add.capacity} onChange={(e) => setAdd({ ...add, capacity: e.target.value })} />
              </label>
              <button
                onClick={handleAddSlots}
                disabled={busy}
                className="col-span-2 border border-brand-blood text-brand-blood py-3 text-xs uppercase tracking-widest hover:bg-brand-blood hover:text-brand-cream transition-all disabled:opacity-50"
              >
                {busy ? 'Adding...' : 'Create slots'}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAdd((v) => !v)}
            className="w-full mt-8 border border-brand-cream text-brand-cream py-3 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all"
          >
            {showAdd ? 'Cancel' : 'Add Slots'}
          </button>
        </div>

        {/* Blocked Dates */}
        <div className="bg-brand-dark border border-brand-blood/20 p-8 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <CalendarX className="text-brand-blood" size={20} />
            <h3 className="text-xl font-serif text-brand-cream tracking-wide">Blocked Dates</h3>
          </div>
          <p className="text-brand-muted text-sm font-light mb-6">Add dates when the studio will be closed for holidays or events.</p>

          <div className="flex gap-4 mb-8">
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              className="flex-1 min-w-0 bg-brand-black border border-brand-blood/30 p-3 text-brand-cream text-sm focus:outline-none focus:border-brand-cream color-scheme-dark"
            />
            <button
              onClick={handleBlock}
              disabled={busy}
              className="border border-brand-blood text-brand-blood px-6 py-3 text-xs uppercase tracking-widest hover:bg-brand-blood hover:text-brand-cream transition-all disabled:opacity-50"
            >
              Block
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-brand-muted text-sm font-light">Loading blocked dates...</p>
            ) : blockedDates.length === 0 ? (
              <p className="text-brand-muted text-sm font-light">No blocked dates. Dates need existing slots before they can be blocked.</p>
            ) : (
              blockedDates.map((d) => (
                <div key={d.key} className="flex justify-between items-center gap-4 p-4 bg-brand-black border border-brand-blood/10">
                  <span className="text-brand-cream text-sm tracking-wider">{fmtDateKey(d.key)}</span>
                  <span className="flex items-center gap-4">
                    <span className="text-brand-muted text-xs uppercase tracking-widest">
                      {d.total} slot{d.total === 1 ? '' : 's'}
                    </span>
                    <button
                      onClick={() => setDayBlocked(d.key, false)}
                      disabled={busy}
                      className="text-brand-muted text-xs uppercase tracking-widest hover:text-brand-cream disabled:opacity-50"
                    >
                      Unblock
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
