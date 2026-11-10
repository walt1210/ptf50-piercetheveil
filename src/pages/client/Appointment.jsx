import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useAvailableSlots,
  useRequestAppointment,
  useServices,
} from "../../hooks/useAppointments";
import { formatManila } from "../../services/api";
import {
  MAX_ADDRESS_LENGTH,
  MAX_EXTRA_NOTES_LENGTH,
  buildBookingNotes,
  formatReference,
  validateAddress,
  validateGuestDetails,
} from "../../features/appointments/appointmentValidation";

const MANILA_OFFSET = "+08:00";
const SETTING_LABELS = { address: "Client address", popup: "Pop-up booth" };
// Flip to true when the shop announces a pop-up booth. Until then the option stays visible but cannot be chosen,
// so nobody books a pop-up that does not exist.
const POPUP_AVAILABLE = false;

const manilaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" of an instant, as seen in Asia/Manila.
function manilaDateKey(value) {
  const parts = manilaDateFormatter.formatToParts(new Date(value));
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

// "YYYY-MM-DD" of a calendar cell. Calendar cells are plain dates, treated as Manila dates.
function localDateKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeLabel(iso) {
  return formatManila(iso, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
}

function formatPrice(price) {
  return `₱${Number(price).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

// Today's date in Manila, as a Date at 12:00 so daylight and timezone shifts never change the day.
function getToday() {
  const [year, month, day] = manilaDateKey(new Date()).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getFirstAvailableDate() {
  const date = getToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function makeCalendarDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const cursor = new Date(first);
  cursor.setDate(1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + index);
    return date;
  });
}

function isSameDate(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("en-PH", options).format(date);
}

export default function Appointment() {
  const { services, loading: servicesLoading, error: servicesError, reload: reloadServices } = useServices();
  const { request, submitting } = useRequestAppointment();

  const today = useMemo(getToday, []);
  const lastBookableDate = useMemo(() => {
    const date = getToday();
    date.setDate(date.getDate() + 60);
    return date;
  }, []);
  const firstAvailableDate = useMemo(getFirstAvailableDate, []);

  // One request covers the whole bookable window, so the calendar can show which days have open times.
  const slotsFrom = useMemo(() => new Date(`${localDateKey(today)}T00:00:00${MANILA_OFFSET}`), [today]);
  const slotsTo = useMemo(() => new Date(`${localDateKey(lastBookableDate)}T23:59:59${MANILA_OFFSET}`), [lastBookableDate]);
  const { slots, loading: slotsLoading, error: slotsError, reload: reloadSlots } = useAvailableSlots(slotsFrom, slotsTo);

  const [serviceId, setServiceId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(firstAvailableDate);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(firstAvailableDate.getFullYear(), firstAvailableDate.getMonth(), 1, 12),
  );
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [visitType, setVisitType] = useState("address");
  const [notice, setNotice] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [address, setAddress] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const userPickedDate = useRef(false);
  const [confirmation, setConfirmation] = useState(null); // { reference } after a successful request

  // With nothing picked yet, the first service is pre-selected. If the picked service is no longer
  // offered (the shop deactivated it), do NOT quietly switch to a different one: clear it and ask.
  const pickedService = services.find((item) => item.id === serviceId) ?? null;
  const pickedGone = Boolean(serviceId) && !servicesLoading && !servicesError && !pickedService;
  const service = pickedService ?? (serviceId === null ? services[0] ?? null : null);

  useEffect(() => {
    if (pickedGone) {
      setServiceId("");
      setNotice("That piercing is no longer available. Please choose another one.");
    }
  }, [pickedGone]);

  // Open slots grouped by Asia/Manila date, each day sorted by time.
  const slotsByDate = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      const key = manilaDateKey(slot.starts_at);
      const list = map.get(key) ?? [];
      list.push({
        id: slot.id,
        startsAt: slot.starts_at,
        label: formatTimeLabel(slot.starts_at),
        remaining: Number(slot.remaining ?? 0),
      });
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    }
    return map;
  }, [slots]);

  const openDays = useMemo(() => {
    const days = new Set();
    for (const [key, list] of slotsByDate) {
      if (list.some((slot) => slot.remaining > 0)) days.add(key);
    }
    return days;
  }, [slotsByDate]);
  const slotsReady = !slotsLoading && !slotsError;

  // Until the customer picks a date themselves, jump to the first day that actually has open times.
  useEffect(() => {
    if (userPickedDate.current || !slotsReady || openDays.size === 0) return;
    if (openDays.has(localDateKey(selectedDate))) return;
    const todayKey = localDateKey(today);
    const firstKey = [...openDays].filter((key) => key > todayKey).sort()[0];
    if (!firstKey) return;
    const [year, month, day] = firstKey.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, day, 12));
    setCalendarMonth(new Date(year, month - 1, 1, 12));
  }, [slotsReady, openDays, selectedDate, today]);

  const daySlots = slotsByDate.get(localDateKey(selectedDate)) ?? [];
  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId && slot.remaining > 0) ?? null;
  const calendarDays = useMemo(() => makeCalendarDays(calendarMonth), [calendarMonth]);
  const firstCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const lastCalendarMonth = new Date(lastBookableDate.getFullYear(), lastBookableDate.getMonth(), 1, 12);
  const canGoBack = calendarMonth > firstCalendarMonth;
  const canGoForward = calendarMonth < lastCalendarMonth;

  const selectDate = (date) => {
    userPickedDate.current = true;
    setSelectedDate(date);
    setSelectedSlotId("");
    setNotice("");
  };

  const moveMonth = (amount) => {
    setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1, 12));
  };

  const continueRequest = async () => {
    if (!service) {
      setNotice("Choose a piercing to continue.");
      return;
    }
    if (!selectedSlot) {
      setNotice("Choose an available time to continue.");
      return;
    }
    const guestCheck = validateGuestDetails({ name: guestName, phone: guestPhone, email: guestEmail });
    if (!guestCheck.ok) {
      setNotice(guestCheck.message);
      return;
    }

    if (visitType === "address") {
      const addressCheck = validateAddress(address);
      if (!addressCheck.ok) {
        setNotice(addressCheck.message);
        return;
      }
    }

    setNotice("");
    const result = await request({
      serviceId: service.id,
      slotId: selectedSlot.id,
      guestName,
      guestPhone,
      guestEmail,
      notes: buildBookingNotes({
        settingLabel: SETTING_LABELS[visitType],
        address: visitType === "address" ? address : "",
        extra: extraNotes,
      }),
      slotStartsAt: selectedSlot.startsAt,
    });

    if (result.ok) {
      setConfirmation({ reference: result.reference });
      setSelectedSlotId("");
    } else {
      setNotice(result.message);
      // if the service was just deactivated, refresh the list so it disappears from the options
      if (/service is not available/i.test(result.message || "")) reloadServices();
    }
    reloadSlots(); // refresh so a slot that was just taken disappears
  };

  const startAnotherRequest = () => {
    setConfirmation(null);
    setNotice("");
  };

  return (
    <div className="availability-page">
      <main>
        <section className="availability-hero">
          <div className="availability-hero__texture" />
          <div className="availability-hero__copy">
            <p className="eyebrow"><span /> Book an appointment · Angeles City</p>
            <h1>Find a time<br /><em>that feels right.</em></h1>
            <p>
              Check upcoming client-address availability and announced pop-up dates.
              Final timing and location are confirmed personally before your appointment.
            </p>
          </div>

          <aside className="availability-hero__note">
            <span>Good to know</span>
            <p>piercetheveil.ac is an independent mobile and pop-up piercing business—there is no permanent studio location.</p>
          </aside>
        </section>

        <section className="availability-workspace">
          <div className="availability-intro">
            <div>
              <p className="eyebrow eyebrow--dark"><span /> Check availability</p>
              <h2>Plan your <em>appointment.</em></h2>
            </div>
            <p>Select a service, preferred date, and open time. Times shown are open in the shop's schedule and are requested, not guaranteed, until the shop confirms.</p>
          </div>

          <div className="availability-layout">
            <div className="availability-flow">
              <section className="availability-step" aria-labelledby="service-step">
                <div className="availability-step__heading">
                  <span>01</span>
                  <div><h3 id="service-step">Choose a piercing</h3><p>Pricing is based on the current service guide.</p></div>
                </div>
                {servicesLoading && <p className="booking-summary__notice" role="status">Loading services…</p>}
                {!servicesLoading && servicesError && (
                  <div>
                    <p className="booking-summary__notice" role="alert">{servicesError}</p>
                    <button type="button" onClick={reloadServices}>Try again</button>
                  </div>
                )}
                {!servicesLoading && !servicesError && (
                  <div className="service-options">
                    {services.map((item) => (
                      <button
                        className={service?.id === item.id ? "active" : ""}
                        key={item.id}
                        type="button"
                        onClick={() => { setServiceId(item.id); setNotice(""); }}
                      >
                        <span>{item.name}</span>
                        <small>from {formatPrice(item.price)} · {item.duration_minutes} min</small>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="availability-step" aria-labelledby="date-step">
                <div className="availability-step__heading">
                  <span>02</span>
                  <div><h3 id="date-step">Pick a date</h3><p>Days marked Open have times you can request.</p></div>
                </div>
                <div className="booking-calendar">
                  <div className="booking-calendar__header">
                    <button
                      aria-label="Previous month"
                      disabled={!canGoBack}
                      onClick={() => moveMonth(-1)}
                      type="button"
                    >
                      ←
                    </button>
                    <strong>{formatDate(calendarMonth, { month: "long", year: "numeric" })}</strong>
                    <button
                      aria-label="Next month"
                      disabled={!canGoForward}
                      onClick={() => moveMonth(1)}
                      type="button"
                    >
                      →
                    </button>
                  </div>

                  <div className="booking-calendar__weekdays" aria-hidden="true">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
                  </div>

                  <div className="booking-calendar__days">
                    {calendarDays.map((date) => {
                      const outsideMonth = date.getMonth() !== calendarMonth.getMonth();
                      const noOpenTimes = slotsReady && !openDays.has(localDateKey(date));
                      const unavailableDay = date <= today || date > lastBookableDate || outsideMonth || noOpenTimes;
                      const active = isSameDate(date, selectedDate);

                      return (
                        <button
                          aria-label={`${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}${unavailableDay ? ', unavailable' : ''}`}
                          className={`${active ? "active" : ""} ${outsideMonth ? "outside" : ""}`}
                          disabled={unavailableDay}
                          key={date.toISOString()}
                          onClick={() => selectDate(date)}
                          type="button"
                        >
                          <span>{date.getDate()}</span>
                          {!unavailableDay && <small>Open</small>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="booking-calendar__legend">
                    <span><i className="booking-calendar__dot booking-calendar__dot--open" /> Available</span>
                    <span><i className="booking-calendar__dot booking-calendar__dot--selected" /> Selected</span>
                    <span><i className="booking-calendar__dot" /> Unavailable</span>
                  </div>
                </div>
              </section>

              <section className="availability-step" aria-labelledby="time-step">
                <div className="availability-step__heading">
                  <span>03</span>
                  <div>
                    <h3 id="time-step">Choose a time</h3>
                    <p>{formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
                <div className="time-options">
                  {slotsLoading && daySlots.length === 0 && (
                    <p className="booking-summary__notice" role="status">Loading available times…</p>
                  )}
                  {!slotsLoading && slotsError && (
                    <>
                      <p className="booking-summary__notice" role="alert">{slotsError}</p>
                      <button type="button" onClick={reloadSlots}>Try again</button>
                    </>
                  )}
                  {slotsReady && daySlots.length === 0 && (
                    <p className="booking-summary__notice" role="status">No open times on this date. Please pick another day.</p>
                  )}
                  {daySlots.map((slot) => {
                    const disabled = slot.remaining <= 0;
                    return (
                      <button
                        className={selectedSlot?.id === slot.id ? "active" : ""}
                        disabled={disabled}
                        key={slot.id}
                        type="button"
                        onClick={() => { setSelectedSlotId(slot.id); setNotice(""); }}
                      >
                        {slot.label}<small>{disabled ? "Taken" : "Available"}</small>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="availability-step" aria-labelledby="visit-step">
                <div className="availability-step__heading">
                  <span>04</span>
                  <div><h3 id="visit-step">Appointment setting</h3><p>Exact details are confirmed after the request.</p></div>
                </div>
                <div className="visit-options">
                  <button className={visitType === "address" ? "active" : ""} type="button" onClick={() => setVisitType("address")}>
                    <span>Client address</span>
                    <small>Select areas around Angeles City · subject to setup review</small>
                  </button>
                  <button
                    className={visitType === "popup" ? "active" : ""}
                    type="button"
                    disabled={!POPUP_AVAILABLE}
                    onClick={() => setVisitType("popup")}
                  >
                    <span>Pop-up booth</span>
                    <small>{POPUP_AVAILABLE ? "Join an announced pop-up date" : "No pop-up dates announced right now · check Instagram for updates"}</small>
                  </button>
                </div>
                {visitType === "address" && (
                  <div className="guest-form guest-form--setting">
                    <label className="guest-form__wide">
                      <span>Address or landmark</span>
                      <input
                        autoComplete="street-address"
                        maxLength={MAX_ADDRESS_LENGTH}
                        onChange={(e) => { setAddress(e.target.value); setNotice(""); }}
                        placeholder="Barangay, street, and a nearby landmark"
                        type="text"
                        value={address}
                      />
                    </label>
                    <p className="guest-form__privacy">The shop reviews your address before approving, and may message you to confirm the exact spot.</p>
                  </div>
                )}
              </section>

              <section className="availability-step" aria-labelledby="details-step">
                <div className="availability-step__heading">
                  <span>05</span>
                  <div><h3 id="details-step">Your details</h3><p>So the shop can confirm your appointment. No account needed.</p></div>
                </div>
                <div className="guest-form">
                  <label>
                    <span>Full name</span>
                    <input
                      autoComplete="name"
                      maxLength={80}
                      onChange={(e) => { setGuestName(e.target.value); setNotice(""); }}
                      placeholder="Juan Dela Cruz"
                      type="text"
                      value={guestName}
                    />
                  </label>
                  <label>
                    <span>Mobile number</span>
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={20}
                      onChange={(e) => { setGuestPhone(e.target.value); setNotice(""); }}
                      placeholder="0917 123 4567"
                      type="tel"
                      value={guestPhone}
                    />
                  </label>
                  <label>
                    <span>Email <em>(optional)</em></span>
                    <input
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      onChange={(e) => { setGuestEmail(e.target.value); setNotice(""); }}
                      placeholder="you@example.com"
                      type="email"
                      value={guestEmail}
                    />
                  </label>
                  <label className="guest-form__wide">
                    <span>Anything we should know? <em>(optional)</em></span>
                    <textarea
                      maxLength={MAX_EXTRA_NOTES_LENGTH}
                      onChange={(e) => { setExtraNotes(e.target.value); setNotice(""); }}
                      placeholder="Piercing placement you have in mind, jewelry you like, first piercing, allergies…"
                      rows={3}
                      value={extraNotes}
                    />
                    <small className="guest-form__count">{extraNotes.length}/{MAX_EXTRA_NOTES_LENGTH}</small>
                  </label>
                  <p className="guest-form__privacy">We use your name, number, address and notes only to confirm and manage your appointment.</p>
                </div>
              </section>
            </div>

            <aside className="booking-summary">
              <p className="booking-summary__eyebrow">Your selection</p>
              <h3>Appointment summary</h3>
              <dl>
                <div><dt>Service</dt><dd>{service ? service.name : "Not selected"}</dd></div>
                <div><dt>Starting price</dt><dd>{service ? formatPrice(service.price) : "—"}</dd></div>
                <div><dt>Date</dt><dd>{formatDate(selectedDate, { month: "short", day: "numeric", year: "numeric" })}</dd></div>
                <div><dt>Time</dt><dd>{selectedSlot ? selectedSlot.label : "Not selected"}</dd></div>
                <div><dt>Setting</dt><dd>{SETTING_LABELS[visitType]}</dd></div>
                {visitType === "address" && <div><dt>Address</dt><dd>{address.trim() || "—"}</dd></div>}
                <div><dt>Name</dt><dd>{guestName.trim() || "—"}</dd></div>
              </dl>
              <div className="booking-summary__message">
                <strong>Final confirmation required</strong>
                <p>Jewelry choice, anatomy, address suitability, travel details, and final total are reviewed before approval.</p>
              </div>
              {confirmation ? (
                <div className="booking-confirmation" role="status">
                  <strong>Request sent!</strong>
                  <p>Your appointment is <b>pending</b>. The shop will review it and contact you to confirm.</p>
                  <p className="booking-confirmation__label">Your reference code</p>
                  <p className="booking-confirmation__code">{formatReference(confirmation.reference)}</p>
                  <p>Take a screenshot or write it down. You will need this code and your mobile number to check or cancel your request.</p>
                  <p><Link to={`/booking?ref=${confirmation.reference}`}>Check or cancel this request later</Link></p>
                  <button className="booking-summary__cta" type="button" onClick={startAnotherRequest}>
                    Make another request <span>→</span>
                  </button>
                </div>
              ) : (
                <>
                  <button className="booking-summary__cta" type="button" disabled={submitting} aria-busy={submitting} onClick={continueRequest}>
                    {submitting ? "Sending request…" : "Send request"} <span>→</span>
                  </button>
                  {notice && <p className="booking-summary__notice" role="alert">{notice}</p>}
                </>
              )}
              <a href="https://www.instagram.com/piercetheveil.ac/" target="_blank" rel="noreferrer">Questions? Message @piercetheveil.ac</a>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
