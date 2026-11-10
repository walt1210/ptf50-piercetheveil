// Builds the Home page price guide from the LIVE services (the ones customers can book).
// The static list in data/studioContent.js is only used for category names, wording and display order,
// and as a fallback if the services cannot be loaded. Prices and availability always come from the database,
// so editing a price or deactivating a service in the admin changes the guide too.

const norm = (value) => String(value ?? "").trim().toLowerCase();

const OTHER = {
  id: "other",
  label: "More services",
  description: "Other services offered by the shop.",
};

// services: [{ name, price }] (active only). staticCategories: serviceCategories from studioContent.
// Returns the same shape as serviceCategories: [{ id, label, description, items: [[name, price], ...] }]
// Empty categories are left out, so a category disappears when all of its services are deactivated.
export function buildGuideCategories(services, staticCategories) {
  const position = new Map(); // service name -> { cat, order }
  staticCategories.forEach((cat, c) => cat.items.forEach(([name], i) => position.set(norm(name), { cat: c, order: i })));

  const buckets = staticCategories.map(() => []);
  const others = [];

  for (const svc of services ?? []) {
    const price = Number(svc.price);
    if (!svc?.name || !Number.isFinite(price)) continue;
    const spot = position.get(norm(svc.name));
    if (spot) buckets[spot.cat].push({ name: svc.name, price, order: spot.order });
    else others.push({ name: svc.name, price, order: Infinity });
  }

  const toItems = (list) =>
    list
      .sort((a, b) => a.order - b.order || a.price - b.price || a.name.localeCompare(b.name))
      .map((s) => [s.name, s.price]);

  const categories = staticCategories.map((cat, c) => ({ ...cat, items: toItems(buckets[c]) }));
  if (others.length) categories.push({ ...OTHER, items: toItems(others) });
  return categories.filter((cat) => cat.items.length > 0);
}
