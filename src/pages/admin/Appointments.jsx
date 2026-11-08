import { Fragment, useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import {
  adminUpdateAppointment,
  getAppointmentEvents,
  getAvailableSlots,
  listAllAppointments,
} from '../../features/appointments/appointmentService';
import { STATUS_LABEL, STATUS_OPTIONS, STATUS_STYLE } from '../../features/appointments/appointmentStatus';
import { formatManila, toUserMessage } from '../../services/api';

// Which buttons each status offers (mirrors the rules enforced in the database).
const ACTIONS = {
  PENDING: [['approve', 'Approve'], ['reject', 'Reject'], ['reschedule', 'Reschedule'], ['cancel', 'Cancel']],
  APPROVED: [['complete', 'Complete'], ['no_show', 'No-show'], ['reschedule', 'Reschedule'], ['cancel', 'Cancel']],
};
const CONFIRM = {
  reject: 'Reject this request?',
  cancel: 'Cancel this appointment?',
  no_show: 'Mark this appointment as a no-show?',
};

export default function Appointments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [version, setVersion] = useState(0); // bump to reload
  const [busyId, setBusyId] = useState(null);

  const [resched, setResched] = useState(null); // appointment being rescheduled
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [history, setHistory] = useState(null); // { id, events, loading }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAllAppointments({ status: status || undefined })
      .then((data) => !cancelled && (setRows(data), setError('')))
      .catch((e) => !cancelled && setError(toUserMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, version]);

  const reload = () => {
    setHistory(null);
    setVersion((v) => v + 1);
  };

  const toggleHistory = async (apt) => {
    if (history?.id === apt.id) return setHistory(null);
    setHistory({ id: apt.id, events: [], loading: true });
    try {
      const events = await getAppointmentEvents(apt.id);
      setHistory({ id: apt.id, events, loading: false });
    } catch (e) {
      setError(toUserMessage(e));
      setHistory(null);
    }
  };

  const openReschedule = async (apt) => {
    setResched(apt);
    setSlots([]);
    setSlotsLoading(true);
    try {
      setSlots(await getAvailableSlots(new Date(), new Date(Date.now() + 30 * 86400000)));
    } catch (e) {
      setError(toUserMessage(e));
      setResched(null);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAction = async (apt, action) => {
    if (action === 'reschedule') return openReschedule(apt);
    if (CONFIRM[action] && !window.confirm(CONFIRM[action])) return;
    setBusyId(apt.id);
    setError('');
    try {
      await adminUpdateAppointment(apt.id, action);
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const confirmReschedule = async (slot) => {
    const apt = resched;
    setResched(null);
    setBusyId(apt.id);
    setError('');
    try {
      await adminUpdateAppointment(apt.id, 'reschedule', { newSlotId: slot.id });
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Appointments Ledger</h2>
          <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Review and manage the complete booking history.</p>
        </div>
        <label className="flex items-center gap-2 border border-brand-blood/50 text-brand-cream px-4 py-2 text-xs uppercase tracking-widest">
          <Filter size={14} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-brand-dark text-brand-cream uppercase tracking-widest text-xs focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="text-sm text-red-400 font-light">{error}</p>}

      <div className="bg-brand-dark border border-brand-blood/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-brand-muted text-[10px] uppercase tracking-[0.2em] border-b border-brand-blood/20 bg-brand-black/50">
                <th className="p-6 font-light">Client</th>
                <th className="p-6 font-light">Service</th>
                <th className="p-6 font-light">Date &amp; Time</th>
                <th className="p-6 font-light">Status</th>
                <th className="p-6 font-light text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-light">
              {loading && (
                <tr><td colSpan={5} className="p-6 text-brand-muted">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-brand-muted">No appointments found.</td></tr>
              )}
              {!loading && rows.map((apt) => (
                <Fragment key={apt.id}>
                <tr className="border-b border-brand-blood/10 hover:bg-brand-black/30 transition-colors">
                  <td className="p-6 text-brand-cream tracking-wide">
                    {apt.guest_name}
                    <div className="text-xs text-brand-muted">{apt.guest_phone}</div>
                    {apt.guest_email && <div className="text-xs text-brand-muted">{apt.guest_email}</div>}
                    <div className="text-[10px] tracking-widest text-brand-muted/70 mt-1">Ref {apt.reference_code}</div>
                    {apt.notes && (
                      <div className="mt-2 max-w-xs whitespace-pre-wrap break-words border-l-2 border-brand-gold/50 pl-3 text-xs text-brand-muted">
                        <span className="block text-[10px] uppercase tracking-widest text-brand-gold">Customer notes</span>
                        {apt.notes}
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-brand-muted">{apt.services?.name ?? '—'}</td>
                  <td className="p-6 text-brand-muted">
                    {apt.availability_slots ? formatManila(apt.availability_slots.starts_at) : '—'}
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 text-[10px] uppercase tracking-widest border ${STATUS_STYLE[apt.status] ?? ''}`}>
                      {STATUS_LABEL[apt.status] ?? apt.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
                      {(ACTIONS[apt.status] ?? []).map(([action, label]) => (
                        <button
                          key={action}
                          disabled={busyId === apt.id}
                          onClick={() => handleAction(apt, action)}
                          className="text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream transition-colors disabled:opacity-40"
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => toggleHistory(apt)}
                        className="text-xs uppercase tracking-widest text-brand-muted/70 hover:text-brand-cream transition-colors"
                      >
                        {history?.id === apt.id ? 'Hide history' : 'History'}
                      </button>
                    </div>
                  </td>
                </tr>
                {history?.id === apt.id && (
                  <tr className="border-b border-brand-blood/10 bg-brand-black/40">
                    <td colSpan={5} className="px-6 py-4 text-xs text-brand-muted">
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
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resched && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setResched(null)}
        >
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto bg-brand-dark border border-brand-blood/30 p-8">
            <h3 className="text-2xl font-serif text-brand-cream mb-1">Reschedule</h3>
            <p className="text-xs text-brand-muted mb-6">
              {resched.guest_name}: {resched.services?.name}. Pick a new open slot.
            </p>
            {slotsLoading && <p className="text-brand-muted text-sm">Loading slots…</p>}
            {!slotsLoading && slots.length === 0 && (
              <p className="text-brand-muted text-sm">No open slots in the next 30 days.</p>
            )}
            <ul className="space-y-2">
              {slots.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => confirmReschedule(s)}
                    className="w-full text-left border border-brand-blood/30 px-4 py-3 text-sm text-brand-cream hover:bg-brand-blood/10 transition-colors"
                  >
                    {formatManila(s.starts_at)}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setResched(null)}
              className="mt-6 text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
