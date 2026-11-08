// Pure validation helpers for the guest booking path.
// No Supabase calls and no React here, so they are easy to test and reuse.
// The database repeats these rules (0007_guest_booking.sql); it always has the final say.

export const MAX_NOTES_LENGTH = 500;
export const MAX_NAME_LENGTH = 80;
export const MAX_ADDRESS_LENGTH = 200;
export const MAX_EXTRA_NOTES_LENGTH = 250; // setting + address + notes together stay under MAX_NOTES_LENGTH

// Joins the booking form's separate fields into the single notes text the database stores,
// e.g. "Setting: Client address\nAddress: Brgy. Balibago, near Jollibee\nNotes: first piercing".
export function buildBookingNotes({ settingLabel, address, extra } = {}) {
  const lines = [`Setting: ${settingLabel}`];
  const cleanAddress = String(address ?? "").trim();
  const cleanExtra = String(extra ?? "").trim();
  if (cleanAddress) lines.push(`Address: ${cleanAddress}`);
  if (cleanExtra) lines.push(`Notes: ${cleanExtra}`);
  return lines.join("\n");
}

// A client-address visit needs somewhere to go. A barangay + landmark is enough at request time.
export function validateAddress(address) {
  const clean = String(address ?? "").trim();
  if (clean.length < 5) return { ok: false, message: "Please enter your address or a landmark so the shop knows where to go." };
  if (clean.length > MAX_ADDRESS_LENGTH) return { ok: false, message: `Address must be ${MAX_ADDRESS_LENGTH} characters or fewer.` };
  return { ok: true };
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const isBlank = (value) =>
  value === null || value === undefined || String(value).trim() === "";

// Trim notes. Missing notes become an empty string.
export function normalizeNotes(notes) {
  if (notes === null || notes === undefined) return "";
  return String(notes).trim();
}

export function validateNotes(notes) {
  if (normalizeNotes(notes).length > MAX_NOTES_LENGTH) {
    return { ok: false, message: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.` };
  }
  return { ok: true };
}

// "+63 917 123 4567", "0917-123-4567" and "9171234567" all become "09171234567".
// Other numbers must have 7-15 digits. Returns null when the number is not usable.
// Mirrors normalize_phone() in the database.
export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (/^639\d{9}$/.test(digits)) digits = `0${digits.slice(2)}`;
  else if (/^9\d{9}$/.test(digits)) digits = `0${digits}`;
  return /^\d{7,15}$/.test(digits) ? digits : null;
}

// Name and phone are required, email is optional.
// Returns { ok: true } or { ok: false, field, message }.
export function validateGuestDetails({ name, phone, email } = {}) {
  const cleanName = String(name ?? "").trim();
  if (cleanName.length < 2) return { ok: false, field: "name", message: "Please enter your name." };
  if (cleanName.length > MAX_NAME_LENGTH) {
    return { ok: false, field: "name", message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (isBlank(phone) || !normalizePhone(phone)) {
    return { ok: false, field: "phone", message: "Please enter a valid mobile number, e.g. 0917 123 4567." };
  }
  const cleanEmail = String(email ?? "").trim();
  if (cleanEmail && (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail))) {
    return { ok: false, field: "email", message: "That email address does not look right." };
  }
  return { ok: true };
}

// A booking can only target a slot that starts after `now`.
export function validateSlotStart(startsAt, now = new Date()) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, message: "That time slot is not valid. Please pick another." };
  }
  if (start.getTime() <= new Date(now).getTime()) {
    return { ok: false, message: "That time has already passed. Please pick a future time." };
  }
  return { ok: true };
}

// Validates a booking request before it is sent to the request_appointment RPC.
// `slotStartsAt` is optional: when given, the slot must start in the future.
// The database still makes the final decision on availability.
export function validateAppointmentRequest(
  { serviceId, slotId, guestName, guestPhone, guestEmail, notes, slotStartsAt } = {},
  now = new Date(),
) {
  if (isBlank(serviceId)) return { ok: false, message: "Please choose a service." };
  if (isBlank(slotId)) return { ok: false, message: "Please choose an available time." };

  const guestCheck = validateGuestDetails({ name: guestName, phone: guestPhone, email: guestEmail });
  if (!guestCheck.ok) return guestCheck;

  const notesCheck = validateNotes(notes);
  if (!notesCheck.ok) return notesCheck;

  if (slotStartsAt !== undefined && slotStartsAt !== null) {
    const startCheck = validateSlotStart(slotStartsAt, now);
    if (!startCheck.ok) return startCheck;
  }

  return { ok: true };
}

// "ABCD2345" -> "ABCD-2345" (easier to read out loud or copy). Accepts any casing and separators.
export function formatReference(code) {
  const clean = String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
