import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { listSlots, createSlots } from '../../features/appointments/appointmentService';
import { WEEKDAY_SHORT, addDays, atManila, formatKeyShort, planDaySlots, todayKey, weekdayIndex } from '../../features/appointments/dateKeys';
import { toUserMessage } from '../../services/api';

const MAX_WEEKS = 12;
const MAX_ROWS = 600;
const inputClass =
  'w-full bg-brand-black border border-brand-blood/30 p-3 text-brand-cream text-sm focus:outline-none focus:border-brand-cream color-scheme-dark';
const labelClass = 'text-[10px] text-brand-muted uppercase tracking-widest';

// "Repeat weekly": opens many days at once from one pattern (e.g. Tue-Sun, 10:00-19:00, hourly, for 8 weeks).
// Step 1 "Preview" counts what would be created and what would be skipped. Step 2 "Create" saves it.
export default function WeeklyPlanner({ onCreated }) {
  const [days, setDays] = useState([2, 3, 4, 5, 6, 0]); // Tue-Sun
  const [form, setForm] = useState({ start: '10:00', end: '19:00', length: '60', capacity: '1', from: addDays(todayKey(), 1), weeks: '8' });
  const [plan, setPlan] = useState(null); // { rows, skippedOverlap, dayCount }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setPlan(null);
    setError('');
  };
  const toggleDay = (i) => {
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
    setPlan(null);
    setError('');
  };

  const preview = async () => {
    setError('');
    setPlan(null);
    const length = Number(form.length);
    const capacity = Number(form.capacity);
    const weeks = Number(form.weeks);
    if (days.length === 0) return setError('Choose at least one weekday.');
    if (!form.from) return setError('Choose a start date.');
    if (form.from < todayKey()) return setError('The start date cannot be in the past.');
    if (!Number.isInteger(length) || length <= 0) return setError('Slot length must be a whole number of minutes.');
    if (!Number.isInteger(capacity) || capacity <= 0) return setError('People per slot must be at least 1.');
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_WEEKS) return setError(`Weeks must be between 1 and ${MAX_WEEKS}.`);
    if (atManila(form.from, form.end) <= atManila(form.from, form.start)) return setError('"Until" must be after "From".');

    setBusy(true);
    try {
      const lastKey = addDays(form.from, weeks * 7 - 1);
      // existing slots over the whole range, so overlaps are skipped accurately
      const existing = await listSlots(atManila(form.from, '00:00'), atManila(addDays(lastKey, 1), '00:00'));
      const rows = [];
      let skippedOverlap = 0;
      let dayCount = 0;
      for (let i = 0; i < weeks * 7; i += 1) {
        const key = addDays(form.from, i);
        if (!days.includes(weekdayIndex(key))) continue;
        const result = planDaySlots({ key, start: form.start, end: form.end, length, capacity, existing });
        skippedOverlap += result.skippedOverlap;
        if (result.rows.length) dayCount += 1;
        rows.push(...result.rows);
      }
      if (rows.length === 0) {
        setError(skippedOverlap > 0 ? 'Nothing new to add. Every slot in that pattern already exists.' : 'That pattern creates no slots. Check the times and dates.');
      } else if (rows.length > MAX_ROWS) {
        setError(`That would create ${rows.length} slots. Reduce the weeks or weekdays (limit ${MAX_ROWS}).`);
      } else {
        setPlan({ rows, skippedOverlap, dayCount, lastKey });
      }
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!plan) return;
    setBusy(true);
    setError('');
    try {
      const created = await createSlots(plan.rows);
      onCreated({ created, skipped: plan.skippedOverlap, dayCount: plan.dayCount });
      setPlan(null);
    } catch (e) {
      setError(`Saved ${e.created ?? 0} of ${plan.rows.length} slots. ${toUserMessage(e)}`);
      onCreated({ created: e.created ?? 0, skipped: 0, dayCount: 0, partial: true });
      setPlan(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-brand-dark border border-brand-blood/20 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <Repeat className="text-brand-blood" size={20} />
        <h3 className="text-xl font-serif text-brand-cream tracking-wide">Repeat weekly</h3>
      </div>
      <p className="text-brand-muted text-sm font-light mb-6">
        Open many days at once. Existing slots and past times are skipped, and nothing changes until you confirm.
      </p>

      <fieldset className="mb-5">
        <legend className={labelClass}>Days of the week</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAY_SHORT.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={days.includes(i)}
              onClick={() => toggleDay(i)}
              className={`px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${days.includes(i) ? 'border-brand-cream bg-brand-cream text-brand-black' : 'border-brand-blood/30 text-brand-muted hover:text-brand-cream'}`}
            >
              {name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <label className="block">
          <span className={labelClass}>From</span>
          <input type="time" className={`${inputClass} mt-1`} value={form.start} onChange={(e) => change({ start: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelClass}>Until</span>
          <input type="time" className={`${inputClass} mt-1`} value={form.end} onChange={(e) => change({ end: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelClass}>Slot length (mins)</span>
          <input type="number" min="1" className={`${inputClass} mt-1`} value={form.length} onChange={(e) => change({ length: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelClass}>People per slot</span>
          <input type="number" min="1" className={`${inputClass} mt-1`} value={form.capacity} onChange={(e) => change({ capacity: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelClass}>Starting from</span>
          <input type="date" min={todayKey()} className={`${inputClass} mt-1`} value={form.from} onChange={(e) => change({ from: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelClass}>For how many weeks</span>
          <input type="number" min="1" max={MAX_WEEKS} className={`${inputClass} mt-1`} value={form.weeks} onChange={(e) => change({ weeks: e.target.value })} />
        </label>
      </div>

      {error && <p role="alert" className="mt-5 text-sm text-brand-blood">{error}</p>}

      {plan && (
        <p role="status" className="mt-5 border border-brand-cream/30 p-4 text-sm text-brand-cream">
          This will create <strong>{plan.rows.length}</strong> slot{plan.rows.length === 1 ? '' : 's'} across{' '}
          <strong>{plan.dayCount}</strong> day{plan.dayCount === 1 ? '' : 's'}, up to {formatKeyShort(plan.lastKey)}.
          {plan.skippedOverlap > 0 && ` ${plan.skippedOverlap} overlapping slot${plan.skippedOverlap === 1 ? ' is' : 's are'} skipped.`}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={preview}
          disabled={busy}
          className="border border-brand-cream text-brand-cream px-6 py-3 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all disabled:opacity-50"
        >
          {busy && !plan ? 'Checking…' : 'Preview'}
        </button>
        {plan && (
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="border border-brand-blood bg-brand-blood text-brand-cream px-6 py-3 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all disabled:opacity-50"
          >
            {busy ? 'Creating…' : `Create ${plan.rows.length} slots`}
          </button>
        )}
      </div>
    </div>
  );
}
