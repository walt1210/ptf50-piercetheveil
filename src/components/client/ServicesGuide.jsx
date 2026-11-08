import { useState } from "react";
import { serviceCategories } from "../../data/studioContent";

export default function ServicesGuide() {
  const [activeId, setActiveId] = useState(serviceCategories[0].id);
  const active = serviceCategories.find((category) => category.id === activeId);

  return (
    <section className="price-guide section" id="price-guide">
      <div className="price-guide__intro">
        <p className="eyebrow eyebrow--dark"><span /> Services & price guide</p>
        <h2>Choose your<br /><em>placement.</em></h2>
        <p>
          Browse piercetheveil.ac’s current piercing menu.
          Every placement is still subject to an anatomy assessment.
        </p>
        <div className="price-guide__tabs" role="tablist" aria-label="Piercing categories">
          {serviceCategories.map((category) => (
            <button
              type="button"
              role="tab"
              aria-selected={category.id === activeId}
              className={category.id === activeId ? "active" : ""}
              onClick={() => setActiveId(category.id)}
              key={category.id}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="price-card" role="tabpanel">
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
              <strong>₱{price}</strong>
            </div>
          ))}
        </div>
        <p className="price-card__note">
          Prices were transcribed from the supplied graphics. Confirm jewelry options, availability, and the final total during consultation.
        </p>
      </div>
    </section>
  );
}
