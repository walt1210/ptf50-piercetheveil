import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/client/PageHero";
import ProductCard from "../../components/client/ProductCard";
import { listJewelry, listPiercingTypes } from "../../features/jewelry/jewelryService";
import { distinctValues, filterJewelry } from "../../features/jewelry/jewelryFilters";
import { toUserMessage } from "../../services/api";

const NO_FILTERS = { search: "", piercingTypeId: "", material: "", style: "", maxPrice: "", inStockOnly: false };

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [filters, setFilters] = useState(NO_FILTERS);

  // The catalog is small, so load it once and filter in the browser.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([listJewelry({ onlyActive: true }), listPiercingTypes()])
      .then(([jewelry, piercingTypes]) => {
        if (cancelled) return;
        setItems(jewelry ?? []);
        setTypes(piercingTypes ?? []);
      })
      .catch((e) => !cancelled && setError(toUserMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const materials = useMemo(() => distinctValues(items, "material"), [items]);
  const styles = useMemo(() => distinctValues(items, "style"), [items]);
  const shown = useMemo(() => filterJewelry(items, filters), [items, filters]);
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  return (
    <main>
      <PageHero eyebrow="Curated jewelry" title={<>The <em>collection.</em></>}>
        Pieces chosen by the shop. Filter by where you are getting pierced, then book a time, or let the AI stylist suggest a match.
      </PageHero>

      <section className="page-body">
        <div className="filters">
          <label className="field"><span>Search</span>
            <input type="search" placeholder="Name or keyword" value={filters.search} onChange={set("search")} />
          </label>
          <label className="field"><span>Piercing</span>
            <select value={filters.piercingTypeId} onChange={set("piercingTypeId")}>
              <option value="">Any placement</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Material</span>
            <select value={filters.material} onChange={set("material")}>
              <option value="">Any material</option>
              {materials.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="field"><span>Style</span>
            <select value={filters.style} onChange={set("style")}>
              <option value="">Any style</option>
              {styles.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field"><span>Max price (PHP)</span>
            <input type="number" inputMode="numeric" min="0" placeholder="No limit" value={filters.maxPrice} onChange={set("maxPrice")} />
          </label>
          <label className="field field--check">
            <input type="checkbox" checked={filters.inStockOnly} onChange={set("inStockOnly")} /> <span>In stock only</span>
          </label>
        </div>

        {loading && <p className="callout" role="status">Loading the collection…</p>}
        {!loading && error && (
          <div className="callout callout--error" role="alert">
            <p>{error}</p>
            <button className="button button--dark" type="button" onClick={() => setTick((t) => t + 1)}>Try again</button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="callout">The collection is being updated. Please check back soon.</p>
        )}
        {!loading && !error && items.length > 0 && (
          <>
            <p className="result-count" role="status">
              {shown.length} {shown.length === 1 ? "piece" : "pieces"}
              {filtersActive && <button type="button" className="link-button" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>}
            </p>
            {shown.length === 0 ? (
              <p className="callout">Nothing matches those filters. Try removing one.</p>
            ) : (
              <div className="product-grid">
                {shown.map((item) => <ProductCard key={item.id} item={item} />)}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
