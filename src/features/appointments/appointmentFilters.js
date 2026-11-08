// Pure helpers for the admin Appointments and Dashboard pages (no database access, easy to test).
import { dateKey } from "./dateKeys";

// What each tab on the Appointments page means:
//   needs-action: PENDING requests, plus APPROVED appointments whose time has already passed
//                 (someone must mark them Complete or No-show)
//   upcoming:     APPROVED appointments that have not finished yet
//   history:      COMPLETED, CANCELLED, REJECTED, NO_SHOW
export const TABS = [
  ["needs-action", "Needs action"],
  ["upcoming", "Upcoming"],
  ["history", "History"],
  ["all", "All"],
];
export const TAB_KEYS = TABS.map(([key]) => key);

const slotOf = (apt) => (Array.isArray(apt.availability_slots) ? apt.availability_slots[0] : apt.availability_slots) ?? null;
export const startMs = (apt) => (slotOf(apt) ? new Date(slotOf(apt).starts_at).getTime() : 0);
export const endMs = (apt) => (slotOf(apt) ? new Date(slotOf(apt).ends_at).getTime() : 0);
export const startDayKey = (apt) => (slotOf(apt) ? dateKey(slotOf(apt).starts_at) : null);

export function bucketOf(apt, now = Date.now()) {
  if (apt.status === "PENDING") return "needs-action";
  if (apt.status === "APPROVED") return endMs(apt) > 0 && endMs(apt) < now ? "needs-action" : "upcoming";
  return "history";
}

// True for an APPROVED appointment whose time has passed without being completed or marked no-show.
export const isOverdue = (apt, now = Date.now()) => apt.status === "APPROVED" && endMs(apt) > 0 && endMs(apt) < now;

export function countByTab(rows, now = Date.now()) {
  const counts = { "needs-action": 0, upcoming: 0, history: 0, all: rows.length };
  for (const r of rows) counts[bucketOf(r, now)] += 1;
  return counts;
}

const digits = (s) => String(s ?? "").replace(/\D/g, "");
// 0917..., +63917..., 63917... all become 917... so any form of a number matches any other
const canonPhone = (d) => (d.startsWith("63") ? d.slice(2) : d.replace(/^0/, ""));
const alnum = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Every word typed must match something about the appointment (name, phone, email, reference, service, notes).
export function matchesQuery(apt, query) {
  // A query that looks like a phone number ("+63 917 123", "0917-123-4567") is matched as ONE number,
  // so spaces, dashes and the country code never break it into unmatchable pieces.
  const trimmed = String(query ?? "").trim();
  const queryDigits = digits(trimmed);
  if (/^[\d\s+()-]+$/.test(trimmed) && queryDigits.length >= 3) {
    return canonPhone(digits(apt.guest_phone)).includes(canonPhone(queryDigits));
  }
  const words = String(query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = [apt.guest_name, apt.guest_email, apt.services?.name, apt.notes].map((v) => String(v ?? "").toLowerCase()).join(" \n ");
  const ref = alnum(apt.reference_code);
  const phone = canonPhone(digits(apt.guest_phone));
  return words.every((w) => {
    if (text.includes(w)) return true;
    const wa = alnum(w);
    if (wa.length >= 3 && ref.includes(wa)) return true;
    const wd = canonPhone(digits(w));
    return wd.length >= 3 && phone.includes(wd);
  });
}

// Tabs sort so the thing you do next is first: soonest first for open work, newest first for history.
export function sortForTab(rows, tab) {
  const copy = [...rows];
  if (tab === "history" || tab === "all") return copy.sort((a, b) => startMs(b) - startMs(a));
  return copy.sort((a, b) => startMs(a) - startMs(b));
}

// "YYYY-MM-DD" -> { approved, pending, items } for PENDING/APPROVED bookings (the calendar view).
export function groupActiveByDay(rows) {
  const days = new Map();
  for (const r of rows) {
    if (r.status !== "PENDING" && r.status !== "APPROVED") continue;
    const key = startDayKey(r);
    if (!key) continue;
    const day = days.get(key) ?? { approved: 0, pending: 0, items: [] };
    if (r.status === "PENDING") day.pending += 1;
    else day.approved += 1;
    day.items.push(r);
    days.set(key, day);
  }
  for (const day of days.values()) day.items.sort((a, b) => startMs(a) - startMs(b));
  return days;
}
