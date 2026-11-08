// Pure date helpers for the admin calendar. A "key" is a plain Manila calendar date, "YYYY-MM-DD".
// Working with keys (not Date objects) means the browser's own time zone can never shift a day.
// The database stores UTC; atManila() converts a Manila date + "HH:MM" into the right instant.

const TZ = "Asia/Manila"; // UTC+8, no daylight saving
const keyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" });

const parts = (key) => key.split("-").map(Number);
const utcDate = (key) => {
  const [y, m, d] = parts(key);
  return new Date(Date.UTC(y, m - 1, d));
};

export const dateKey = (value) => keyFormatter.format(new Date(value));
export const todayKey = () => dateKey(new Date());
export const addDays = (key, n) => {
  const [y, m, d] = parts(key);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const weekdayIndex = (key) => utcDate(key).getUTCDay(); // 0 = Sunday

export const monthKeyOf = (key) => `${key.slice(0, 7)}-01`;
export const addMonths = (monthKey, n) => {
  const [y, m] = parts(monthKey);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
};

// The 6 weeks (42 days, Sunday first) that cover a month, as keys.
export const monthGrid = (monthKey) => {
  const first = monthKeyOf(monthKey);
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

export const atManila = (key, time) => new Date(`${key}T${time}:00+08:00`);
export const minutesOfDay = (value) => {
  const p = timeFormatter.formatToParts(new Date(value));
  return Number(p.find((x) => x.type === "hour").value) * 60 + Number(p.find((x) => x.type === "minute").value);
};
export const formatMinutes = (m) => {
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
export const formatTime = (value) => formatMinutes(minutesOfDay(value));

const keyLabel = (key, opts) => utcDate(key).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
export const formatKeyLong = (key) => keyLabel(key, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const formatKeyShort = (key) => keyLabel(key, { month: "short", day: "numeric", year: "numeric" });
export const formatKeyDay = (key) => keyLabel(key, { weekday: "short", month: "short", day: "numeric" });
export const formatMonth = (monthKey) => keyLabel(monthKey, { month: "long", year: "numeric" });

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Turn a time window into slot rows, skipping past times and anything that overlaps an existing slot.
// existing: [{ starts_at, ends_at }]. Returns { rows, skippedOverlap }.
export function planDaySlots({ key, start, end, length, capacity, existing, now = Date.now() }) {
  const from = atManila(key, start).getTime();
  const to = atManila(key, end).getTime();
  const rows = [];
  let skippedOverlap = 0;
  for (let t = from; t + length * 60000 <= to; t += length * 60000) {
    const tEnd = t + length * 60000;
    if (t <= now) continue; // never create slots in the past
    const clash = existing.some((s) => t < new Date(s.ends_at).getTime() && tEnd > new Date(s.starts_at).getTime());
    if (clash) skippedOverlap += 1;
    else rows.push({ startsAt: new Date(t), endsAt: new Date(tEnd), capacity });
  }
  return { rows, skippedOverlap };
}
