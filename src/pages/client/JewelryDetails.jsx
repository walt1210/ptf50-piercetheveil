import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../../components/client/PageHero";
import { getJewelry } from "../../features/jewelry/jewelryService";
import { formatPeso, toUserMessage } from "../../services/api";

export default function JewelryDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setNotFound(false);
    getJewelry(id, { onlyActive: true })
      .then((data) => !cancelled && setItem(data))
      .catch((e) => {
        if (cancelled) return;
        setItem(null);
        if (e?.code === "PGRST116" || e?.code === "22P02") setNotFound(true); // no such row / not a valid id
        else setError(toUserMessage(e));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const placements = (item?.jewelry_compatibility ?? [])
    .filter((c) => c.approved)
    .map((c) => (Array.isArray(c.piercing_types) ? c.piercing_types[0] : c.piercing_types)?.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const inStock = item && item.stock > 0;

  return (
    <main>
      <PageHero eyebrow="Jewelry" title={item ? item.name : <>Jewelry <em>details.</em></>} />
      <section className="page-body">
        <p><Link className="link-button" to="/catalog">← Back to the collection</Link></p>

        {loading && <p className="callout" role="status">Loading…</p>}
        {!loading && notFound && <p className="callout">We could not find that piece. It may no longer be available.</p>}
        {!loading && error && <p className="callout callout--error" role="alert">{error}</p>}

        {!loading && item && (
          <div className="detail">
            <div className="detail__media">
              {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span aria-hidden="true">◇</span>}
            </div>
            <div className="detail__info">
              <p className="detail__price">{formatPeso(item.price)}</p>
              <p className={`detail__stock ${inStock ? "" : "detail__stock--out"}`}>{inStock ? "In stock" : "Currently sold out"}</p>
              {item.description && <p className="detail__description">{item.description}</p>}
              <dl className="detail__facts">
                {item.material && <div><dt>Material</dt><dd>{item.material}</dd></div>}
                {item.style && <div><dt>Style</dt><dd>{item.style}</dd></div>}
                {item.color && <div><dt>Color</dt><dd>{item.color}</dd></div>}
                <div><dt>Shop-approved for</dt><dd>{placements.length ? placements.join(", ") : "Ask the shop"}</dd></div>
              </dl>
              <p className="detail__note">Your piercer confirms final suitability for your anatomy during your appointment.</p>
              <div className="detail__actions">
                <Link className="button button--dark" to="/availability">Book a piercing</Link>
                <Link className="link-button" to="/recommend">Not sure? Ask the AI stylist</Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
