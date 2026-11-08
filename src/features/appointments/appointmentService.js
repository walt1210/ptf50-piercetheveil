import { supabase } from "../../services/supabase";
import { toUserMessage } from "../../services/api";
import { normalizeNotes, validateAppointmentRequest } from "./appointmentValidation";

// Turns a Supabase/RPC error into an Error whose message is safe to show on screen.
// The original error code is kept so callers can still check it (e.g. 23505).
function toServiceError(error, message) {
  const wrapped = new Error(message || toUserMessage(error));
  wrapped.code = error?.code;
  wrapped.cause = error;
  return wrapped;
}

// Supabase returns at most 1000 rows per request. `build()` must return a FRESH query each call
// (with a stable order); this walks it in pages so long lists are never silently cut off.
const PAGE_SIZE = 1000;
async function fetchAll(build) {
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE_SIZE) return all;
  }
}

/* ---------------- public (guests; no account needed) ---------------- */

export async function listServices() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, price, duration_minutes, piercing_type_id")
    .eq("is_active", true)
    .order("price");
  if (error) throw toServiceError(error);
  return data;
}

// Open slots with remaining capacity. Pass Date objects or ISO strings.
export async function getAvailableSlots(from, to) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Please choose a valid date range.");
  }
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_from: fromDate.toISOString(),
    p_to: toDate.toISOString(),
  });
  if (error) throw toServiceError(error);
  return data ?? [];
}

// Creates a PENDING request for a guest. Returns { id, reference } (show `reference` to the guest).
// Inputs are validated first; failures throw an Error with a message safe to show on screen.
// `slotStartsAt` is optional: pass the chosen slot's starts_at to also check it is in the future.
export async function requestAppointment({ serviceId, slotId, guestName, guestPhone, guestEmail, notes, slotStartsAt }) {
  const check = validateAppointmentRequest({ serviceId, slotId, guestName, guestPhone, guestEmail, notes, slotStartsAt });
  if (!check.ok) throw new Error(check.message);

  const { data, error } = await supabase.rpc("request_appointment", {
    p_service_id: serviceId,
    p_slot_id: slotId,
    p_guest_name: String(guestName).trim(),
    p_guest_phone: guestPhone, // the database normalizes the number
    p_guest_email: String(guestEmail ?? "").trim() || null,
    p_notes: normalizeNotes(notes) || null,
  });
  if (error) throw toServiceError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.booking_id, reference: row.booking_reference };
}

// Look up a booking with its reference code + the phone number used to book it.
export async function getBooking({ reference, phone }) {
  const { data, error } = await supabase.rpc("get_booking", { p_reference: reference, p_phone: phone });
  if (error) throw toServiceError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    reference: row.booking_reference,
    status: row.status,
    serviceName: row.service_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

// Cancel a PENDING/APPROVED booking with its reference code + phone number.
export async function cancelBooking({ reference, phone }) {
  const { error } = await supabase.rpc("cancel_booking", { p_reference: reference, p_phone: phone });
  if (error) throw toServiceError(error);
}

/* ---------------- admin ---------------- */

export async function listAllAppointments({ status } = {}) {
  return fetchAll(() => {
    let q = supabase
      .from("appointments")
      .select(
        "id, status, notes, created_at, reference_code, guest_name, guest_phone, guest_email, services(name, price), availability_slots(starts_at, ends_at)"
      )
      .order("created_at", { ascending: false })
      .order("id");
    if (status) q = q.eq("status", status);
    return q;
  });
}

// action: 'approve' | 'reject' | 'reschedule' | 'complete' | 'cancel' | 'no_show'
export async function adminUpdateAppointment(id, action, { newSlotId, note } = {}) {
  const { error } = await supabase.rpc("admin_update_appointment", {
    p_id: id,
    p_action: action,
    p_new_slot_id: newSlotId ?? null,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function getAppointmentEvents(appointmentId) {
  const { data, error } = await supabase
    .from("appointment_events")
    .select("id, old_status, new_status, note, created_at")
    .eq("appointment_id", appointmentId)
    .order("created_at");
  if (error) throw error;
  return data;
}

/* ---------------- admin: schedule management ---------------- */

export async function listSlots(from, to) {
  return fetchAll(() =>
    supabase
      .from("availability_slots")
      .select("*")
      .gte("starts_at", new Date(from).toISOString())
      .lt("starts_at", new Date(to).toISOString())
      .order("starts_at")
  );
}

// PENDING/APPROVED bookings that sit on the given slots (used to warn before blocking a date).
export async function listActiveBookingsOnSlots(slotIds) {
  if (!slotIds.length) return [];
  const rows = [];
  for (let i = 0; i < slotIds.length; i += 50) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, status, guest_name, availability_slots(starts_at)")
      .in("slot_id", slotIds.slice(i, i + 50))
      .in("status", ["PENDING", "APPROVED"]);
    if (error) throw error;
    rows.push(...data);
  }
  return rows;
}

export async function createSlot({ startsAt, endsAt, capacity = 1 }) {
  const { data, error } = await supabase
    .from("availability_slots")
    .insert({ starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), capacity })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setSlotBlocked(slotId, isBlocked) {
  const { error } = await supabase.from("availability_slots").update({ is_blocked: isBlocked }).eq("id", slotId);
  if (error) throw error;
}

/* ---------------- admin: service management ---------------- */

export async function listAllServices() {
  const { data, error } = await supabase.from("services").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function createService(service) {
  const { data, error } = await supabase.from("services").insert(service).select().single();
  if (error) throw error;
  return data;
}

export async function updateService(id, changes) {
  const { data, error } = await supabase.from("services").update(changes).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/* ---------------- admin: service management (lookup) ---------------- */

export async function listPiercingTypes() {
  const { data, error } = await supabase.from("piercing_types").select("id, name").order("name");
  if (error) throw error;
  return data;
}

/* ---------------- admin: clients ---------------- */

// There are no customer accounts, so "clients" are guests grouped by phone number.
// The name and email shown are from their most recent booking.
// visits = COMPLETED appointments; bookings = every request they have made.
export async function listCustomers() {
  const data = await fetchAll(() =>
    supabase
      .from("appointments")
      .select("status, created_at, guest_name, guest_phone, guest_email, availability_slots(starts_at)")
      .order("created_at", { ascending: false })
      .order("id")
  );

  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const clients = new Map(); // phone -> client (rows arrive newest first)
  for (const a of data) {
    let c = clients.get(a.guest_phone);
    if (!c) {
      c = {
        id: a.guest_phone,
        full_name: a.guest_name,
        phone: a.guest_phone,
        email: a.guest_email,
        bookings: 0,
        visits: 0,
        lastVisit: null,
      };
      clients.set(a.guest_phone, c);
    }
    if (!c.email && a.guest_email) c.email = a.guest_email;
    c.bookings += 1;
    if (a.status === "COMPLETED") {
      c.visits += 1;
      const startsAt = one(a.availability_slots)?.starts_at ?? null;
      if (startsAt && (!c.lastVisit || startsAt > c.lastVisit)) c.lastVisit = startsAt;
    }
  }
  return [...clients.values()].sort((x, y) => (x.full_name ?? "").localeCompare(y.full_name ?? ""));
}
