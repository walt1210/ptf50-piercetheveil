// Tap-to-call and tap-to-text links. Keeps only digits and a leading "+", so spaces/dashes never break a link.
const clean = (phone) => String(phone ?? "").replace(/[^\d+]/g, "");
export const telHref = (phone) => (clean(phone) ? `tel:${clean(phone)}` : null);
export const smsHref = (phone) => (clean(phone) ? `sms:${clean(phone)}` : null);
