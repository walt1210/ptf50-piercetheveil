import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAY_SHORT, addMonths, formatKeyLong, formatMonth, monthGrid, monthKeyOf, todayKey } from '../../features/appointments/dateKeys';

// Month grid shared by admin pages. It knows nothing about slots or bookings:
// the page passes getDay(key) -> { tone, label, badge, hint } and the calendar only draws it.
//   tone:  'none' | 'open' | 'partial' | 'full' | 'blocked'
//   label: short text inside the cell ("3 open", "Full", "Blocked")
//   badge: number shown in the corner (e.g. pending requests that need action)
//   hint:  extra words for screen readers
export const TONE_STYLE = {
  none: 'border-brand-blood/10 text-brand-muted/50',
  open: 'border-brand-cream/25 text-brand-cream',
  partial: 'border-brand-gold/60 text-brand-cream bg-brand-gold/10',
  full: 'border-brand-blood bg-brand-blood/40 text-brand-cream',
  blocked: 'border-brand-blood/20 bg-brand-black text-brand-muted line-through decoration-brand-blood/60',
};

export const TONE_LEGEND = [
  ['open', 'Open'],
  ['partial', 'Partly booked'],
  ['full', 'Full'],
  ['blocked', 'Blocked'],
  ['none', 'No slots'],
];

export default function AdminCalendar({ monthKey, onMonthChange, selectedKey, onSelect, getDay, minMonthKey, maxMonthKey }) {
  const month = monthKeyOf(monthKey);
  const today = todayKey();
  const days = monthGrid(month);
  const canGoBack = !minMonthKey || month > monthKeyOf(minMonthKey);
  const canGoForward = !maxMonthKey || month < monthKeyOf(maxMonthKey);

  return (
    <div className="bg-brand-dark border border-brand-blood/20 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="p-2 text-brand-muted hover:text-brand-cream disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-4">
          <h3 className="text-xl sm:text-2xl font-serif text-brand-cream tracking-wide" aria-live="polite">{formatMonth(month)}</h3>
          {monthKeyOf(today) !== month && (
            <button
              type="button"
              onClick={() => onMonthChange(monthKeyOf(today))}
              className="text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-2 text-brand-muted hover:text-brand-cream disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2" aria-hidden="true">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="text-center text-[10px] uppercase tracking-widest text-brand-muted">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((key) => {
          const inMonth = key.slice(0, 7) === month.slice(0, 7);
          if (!inMonth) return <span key={key} aria-hidden="true" />;
          const info = getDay(key) ?? { tone: 'none' };
          const selected = key === selectedKey;
          const isToday = key === today;
          const dayNumber = Number(key.slice(8));
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={selected}
              aria-label={`${formatKeyLong(key)}${isToday ? ', today' : ''}. ${info.label || 'No slots'}${info.hint ? `. ${info.hint}` : ''}`}
              className={`relative min-h-[3.75rem] sm:min-h-[5rem] border p-1.5 sm:p-2 text-left transition-colors hover:border-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cream ${TONE_STYLE[info.tone] ?? TONE_STYLE.none} ${selected ? 'ring-2 ring-brand-cream' : ''} ${key < today ? 'opacity-60' : ''}`}
            >
              <span className={`block text-sm sm:text-base ${isToday ? 'font-semibold underline underline-offset-4' : ''}`}>{dayNumber}</span>
              {info.label && <span className="mt-1 block text-[10px] sm:text-xs leading-tight tracking-wide">{info.label}</span>}
              {info.badge > 0 && (
                <span
                  title={`${info.badge} pending`}
                  className="absolute top-1 right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-brand-gold text-brand-black text-[10px] font-semibold"
                >
                  {info.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-brand-muted">
        {TONE_LEGEND.map(([tone, text]) => (
          <li key={tone} className="flex items-center gap-2">
            <i className={`inline-block w-3 h-3 border ${TONE_STYLE[tone].split(' ').filter((c) => c.startsWith('border-') || c.startsWith('bg-')).join(' ')}`} />
            {text}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <i className="inline-block w-3 h-3 rounded-full bg-brand-gold" /> Pending requests
        </li>
      </ul>
    </div>
  );
}
