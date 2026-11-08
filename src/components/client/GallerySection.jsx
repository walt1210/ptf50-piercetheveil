import { useEffect, useState } from "react";
import { galleryItems } from "../../data/studioContent";

const sampleModules = import.meta.glob("../../assets/images/*.png", {
  eager: true,
  import: "default",
});

const styleOrder = [
  "Conch",
  "Eyebrow",
  "Flat",
  "Helix",
  "Lobes",
  "Rook",
  "Snake Bites",
  "Upper Lobes",
  "Vertical Helix",
];

const styleAliases = {
  conch: "Conch",
  eyebrow: "Eyebrow",
  flat: "Flat",
  helix: "Helix",
  lobes: "Lobes",
  rook: "Rook",
  "snake bites": "Snake Bites",
  "upper lobes": "Upper Lobes",
  upperlobes: "Upper Lobes",
  "vertical helix": "Vertical Helix",
};

function getStyle(path) {
  const filename = path.split("/").pop();
  const normalized = filename
    .replace(/\.png$/i, "")
    .replace(/\s*\(\d+\)$/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return styleAliases[normalized] || normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const piercingGroups = Object.entries(sampleModules)
  .map(([path, src]) => ({ path, src, style: getStyle(path) }))
  .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
  .reduce((groups, sample) => {
    const group = groups.find((item) => item.style === sample.style);
    if (group) group.samples.push(sample);
    else groups.push({ style: sample.style, samples: [sample] });
    return groups;
  }, [])
  .sort((a, b) => styleOrder.indexOf(a.style) - styleOrder.indexOf(b.style));

const earPlacementSketch = galleryItems.find((item) => item.featured);

export default function GallerySection() {
  const [selectedSample, setSelectedSample] = useState(null);

  useEffect(() => {
    if (!selectedSample) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedSample(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedSample]);

  return (
    <section className="gallery section" id="gallery">
      <div className="gallery__heading gallery__heading--single">
        <div>
          <p className="eyebrow eyebrow--dark"><span /> From the piercetheveil.ac archive</p>
          <h2>Look closer.</h2>
        </div>
        <p>
          A hand-drawn placement reference followed by real piercing work, grouped by style.
        </p>
      </div>

      <figure className="gallery-feature">
        <img
          src={earPlacementSketch.src}
          alt={earPlacementSketch.alt}
          loading="lazy"
        />
        <figcaption>
          <span>{earPlacementSketch.category}</span>
          <strong>{earPlacementSketch.title}</strong>
          <small>Right and left ear placement reference</small>
        </figcaption>
      </figure>

      <div className="piercing-gallery" aria-labelledby="piercing-gallery-title">
        <div className="piercing-gallery__intro">
          <div>
            <p className="eyebrow eyebrow--dark"><span /> Piercing portfolio</p>
            <h3 id="piercing-gallery-title">Arranged by style.</h3>
          </div>
          <p>
            Browse recent placements by piercing type. Select any image to view the full artwork.
          </p>
        </div>

        <div className="piercing-gallery__groups">
          {piercingGroups.map((group) => {
            const groupId = `piercing-${group.style.toLowerCase().replace(/\s+/g, "-")}`;

            return (
              <section className="piercing-gallery__group" key={group.style} aria-labelledby={groupId}>
                <div className="piercing-gallery__group-heading">
                  <h4 id={groupId}>{group.style}</h4>
                  <span>{group.samples.length} {group.samples.length === 1 ? "sample" : "samples"}</span>
                </div>

                <div className="piercing-gallery__grid">
                  {group.samples.map((sample, index) => (
                    <button
                      className="piercing-sample"
                      key={sample.path}
                      type="button"
                      onClick={() => setSelectedSample({
                        ...sample,
                        index,
                        total: group.samples.length,
                      })}
                      aria-label={`View ${group.style} piercing sample ${index + 1} of ${group.samples.length}`}
                    >
                      <img
                        src={sample.src}
                        alt={`${group.style} piercing sample ${index + 1}`}
                        loading="lazy"
                      />
                      <span className="piercing-sample__shade" />
                      <span className="piercing-sample__copy">
                        <small>Sample {String(index + 1).padStart(2, "0")}</small>
                        <strong>{group.style}</strong>
                      </span>
                      <span className="piercing-sample__open" aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {selectedSample && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedSample.style} piercing sample`}
          onClick={() => setSelectedSample(null)}
        >
          <button
            className="lightbox__close"
            type="button"
            aria-label="Close image"
            onClick={() => setSelectedSample(null)}
          >
            ×
          </button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img
              src={selectedSample.src}
              alt={`${selectedSample.style} piercing sample ${selectedSample.index + 1}`}
            />
            <figcaption>
              <span>{selectedSample.style}</span>
              Sample {String(selectedSample.index + 1).padStart(2, "0")} of {String(selectedSample.total).padStart(2, "0")}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
