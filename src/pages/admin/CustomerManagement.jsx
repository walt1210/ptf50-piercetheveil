import { useEffect, useMemo, useState } from 'react';
import { Search, Phone, Mail } from 'lucide-react';
import { ContactLinks } from '../../components/admin/AppointmentParts';
import { listCustomers } from '../../features/appointments/appointmentService';
import { toUserMessage } from '../../services/api';

const formatVisit = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    : 'None yet';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listCustomers();
        if (!cancelled) setCustomers(data);
      } catch (e) {
        if (!cancelled) setError(toUserMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.full_name ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Client Records</h2>
          <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Clients who have requested a booking, grouped by mobile number.</p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-brand-dark border border-brand-blood/30 pl-10 pr-4 py-2 text-brand-cream text-sm focus:outline-none focus:border-brand-cream w-full md:w-64"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-brand-muted" />
        </div>
      </header>

      {error && (
        <p role="alert" className="border border-brand-blood/50 bg-brand-dark text-brand-blood text-sm p-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-brand-muted text-sm font-light">Loading clients...</p>
      ) : filtered.length === 0 ? (
        <p className="text-brand-muted text-sm font-light">
          {customers.length === 0 ? 'No booking requests yet.' : 'No clients match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((client) => (
            <div key={client.id} className="bg-brand-dark border border-brand-blood/20 p-6 group hover:border-brand-blood/50 transition-colors">
              <h3 className="text-xl font-serif text-brand-cream mb-4">{client.full_name}</h3>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-brand-muted text-sm font-light">
                  <Phone size={14} className="text-brand-blood" />
                  {client.phone}
                </div>
                {client.email && (
                  <div className="flex items-center gap-3 text-brand-muted text-sm font-light">
                    <Mail size={14} className="text-brand-blood" />
                    {client.email}
                  </div>
                )}
              </div>

              <div className="mb-6 flex flex-wrap items-center gap-3">
                <ContactLinks phone={client.phone} name={client.full_name} />
                {client.noShows > 0 && (
                  <span
                    className={`text-[10px] uppercase tracking-widest border px-2 py-1 ${client.noShows >= 2 ? 'text-orange-400 border-orange-400/40' : 'text-brand-muted border-brand-muted/30'}`}
                    title="Appointments marked No-show"
                  >
                    {client.noShows} no-show{client.noShows === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-brand-blood/20">
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-widest mb-1">Requests</p>
                  <p className="text-brand-cream font-serif text-lg">{client.bookings}</p>
                </div>
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-widest mb-1">Total Visits</p>
                  <p className="text-brand-cream font-serif text-lg">{client.visits}</p>
                </div>
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-widest mb-1">Last Visit</p>
                  <p className="text-brand-cream text-sm mt-1.5">{formatVisit(client.lastVisit)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
