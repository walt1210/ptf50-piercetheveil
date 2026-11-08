// Wording shared by the admin pages: confirmation dialogs and "it worked" messages.
import { formatManila } from "../../services/api";

const slotOf = (apt) => (Array.isArray(apt.availability_slots) ? apt.availability_slots[0] : apt.availability_slots);
const whenOf = (apt) => (slotOf(apt) ? formatManila(slotOf(apt).starts_at) : "no time");

// Only actions that are hard to undo ask first.
export const CONFIRMS = {
  reject: (apt) => ({
    title: "Reject this request?",
    message: `${apt.guest_name} · ${apt.services?.name ?? "Service"} · ${whenOf(apt)}\n\nThey will see it as rejected on the booking page.`,
    confirmLabel: "Reject request",
    cancelLabel: "Keep it",
    tone: "danger",
  }),
  cancel: (apt) => ({
    title: "Cancel this appointment?",
    message: `${apt.guest_name} · ${apt.services?.name ?? "Service"} · ${whenOf(apt)}\n\nThe time slot opens up again.`,
    confirmLabel: "Cancel appointment",
    cancelLabel: "Keep appointment",
    tone: "danger",
  }),
  no_show: (apt) => ({
    title: "Mark as no-show?",
    message: `${apt.guest_name} did not arrive for ${whenOf(apt)}. This is recorded on their client record.`,
    confirmLabel: "Mark no-show",
    tone: "danger",
  }),
};

export const DONE = {
  approve: "Approved. It is now under Upcoming.",
  reject: "Request rejected.",
  complete: "Marked complete.",
  no_show: "Marked as no-show.",
  cancel: "Appointment cancelled.",
  reschedule: "Appointment moved.",
};
