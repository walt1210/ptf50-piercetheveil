import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, List, Search } from 'lucide-react';
import AdminCalendar from '../../components/admin/AdminCalendar';
import { AppointmentActions, AppointmentCard, ClientInfo, HistoryList, StatusBadge } from '../../components/admin/AppointmentParts';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import RescheduleDialog from '../../components/admin/RescheduleDialog';
import {
  adminUpdateAppointment,
  getAppointmentEvents,
  listAllAppointments,
} from '../../features/appointments/appointmentService';
import {
  TABS,
  TAB_KEYS,
  bucketOf,
  countByTab,
  groupActiveByDay,
  isOverdue,
  matchesQuery,
  sortForTab,
} from '../../features/appointments/appointmentFilters';
import { CONFIRMS, DONE } from '../../features/appointments/appointmentCopy';
import { addMonths, formatKeyLong, formatMonth, monthKeyOf, todayKey } from '../../features/appointments/dateKeys';
import { formatManila, toUserMessage } from '../../services/api';

const REFRESH_MS = 60 * 1000;
const CALENDAR_LEGEND = [['open', 'Approved bookings'], ['partial', 'Has pending requests'], ['none', 'No bookings']];

const slotOf = (apt) => (Array.isArray(apt.availability_slots) ? apt.availability_slots[0] : apt.availability_slots);

