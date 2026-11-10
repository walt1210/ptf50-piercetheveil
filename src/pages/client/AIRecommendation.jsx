import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/client/PageHero";
import ProductCard from "../../components/client/ProductCard";
import VirtualTryOn from "../../components/client/VirtualTryOn";
import { listJewelry, listPiercingTypes } from "../../features/jewelry/jewelryService";
import { distinctValues } from "../../features/jewelry/jewelryFilters";
import { recommend } from "../../features/recommendations/recommendationService";
import { recommendPiercingSamples } from "../../features/recommendations/sampleRecommendationService";
import { toUserMessage } from "../../services/api";

const EMPTY = { piercingTypeId: "", budget: "", style: "", material: "", color: "", freeText: "" };

export default function AIRecommendation() {
  const [types, setTypes] = useState([]);
  const [catalog, setCatalog] = useState([]); // only used to offer real style/material/color choices
  const [setupError, setSetupError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // model download percent (first use only)
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selectedLook, setSelectedLook] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listPiercingTypes(), listJewelry({ onlyActive: true })])
      .then(([t, j]) => {
        if (cancelled) return;
        setTypes(t ?? []);
        setCatalog(j ?? []);
      })
      .catch((e) => !cancelled && setSetupError(toUserMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const styles = useMemo(() => distinctValues(catalog, "style"), [catalog]);
  const materials = useMemo(() => distinctValues(catalog, "material"), [catalog]);
  const colors = useMemo(() => distinctValues(catalog, "color"), [catalog]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.piercingTypeId) {
      setError("Please choose where the piercing will go.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(null);
    try {
      const shopResult = await recommend({ ...form, onProgress: setProgress });
      const placementName = types.find((type) => type.id === form.piercingTypeId)?.name;
      const inspirations = await recommendPiercingSamples({
        placementName,
        style: form.style,
        material: form.material,
        color: form.color,
        freeText: form.freeText,
        onProgress: setProgress,
      });
      setResult({ ...shopResult, inspirations });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const placementName = types.find((t) => t.id === form.piercingTypeId)?.name;

  const trySample = (sample) => {
    setSelectedLook({ ...sample }); // new object each click so picking the same look again re-applies it
    requestAnimationFrame(() => document.getElementById("virtual-try-on")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <main>
      <PageHero eyebrow="PierceWise · AI stylist" title={<>Your taste, <em>translated.</em></>}>
        Tell us where you are getting pierced and what feels like you. We check the shop&apos;s available pieces first, then use an on-device model to rank real portfolio samples for extra inspiration.
      </PageHero>

      <section className="page-body">
        <form className="stylist-form" onSubmit={submit} noValidate>
          <label className="field"><span>Where is the piercing? *</span>
            <select value={form.piercingTypeId} onChange={set("piercingTypeId")} disabled={busy}>
              <option value="">Choose a placement</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Budget (PHP, optional)</span>
            <input type="number" inputMode="numeric" min="0" placeholder="No limit" value={form.budget} onChange={set("budget")} disabled={busy} />
          </label>
          {styles.length > 0 && (
            <label className="field"><span>Style (optional)</span>
              <select value={form.style} onChange={set("style")} disabled={busy}>
                <option value="">No preference</option>
                {styles.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
          {materials.length > 0 && (
            <label className="field"><span>Material (optional)</span>
              <select value={form.material} onChange={set("material")} disabled={busy}>
                <option value="">No preference</option>
                {materials.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          )}
          {colors.length > 0 && (
            <label className="field"><span>Color (optional)</span>
              <select value={form.color} onChange={set("color")} disabled={busy}>
                <option value="">No preference</option>
                {colors.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label className="field field--wide"><span>Describe what you like (optional, English or Taglish)</span>
            <textarea rows={3} maxLength={300} value={form.freeText} onChange={set("freeText")} disabled={busy}
              placeholder="e.g. simple gold hoop, hindi masyadong mabigat" />
          </label>

          <div className="stylist-form__actions">
            <button className="button button--dark" type="submit" disabled={busy || Boolean(setupError)} aria-busy={busy}>
              {busy ? "Finding matches…" : "Find my pieces"}
            </button>
            <p className="stylist-form__privacy">Your description is processed in your browser and is not stored.</p>
          </div>
        </form>

        {setupError && <p className="callout callout--error" role="alert">{setupError}</p>}
        {error && <p className="callout callout--error" role="alert">{error}</p>}
        {busy && progress !== null && progress < 100 && (
          <p className="callout" role="status">Downloading the on-device model (first time only)… {progress}%</p>
        )}

        {result && (
          <div className="stylist-results">
            {result.mode === "none" && (
              <p className="callout" role="status">
                No current shop-stock pieces are listed for {placementName ?? "that placement"} within your budget. The inspiration board below still shows the closest real portfolio samples, or you can <Link className="link-button" to="/availability">book a time</Link> and ask what is available.
              </p>
            )}
            {result.mode === "filter" && (
              <p className="callout" role="status">Here are pieces approved for {placementName}. Add a style or a description to rank them for you.</p>
            )}
            {result.mode === "fallback" && (
              <p className="callout" role="status">Smart matching is not available right now, so these were ranked by simple keyword matching.</p>
            )}
            {result.mode === "ai" && result.lowConfidence && (
              <p className="callout" role="status">We could not find a strong match for that description. These are the closest approved options.</p>
            )}

            {result.results.length > 0 && (
              <div className="product-grid">
                {result.results.map(({ item, reasons }) => (
                  <ProductCard key={item.id} item={item}>
                    {reasons.length > 0 && (
                      <>
                        <p className="reasons__title">Why it fits</p>
                        <ul className="reasons">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                      </>
                    )}
                  </ProductCard>
                ))}
              </div>
            )}

            <p className="detail__note">{result.disclaimer}</p>
            {result.results.length > 0 && (
              <p><Link className="button button--dark" to="/availability">Book a piercing</Link></p>
            )}

            {result.inspirations?.results.length > 0 && (
              <section className="sample-results" aria-labelledby="sample-results-title">
                <div className="sample-results__heading">
                  <div>
                    <p className="eyebrow eyebrow--dark"><span /> ML-ranked portfolio</p>
                    <h2 id="sample-results-title">Piercing looks to explore.</h2>
                  </div>
                  <p>
                    These are real piercetheveil.ac placement photos, ranked against your placement and description by Hugging Face Transformers.js in your browser.
                  </p>
                </div>

                {result.inspirations.mode === "fallback" && (
                  <p className="callout" role="status">The online model could not load, so these samples use local placement and keyword matching.</p>
                )}

                <div className="sample-results__grid">
                  {result.inspirations.results.map(({ sample, reasons }) => (
                    <article className="sample-result" key={sample.id}>
                      <div className="sample-result__media">
                        <img src={sample.image} alt={`${sample.title} piercing portfolio sample`} loading="lazy" />
                        <span>{sample.title}</span>
                      </div>
                      <div className="sample-result__body">
                        <p className="sample-result__label">Portfolio inspiration</p>
                        <h3>{sample.title}</h3>
                        <p>{sample.description}</p>
                        <ul className="reasons">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                        <button className="sample-result__try" type="button" onClick={() => trySample(sample)}>
                          Try this jewelry mood <span aria-hidden="true">↘</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="detail__note">
                  Portfolio matches are inspiration, not a promise that the pictured jewelry is in stock or that the placement suits your anatomy.
                </p>
              </section>
            )}
          </div>
        )}

        <VirtualTryOn preset={selectedLook} typeName={placementName} />
      </section>
    </main>
  );
}
