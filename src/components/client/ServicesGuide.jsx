import { useEffect, useMemo, useState } from "react";
import { serviceCategories } from "../../data/studioContent";
import { listServices } from "../../features/appointments/appointmentService";
import { buildGuideCategories } from "../../features/appointments/serviceGuide";

const formatPrice = (price) => `₱${Number(price).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

export default function ServicesGuide() {
  // "loading" -> "live" (from the database) | "fallback" (could not load: show the built-in list)
  const [status, setStatus] = useState("loading");
  const [services, setServices] = useState([]);
  const [activeId, setActiveId] = useState(serviceCategories[0].id);

  useEffect(() => {
    let cancelled = false;
    listServices()
      .then((rows) => {
        if (cancelled) return;
        setServices(rows ?? []);
        setStatus("live");
      })
      .catch(() => !cancelled && setStatus("fallback"));
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => (status === "live" ? buildGuideCategories(services, serviceCategories) : serviceCategories),
    [status, services],
  );
  const active = categories.find((category) => category.id === activeId) ?? categories[0];

  return (
    <section className="price-guide section" id="price-guide">
      <div className="price-guide__intro">
        <p className="eyebrow eyebrow--dark"><span /> Services & price guide</p>
        <h2>Choose your<br /><em>placement.</em></h2>
        <p>
          Browse piercetheveil.ac’s current piercing menu.
          Every placement is still subject to an anatomy assessment.
        </p>
        {categories.length > 0 && (
          <div className="price-guide__tabs" role="tablist" aria-label="Piercing categories">
            {categories.map((category) => (
              <button
                type="button"
                role="tab"
                aria-selected={category.id === active?.id}
                className={category.id === active?.id ? "active" : ""}
                onClick={() => setActiveId(category.id)}
                key={category.id}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="price-card" role="tabpanel">
        {status === "loading" && <p className="price-card__note" role="status">Loading the price guide…</p>}

        {status !== "loading" && !active && (
          <p className="price-card__note">
            Our price list is being updated. Please message @piercetheveil.ac on Instagram for current rates.
          </p>
        )}

        {status !== "loading" && active && (
          <>
            <div className="price-card__header">
              <div>
                <span>Current selection</span>
                <h3>{active.label}</h3>
              </div>
              <span>{String(active.items.length).padStart(2, "0")} placements</span>
            </div>
            <p className="price-card__description">{active.description}</p>
            <div className="price-list">
              {active.items.map(([name, price]) => (
                <div className="price-list__item" key={name}>
                  <span>{name}</span>
                  <i aria-hidden="true" />
                  <strong>{formatPrice(price)}</strong>
                </div>
              ))}
            </div>
            <p className="price-card__note">
              Confirm jewelry options, availability, and the final total during consultation.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
