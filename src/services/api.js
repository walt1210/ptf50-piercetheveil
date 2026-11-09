// Shared helpers for every *Service.js file.

// Turn database/RPC errors into messages safe to show on screen.
export function toUserMessage(error) {
  if (!error) return "";
  const m = error.message || "";
  if (error.code === "23505" && m.includes("Duplicate request"))
    return "This phone number already has a request for that time slot.";
  if (error.code === "23505") return "That record already exists.";
  if (m.includes("Slot is full")) return "Sorry, that time slot was just taken. Please pick another.";
  if (m.includes("Slot not available") || m.includes("New slot not available"))
    return "That time slot is no longer available.";
  if (m.includes("Service not available")) return "That service is not available right now.";
  if (m.includes("Too many active bookings"))
    return "You already have 3 upcoming requests. Please wait for the shop to confirm one, or cancel one first.";
  if (m.includes("Too many requests right now"))
    return "We are getting a lot of requests right now. Please try again in a few minutes.";
  if (m.includes("Too many attempts"))
    return "Too many tries. Please wait about 15 minutes, or message the shop on Instagram.";
  if (m.includes("Too many requests from this device"))
    return "You have sent several requests already. Please wait a bit, or message the shop on Instagram.";
  if (m.includes("Invalid phone number")) return "Please enter a valid mobile number, e.g. 0917 123 4567.";
  if (m.includes("Please enter your name")) return "Please enter your name.";
  if (m.includes("Invalid email address")) return "That email address does not look right.";
  if (m.includes("Notes are too long")) return "Your notes are too long. Please shorten them.";
  if (m.includes("Booking not found")) return "We could not find a booking with that code and phone number.";
  if (m.includes("can no longer be cancelled"))
    return "This appointment can no longer be cancelled online. Please message the shop.";
  if (m.includes("Admins only")) return "You do not have permission to do that.";
  if (m.includes("Invalid status change")) return "That change isn't allowed for this appointment's current status.";
  if (m.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("permission denied") || m.includes("row-level security"))
    return "You do not have permission to do that.";
  return m || "Something went wrong. Please try again.";
}

// Timestamps are stored in UTC; always DISPLAY in Philippine time.
export function formatManila(iso, opts = { dateStyle: "medium", timeStyle: "short" }) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...opts }).format(new Date(iso));
}

// "PHP 1,250.00" style price for display.
export function formatPeso(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount) || 0);
}
