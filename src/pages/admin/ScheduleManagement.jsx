import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminCalendar from '../../components/admin/AdminCalendar';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import DayPanel from '../../components/admin/DayPanel';
import WeeklyPlanner from '../../components/admin/WeeklyPlanner';
import { createSlots, listBookingsInRange, listSlots, setSlotsBlocked } from '../../features/appointments/appointmentService';
import {
  addDays,
  addMonths,
  atManila,
  dateKey,
  formatKeyShort,
  monthGrid,
  monthKeyOf,
  planDaySlots,
  todayKey,
} from '../../features/appointments/dateKeys';
import { toUserMessage } from '../../services/api';

const MAX_DAY_SLOTS = 50;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function ScheduleManagement() {
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(todayKey()));
  const [selectedKey, setSelectedKey] = useState(() => todayKey());
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const panelRef = useRef(null);
  const loadId = useRef(0);

  // Load the slots and bookings for the 6 weeks the calendar is showing.
  const load = useCallback(async () => {
    const id = (loadId.current += 1);
    setLoading(true);
    try {
      const grid = monthGrid(monthKey);
      const from = atManila(grid[0], '00:00');
      const to = atManila(addDays(grid[grid.length - 1], 1), '00:00');
      const [slotRows, bookingRows] = await Promise.all([listSlots(from, to), listBookingsInRange(from, to)]);
      if (id !== loadId.current) return; // a newer request replaced this one
      setSlots(slotRows);
      setBookings(bookingRows);
      setError('');
    } catch (e) {
      if (id === loadId.current) setError(toUserMessage(e));
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  const slotsByDay = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const k = dateKey(s.starts_at);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    return map;
  }, [slots]);

  const bookingsBySlot = useMemo(() => {
    const map = new Map();
    for (const b of bookings) map.set(b.slot_id, [...(map.get(b.slot_id) ?? []), b]);
    return map;
  }, [bookings]);

  const getDay = (key) => {
    const list = slotsByDay.get(key);
    if (!list?.length) return { tone: 'none', label: '' };
    const pending = list.reduce((n, s) => n + (bookingsBySlot.get(s.id) ?? []).filter((b) => b.status === 'PENDING').length, 0);
    const active = list.filter((s) => !s.is_blocked);
    if (active.length === 0) return { tone: 'blocked', label: 'Blocked', badge: pending, hint: pending ? `${plural(pending, 'pending request')} on blocked slots` : '' };
    const booked = active.reduce((n, s) => n + (bookingsBySlot.get(s.id) ?? []).length, 0);
    const openSlots = active.filter((s) => (bookingsBySlot.get(s.id) ?? []).length < s.capacity).length;
    const hint = `${plural(booked, 'booking')}, ${pending} pending`;
    if (openSlots === 0) return { tone: 'full', label: 'Full', badge: pending, hint };
    return { tone: booked > 0 ? 'partial' : 'open', label: `${openSlots} open`, badge: pending, hint };
  };

  const selectDay = (key) => {
    setSelectedKey(key);
    setError('');
    setNotice('');
    if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changeMonth = (next) => {
    setMonthKey(next);
    setSelectedKey(next === monthKeyOf(todayKey()) ? todayKey() : next);
    setError('');
    setNotice('');
  };

  // Blocking never cancels bookings, so warn first when any would be affected.
  const confirmBlock = (what, affected) => {
    if (affected.length === 0) return Promise.resolve(true);
    const pending = affected.filter((b) => b.status === 'PENDING').length;
    return confirm({
      title: 'Block anyway?',
      message:
        `${what} already has ${plural(affected.length, 'active booking')} (${affected.length - pending} approved, ${pending} pending).\n\n` +
        'Blocking does NOT cancel them. You will need to reschedule or cancel them in Appointments.',
      confirmLabel: 'Block anyway',
      cancelLabel: 'Go back',
      tone: 'danger',
    });
  };

  const runBlock = async (targets, blocked, what) => {
    setError('');
    setNotice('');
    if (targets.length === 0) return;
    if (blocked && !(await confirmBlock(what, targets.flatMap((s) => bookingsBySlot.get(s.id) ?? [])))) return;
    setBusy(true);
    try {
      await setSlotsBlocked(targets.map((s) => s.id), blocked);
      setNotice(
        `${blocked ? 'Blocked' : 'Unblocked'} ${plural(targets.length, 'slot')} on ${formatKeyShort(selectedKey)}.` +
          (blocked ? ' Existing bookings were not changed.' : '')
      );
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
      await load();
    }
  };

  const daySlots = slotsByDay.get(selectedKey) ?? [];
  const blockDay = (blocked) => runBlock(daySlots.filter((s) => s.is_blocked !== blocked), blocked, formatKeyShort(selectedKey));
  const toggleSlot = (slot) => runBlock([slot], !slot.is_blocked, 'This slot');

  const addDaySlots = async (form) => {
    setError('');
    setNotice('');
    const length = Number(form.length);
    const capacity = Number(form.capacity);
    if (!Number.isInteger(length) || length <= 0) return setError('Slot length must be a whole number of minutes.') ?? false;
    if (!Number.isInteger(capacity) || capacity <= 0) return setError('People per slot must be at least 1.') ?? false;
    if (atManila(selectedKey, form.end) <= atManila(selectedKey, form.start)) return setError('"Until" must be after "From".') ?? false;

    const { rows, skippedOverlap } = planDaySlots({ key: selectedKey, ...form, length, capacity, existing: daySlots });
    if (rows.length === 0) {
      setError(skippedOverlap > 0 ? 'Every slot in that window overlaps an existing one.' : 'No new slots to add. The window is shorter than one slot, or already in the past.');
      return false;
    }
    if (rows.length > MAX_DAY_SLOTS) {
      setError(`That would create ${rows.length} slots. Add at most ${MAX_DAY_SLOTS} to one day.`);
      return false;
    }
    setBusy(true);
    try {
      const created = await createSlots(rows);
      setNotice(`Added ${plural(created, 'slot')} on ${formatKeyShort(selectedKey)}.${skippedOverlap ? ` Skipped ${skippedOverlap} that overlapped existing slots.` : ''}`);
      return true;
    } catch (e) {
      setError(`Added ${e.created ?? 0} of ${rows.length} slots. ${toUserMessage(e)}`);
      return false;
    } finally {
      setBusy(false);
      await load();
    }
  };

  const onPlannerCreated = async ({ created, skipped, dayCount, partial }) => {
    if (!partial) {
      setError('');
      setNotice(`Created ${plural(created, 'slot')} across ${plural(dayCount, 'day')}.${skipped ? ` Skipped ${skipped} overlapping.` : ''}`);
      setShowPlanner(false);
    }
    await load();
  };

  const current = monthKeyOf(todayKey());

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Schedule & Availability</h2>
          <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">
            Pick a day to see its bookings, add slots, or block it. Times are Philippine time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPlanner((v) => !v)}
          aria-expanded={showPlanner}
          className="border border-brand-cream text-brand-cream px-6 py-3 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all"
        >
          {showPlanner ? 'Close' : 'Repeat weekly'}
        </button>
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

      {showPlanner && <WeeklyPlanner onCreated={onPlannerCreated} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-8 items-start">
        <div aria-busy={loading} className={loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
          <AdminCalendar
            monthKey={monthKey}
            onMonthChange={changeMonth}
            selectedKey={selectedKey}
            onSelect={selectDay}
            getDay={getDay}
            minMonthKey={addMonths(current, -2)}
            maxMonthKey={addMonths(current, 18)}
          />
        </div>
        <div ref={panelRef} className="scroll-mt-4">
          <DayPanel
            key={selectedKey}
            dayKey={selectedKey}
            slots={daySlots}
            bookingsBySlot={bookingsBySlot}
            busy={busy}
            onBlockDay={blockDay}
            onToggleSlot={toggleSlot}
            onAddSlots={addDaySlots}
          />
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
