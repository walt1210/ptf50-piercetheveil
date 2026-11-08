import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { adminUpdateAppointment, listAllAppointments } from '../../features/appointments/appointmentService';
import { formatManila, toUserMessage } from '../../services/api';

// "YYYY-MM-DD" in Philippine time, for comparing days
const manilaDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(d));

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAllAppointments()
      .then((data) => !cancelled && (setRows(data), setError('')))
      .catch((e) => !cancelled && setError(toUserMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const startOf = (r) => (r.availability_slots ? new Date(r.availability_slots.starts_at).getTime() : 0);
  const nowMs = Date.now();
  const isPast = (r) => startOf(r) > 0 && startOf(r) < nowMs;
  // upcoming requests first (soonest first); requests whose time already passed go to the bottom
  const pending = rows
    .filter((r) => r.status === 'PENDING')
    .sort((a, b) => Number(isPast(a)) - Number(isPast(b)) || startOf(a) - startOf(b));

  const today = manilaDay(Date.now());
  const weekStart = manilaDay(Date.now() - 6 * 86400000);
  const todaysBookings = rows.filter(
    (r) => r.status === 'APPROVED' && r.availability_slots && manilaDay(r.availability_slots.starts_at) === today
  ).length;
  const completedWeek = rows.filter(
    (r) => r.status === 'COMPLETED' && r.availability_slots && manilaDay(r.availability_slots.starts_at) >= weekStart
  ).length;

  const handleVerdict = async (id, action) => {
    if (action === 'reject' && !window.confirm('Reject this request?')) return;
    setBusyId(id);
    setError('');
    try {
      await adminUpdateAppointment(id, action);
      setVersion((v) => v + 1);
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
        <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Manage today's schedule and pending appointment requests.</p>
      </header>

      {error && <p role="alert" className="text-sm text-red-400 font-light">{error}</p>}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-dark p-6 border border-brand-blood/20 relative group hover:border-brand-blood/50 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-blood"></div>
          <h3 className="text-brand-muted text-xs uppercase tracking-widest mb-2">Pending Requests</h3>
          <p className="text-5xl font-serif text-brand-cream">{loading ? '–' : pending.length}</p>
        </div>
        <div className="bg-brand-dark p-6 border border-brand-blood/20">
          <h3 className="text-brand-muted text-xs uppercase tracking-widest mb-2">Today's Bookings</h3>
          <p className="text-5xl font-serif text-brand-cream">{loading ? '–' : todaysBookings}</p>
        </div>
        <div className="bg-brand-dark p-6 border border-brand-blood/20">
          <h3 className="text-brand-muted text-xs uppercase tracking-widest mb-2">Completed · Last 7 Days</h3>
          <p className="text-5xl font-serif text-brand-cream">{loading ? '–' : completedWeek}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-brand-dark border border-brand-blood/20">
        <div className="p-6 border-b border-brand-blood/20">
          <h3 className="text-xl font-serif text-brand-cream tracking-wide">Pending Approvals</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-brand-muted text-[10px] uppercase tracking-[0.2em] border-b border-brand-blood/20 bg-brand-black/50">
                <th className="p-6 font-light">Client</th>
                <th className="p-6 font-light">Service</th>
                <th className="p-6 font-light">Date &amp; Time</th>
                <th className="p-6 font-light text-center">Verdict</th>
              </tr>
            </thead>
            <tbody className="text-sm font-light">
              {loading && (
                <tr><td colSpan={4} className="p-6 text-brand-muted">Loading…</td></tr>
              )}
              {!loading && pending.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-brand-muted">No pending requests.</td></tr>
              )}
              {!loading && pending.map((req) => {
                const start = req.availability_slots?.starts_at;
                return (
                  <tr key={req.id} className="border-b border-brand-blood/10 hover:bg-brand-black/30 transition-colors">
                    <td className="p-6 text-brand-cream tracking-wide">
                      {req.guest_name}
                      <div className="text-xs text-brand-muted">{req.guest_phone}</div>
                      {req.notes && <div className="mt-1 max-w-xs truncate text-xs text-brand-gold" title={req.notes}>Note: {req.notes}</div>}
                    </td>
                    <td className="p-6 text-brand-muted">{req.services?.name ?? '—'}</td>
                    <td className="p-6 text-brand-muted">
                      {start ? (
                        <>
                          {formatManila(start, { dateStyle: 'medium' })}
                          <span className="text-brand-blood mx-2">|</span>
                          {formatManila(start, { timeStyle: 'short' })}
                          {isPast(req) && <span className="ml-3 text-[10px] uppercase tracking-widest text-brand-blood">Past</span>}
                        </>
                      ) : '—'}
                    </td>
                    <td className="p-6">
                     <div className="flex justify-center gap-4">
                      <button
                        disabled={busyId === req.id}
                        onClick={() => handleVerdict(req.id, 'approve')}
                        className="text-brand-cream hover:text-[#4ade80] transition-colors flex items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-40"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        disabled={busyId === req.id}
                        onClick={() => handleVerdict(req.id, 'reject')}
                        className="text-brand-cream hover:text-brand-blood transition-colors flex items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-40"
                      >
                        <X size={14} /> Reject
                      </button>
                     </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
