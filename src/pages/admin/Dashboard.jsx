import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { ContactLinks } from '../../components/admin/AppointmentParts';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import { adminUpdateAppointment, listAllAppointments } from '../../features/appointments/appointmentService';
import { CONFIRMS, DONE } from '../../features/appointments/appointmentCopy';
import { countByTab, endMs, isOverdue, startDayKey, startMs } from '../../features/appointments/appointmentFilters';
import { addDays, formatKeyDay, formatTime, todayKey } from '../../features/appointments/dateKeys';
import { formatManila, toUserMessage } from '../../services/api';

const REFRESH_MS = 60 * 1000;
const AGENDA_DAYS = 7;

const dayHeading = (key, today) => {
  if (key === today) return `Today · ${formatKeyDay(key)}`;
  if (key === addDays(today, 1)) return `Tomorrow · ${formatKeyDay(key)}`;
  return formatKeyDay(key);
};

function StatCard({ to, label, value, loading, accent, hint }) {
  return (
    <Link
      to={to}
      className="relative block bg-brand-dark p-6 border border-brand-blood/20 hover:border-brand-cream/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cream transition-colors"
    >
      {accent && <div className="absolute top-0 left-0 w-1 h-full bg-brand-blood" />}
      <h3 className="text-brand-muted text-xs uppercase tracking-widest mb-2">{label}</h3>
      <p className="text-5xl font-serif text-brand-cream">{loading ? '–' : value}</p>
      {hint && <p className="mt-2 text-xs text-brand-muted">{hint}</p>}
    </Link>
  );
}

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirm, confirmDialog] = useConfirm();
  const busyRef = useRef(null);
  busyRef.current = busyId;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      setRows(await listAllAppointments());
      setError('');
    } catch (e) {
      if (!silent) setError(toUserMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !busyRef.current) load({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const now = Date.now();
  const today = todayKey();
  const lastAgendaDay = addDays(today, AGENDA_DAYS);
  const weekStart = addDays(today, -6);

  const counts = useMemo(() => countByTab(rows, now), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const overdue = useMemo(() => rows.filter((r) => isOverdue(r, now)).length, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // requests waiting for a yes/no: upcoming ones first, soonest first; ones whose time passed sink to the bottom
  const pending = useMemo(
    () =>
      rows
        .filter((r) => r.status === 'PENDING')
        .sort((a, b) => Number(endMs(a) < now) - Number(endMs(b) < now) || startMs(a) - startMs(b)),
    [rows] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const agenda = useMemo(() => {
    const days = new Map();
    for (const r of rows) {
      if (r.status !== 'APPROVED') continue;
      const key = startDayKey(r);
      if (!key || key < today || key > lastAgendaDay) continue;
      days.set(key, [...(days.get(key) ?? []), r]);
    }
    for (const list of days.values()) list.sort((a, b) => startMs(a) - startMs(b));
    return [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows, today, lastAgendaDay]);

  const todaysCount = agenda.find(([key]) => key === today)?.[1].length ?? 0;
  const completedWeek = rows.filter((r) => r.status === 'COMPLETED' && startDayKey(r) && startDayKey(r) >= weekStart).length;

  const verdict = async (apt, action) => {
    const ask = CONFIRMS[action];
    if (ask && !(await confirm(ask(apt)))) return;
    setBusyId(apt.id);
    setError('');
    setNotice('');
    try {
      await adminUpdateAppointment(apt.id, action);
      setNotice(`${apt.guest_name}: ${DONE[action]}`);
      await load({ silent: true });
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6">
        <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Ritual Overview</h2>
        <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Today's schedule, the week ahead, and requests waiting for you.</p>
      </header>

      {error && <p role="alert" className="border border-brand-blood/50 bg-brand-dark text-brand-blood text-sm p-4">{error}</p>}
      {notice && <p role="status" className="border border-brand-cream/30 bg-brand-dark text-brand-cream text-sm p-4">{notice}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard to="/admin/appointments?tab=needs-action" label="Needs action" value={counts['needs-action']} loading={loading} accent hint="Requests to answer and past visits to close out" />
        <StatCard to="/admin/appointments?view=calendar&day=today" label="Today's bookings" value={todaysCount} loading={loading} hint="Open today in the calendar" />
        <StatCard to="/admin/appointments?tab=history" label="Completed · Last 7 days" value={completedWeek} loading={loading} hint="See the history" />
      </div>

      {overdue > 0 && (
        <p className="border border-brand-gold/40 bg-brand-gold/10 text-brand-cream text-sm p-4">
          {overdue} approved appointment{overdue === 1 ? ' is' : 's are'} past their time. Mark {overdue === 1 ? 'it' : 'them'} Complete or No-show in{' '}
          <Link to="/admin/appointments?tab=needs-action" className="underline underline-offset-4">Needs action</Link>.
        </p>
      )}

      <section className="bg-brand-dark border border-brand-blood/20" aria-labelledby="approvals-title">
        <div className="p-6 border-b border-brand-blood/20 flex items-baseline justify-between gap-4">
          <h3 id="approvals-title" className="text-xl font-serif text-brand-cream tracking-wide">Waiting for approval</h3>
          <span className="text-xs text-brand-muted">{loading ? '' : `${pending.length} request${pending.length === 1 ? '' : 's'}`}</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-brand-muted">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="p-6 text-sm text-brand-muted">No pending requests.</p>
        ) : (
          <ul>
            {pending.map((req) => {
              const slot = Array.isArray(req.availability_slots) ? req.availability_slots[0] : req.availability_slots;
              const past = endMs(req) > 0 && endMs(req) < now;
              return (
                <li key={req.id} className="p-6 border-b border-brand-blood/10 last:border-b-0 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                  <div className="lg:w-1/3 min-w-0">
                    <div className="text-brand-cream tracking-wide">{req.guest_name}</div>
                    <div className="text-xs text-brand-muted">{req.guest_phone}</div>
                    <div className="mt-2"><ContactLinks phone={req.guest_phone} name={req.guest_name} /></div>
                  </div>
                  <div className="lg:flex-1 text-sm text-brand-muted min-w-0">
                    <div className="text-brand-cream">{req.services?.name ?? '—'}</div>
                    <div>
                      {slot ? formatManila(slot.starts_at) : '—'}
                      {past && <span className="ml-3 text-[10px] uppercase tracking-widest text-brand-blood">Past</span>}
                    </div>
                    {req.notes && <div className="mt-2 max-w-md whitespace-pre-wrap break-words border-l-2 border-brand-gold/50 pl-3 text-xs">{req.notes}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => verdict(req, 'approve')}
                      className="flex items-center gap-2 border border-brand-cream bg-brand-cream text-brand-black px-4 py-2 text-xs uppercase tracking-widest hover:bg-transparent hover:text-brand-cream transition-colors disabled:opacity-40"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => verdict(req, 'reject')}
                      className="flex items-center gap-2 border border-brand-blood/40 px-4 py-2 text-xs uppercase tracking-widest text-brand-muted hover:text-brand-blood hover:border-brand-blood transition-colors disabled:opacity-40"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-brand-dark border border-brand-blood/20" aria-labelledby="agenda-title">
        <div className="p-6 border-b border-brand-blood/20 flex items-baseline justify-between gap-4">
          <h3 id="agenda-title" className="text-xl font-serif text-brand-cream tracking-wide">Today and the next {AGENDA_DAYS} days</h3>
          <Link to="/admin/appointments?view=calendar&day=today" className="text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream">Open calendar</Link>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-brand-muted">Loading…</p>
        ) : agenda.length === 0 ? (
          <p className="p-6 text-sm text-brand-muted">Nothing approved for the next {AGENDA_DAYS} days.</p>
        ) : (
          <div>
            {agenda.map(([key, list]) => (
              <div key={key} className="border-b border-brand-blood/10 last:border-b-0">
                <h4 className={`px-6 pt-5 pb-2 text-xs uppercase tracking-widest ${key === today ? 'text-brand-cream' : 'text-brand-muted'}`}>{dayHeading(key, today)}</h4>
                <ul className="px-6 pb-4">
                  {list.map((apt) => {
                    const slot = Array.isArray(apt.availability_slots) ? apt.availability_slots[0] : apt.availability_slots;
                    return (
                      <li key={apt.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 border-t border-brand-blood/10 first:border-t-0">
                        <span className="sm:w-32 text-sm text-brand-cream">{formatTime(slot.starts_at)}</span>
                        <span className="sm:flex-1 text-sm min-w-0">
                          <span className="text-brand-cream">{apt.guest_name}</span>
                          <span className="text-brand-muted"> · {apt.services?.name ?? 'Service'}</span>
                          {apt.notes && <span className="block truncate text-xs text-brand-muted" title={apt.notes}>{apt.notes.replace(/\n/g, ' · ')}</span>}
                        </span>
                        <ContactLinks phone={apt.guest_phone} name={apt.guest_name} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmDialog}
    </div>
  );
}