export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const tab = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'needs-action';
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const setTab = (next) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', next); n.delete('view'); return n; }, { replace: true });
  const setView = (next) => setParams((p) => { const n = new URLSearchParams(p); if (next === 'calendar') n.set('view', 'calendar'); else n.delete('view'); n.delete('day'); return n; }, { replace: true });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [resched, setResched] = useState(null);
  const [history, setHistory] = useState(null); // { id, events, loading }
  const [confirm, confirmDialog] = useConfirm();

  // calendar view state
  const dayParam = params.get('day');
  const initialDay = dayParam === 'today' || !dayParam ? todayKey() : dayParam;
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(initialDay));
  const [selectedKey, setSelectedKey] = useState(initialDay);

  const modalOpen = useRef(false);
  modalOpen.current = Boolean(resched);

  // Load everything once (tabs, counts and search all work on this list). `silent` refreshes without the loading flash.
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
  }, [load]);

  // pick up new requests without the admin having to reload the page
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !modalOpen.current) load({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const now = Date.now();
  const counts = useMemo(() => countByTab(rows, now), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const inTab = tab === 'all' ? rows : rows.filter((r) => bucketOf(r, now) === tab);
    return sortForTab(inTab.filter((r) => matchesQuery(r, query)), tab);
  }, [rows, tab, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => groupActiveByDay(rows), [rows]);
  const dayItems = byDay.get(selectedKey)?.items ?? [];

  const getDay = (key) => {
    const d = byDay.get(key);
    if (!d) return { tone: 'none', label: '' };
    const total = d.approved + d.pending;
    return {
      tone: d.pending > 0 ? 'partial' : 'open',
      label: `${total} booked`,
      badge: d.pending,
      hint: `${d.approved} approved, ${d.pending} pending`,
    };
  };

  const toggleHistory = async (apt) => {
    if (history?.id === apt.id) return setHistory(null);
    setHistory({ id: apt.id, events: [], loading: true });
    try {
      setHistory({ id: apt.id, events: await getAppointmentEvents(apt.id), loading: false });
    } catch (e) {
      setError(toUserMessage(e));
      setHistory(null);
    }
  };

  const run = async (apt, action, options) => {
    setBusyId(apt.id);
    setError('');
    setNotice('');
    try {
      await adminUpdateAppointment(apt.id, action, options);
      setHistory(null);
      setNotice(`${apt.guest_name}: ${DONE[action] ?? 'Updated.'}`);
      await load({ silent: true });
      return true;
    } catch (e) {
      setError(toUserMessage(e));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleAction = async (apt, action) => {
    if (action === 'reschedule') return setResched(apt);
    const ask = CONFIRMS[action];
    if (ask && !(await confirm(ask(apt)))) return;
    await run(apt, action);
  };

  const pickNewSlot = async (slot) => {
    const apt = resched;
    setResched(null);
    await run(apt, 'reschedule', { newSlotId: slot.id });
  };

  const tabCounts = counts;
  const cardProps = { history, onAction: handleAction, onHistory: toggleHistory };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Appointments</h2>
          <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">
            Start with Needs action. Switch to Calendar to see the month.
          </p>
        </div>
        <div role="group" aria-label="View" className="flex border border-brand-blood/40">
          {[['list', 'List', List], ['calendar', 'Calendar', CalendarDays]].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors ${view === key ? 'bg-brand-cream text-brand-black' : 'text-brand-muted hover:text-brand-cream'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      {error && <p role="alert" className="border border-brand-blood/50 bg-brand-dark text-brand-blood text-sm p-4">{error}</p>}
      {notice && <p role="status" className="border border-brand-cream/30 bg-brand-dark text-brand-cream text-sm p-4">{notice}</p>}

      {view === 'list' ? (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div role="tablist" aria-label="Appointment groups" className="flex flex-wrap gap-2">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 border px-4 py-2 text-xs uppercase tracking-widest transition-colors ${tab === key ? 'border-brand-cream bg-brand-cream text-brand-black' : 'border-brand-blood/30 text-brand-muted hover:text-brand-cream'}`}
                >
                  {label}
                  <span className={`min-w-[1.25rem] px-1.5 text-[10px] rounded-full ${key === 'needs-action' && tabCounts[key] > 0 && tab !== key ? 'bg-brand-gold text-brand-black' : 'bg-brand-black/30'}`}>
                    {tabCounts[key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative">
              <label htmlFor="appt-search" className="sr-only">Search appointments</label>
              <input
                id="appt-search"
                type="search"
                placeholder="Search name, phone, reference…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-brand-dark border border-brand-blood/30 pl-10 pr-4 py-2 text-brand-cream text-sm focus:outline-none focus:border-brand-cream w-full lg:w-72"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-brand-muted" />
            </div>
          </div>

          {loading ? (
            <p className="text-brand-muted text-sm font-light">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-brand-muted text-sm font-light border border-brand-blood/20 bg-brand-dark p-6">
              {query
                ? `Nothing matches "${query}" in ${TABS.find(([k]) => k === tab)[1]}.`
                : tab === 'needs-action'
                  ? 'You are all caught up. Nothing needs action.'
                  : 'No appointments here yet.'}
            </p>
          ) : (
            <>
              {/* phones: cards */}
              <div className="space-y-4 md:hidden">
                {visible.map((apt) => (
                  <AppointmentCard key={apt.id} apt={apt} overdue={isOverdue(apt, now)} {...cardProps} busy={busyId === apt.id} />
                ))}
              </div>

              {/* larger screens: table */}
              <div className="hidden md:block bg-brand-dark border border-brand-blood/20 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-brand-muted text-[10px] uppercase tracking-[0.2em] border-b border-brand-blood/20 bg-brand-black/50">
                      <th className="p-5 font-light">Client</th>
                      <th className="p-5 font-light">Service</th>
                      <th className="p-5 font-light">Date &amp; Time</th>
                      <th className="p-5 font-light">Status</th>
                      <th className="p-5 font-light text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-light">
                    {visible.map((apt) => (
                      <Fragment key={apt.id}>
                        <tr className="border-b border-brand-blood/10 hover:bg-brand-black/30 transition-colors align-top">
                          <td className="p-5"><ClientInfo apt={apt} /></td>
                          <td className="p-5 text-brand-muted">{apt.services?.name ?? '—'}</td>
                          <td className="p-5 text-brand-muted">
                            {slotOf(apt) ? formatManila(slotOf(apt).starts_at) : '—'}
                            {isOverdue(apt, now) && <div className="mt-2 max-w-[12rem] text-xs text-brand-gold">Time has passed. Mark Complete or No-show.</div>}
                          </td>
                          <td className="p-5"><StatusBadge status={apt.status} /></td>
                          <td className="p-5">
                            <AppointmentActions apt={apt} busy={busyId === apt.id} onAction={handleAction} onHistory={toggleHistory} historyOpen={history?.id === apt.id} />
                          </td>
                        </tr>
                        {history?.id === apt.id && (
                          <tr className="border-b border-brand-blood/10 bg-brand-black/40">
                            <td colSpan={5} className="px-5 py-4"><HistoryList history={history} /></td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-brand-muted">
                Showing {visible.length} of {tab === 'all' ? rows.length : tabCounts[tab]}
                {query ? ' (filtered by your search)' : ''}.
              </p>
            </>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 items-start">
          <div aria-busy={loading} className={loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
            <AdminCalendar
              monthKey={monthKey}
              onMonthChange={(m) => {
                setMonthKey(m);
                setSelectedKey(m === monthKeyOf(todayKey()) ? todayKey() : m);
              }}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              getDay={getDay}
              minMonthKey={addMonths(monthKeyOf(todayKey()), -12)}
              maxMonthKey={addMonths(monthKeyOf(todayKey()), 18)}
              legend={CALENDAR_LEGEND}
              pendingLegend="Pending count"
            />
            <p className="mt-3 text-xs text-brand-muted">Shows pending and approved bookings for {formatMonth(monthKey)}.</p>
          </div>
          <section aria-labelledby="agenda-title" className="space-y-4">
            <h3 id="agenda-title" className="text-xl sm:text-2xl font-serif text-brand-cream tracking-wide">{formatKeyLong(selectedKey)}</h3>
            {dayItems.length === 0 ? (
              <p className="text-sm text-brand-muted border border-brand-blood/20 bg-brand-dark p-6">No bookings on this day.</p>
            ) : (
              dayItems.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} overdue={isOverdue(apt, now)} {...cardProps} busy={busyId === apt.id} />
              ))
            )}
          </section>
        </div>
      )}

      {resched && <RescheduleDialog appointment={resched} onClose={() => setResched(null)} onPick={pickNewSlot} />}
      {confirmDialog}
    </div>
  );
}
