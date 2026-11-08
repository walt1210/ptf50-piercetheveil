import { useState } from "react";
import CareGuide from "../../components/client/CareGuide";
import GallerySection from "../../components/client/GallerySection";
import InstagramSection from "../../components/client/InstagramSection";
import { Link } from "react-router-dom";
import ServicesGuide from "../../components/client/ServicesGuide";
import logo from "../../assets/PTV-logo.webp";

function Sigil({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 360 560" aria-hidden="true">
      <path d="M180 12c-9 83-43 113-114 139 63 3 93 21 114 74 21-53 51-71 114-74-71-26-105-56-114-139Z" />
      <path d="M180 71v426M105 123c0 62 28 91 75 102M255 123c0 62-28 91-75 102" />
      <path d="M180 226c-69 36-108 92-110 168 29-39 65-57 110-61 45 4 81 22 110 61-2-76-41-132-110-168Z" />
      <path d="M70 394c28 2 49 17 62 44M290 394c-28 2-49 17-62 44M132 438l48 59 48-59" />
      <circle cx="180" cy="226" r="13" />
      <circle cx="180" cy="497" r="7" />
    </svg>
  );
}

function Icon({ type }) {
  const paths = {
    spark: <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />,
    calendar: <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z" />,
    jewel: <path d="m4 8 4-5h8l4 5-8 13L4 8Zm0 0h16M8 3l4 5 4-5M8 8l4 13 4-13" />,
    pin: <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8.5A2.5 2.5 0 1 0 12 7a2.5 2.5 0 0 0 0 5.5Z" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

const experiences = [
  {
    number: "01",
    icon: "spark",
    title: "Independent & personal",
    text: "Pierce the Veil is a small independent piercing business built around personal service, informed choice, and individual style.",
    href: "#price-guide",
  },
  {
    number: "02",
    icon: "pin",
    title: "By appointment, where you are",
    text: "Select client-address appointments are available around Angeles City, with the location and setup confirmed before booking.",
    href: "#visit",
  },
  {
    number: "03",
    icon: "calendar",
    title: "Pop-ups around Angeles",
    text: "Occasional booths appear at different events and spots around the city. Dates and locations are announced online.",
    href: "#instagram",
  },
];

const collection = [
  { label: "The quiet edge", title: "Minimal forms", art: "minimal", note: "Clean lines · subtle shine" },
  { label: "An everyday ritual", title: "Curated stacks", art: "stack", note: "Layered · considered" },
  { label: "Made to be seen", title: "Statement pieces", art: "statement", note: "Bold form · fine detail" },
];

function JewelryArt({ type }) {
  return (
    <svg className={`jewelry-art jewelry-art--${type}`} viewBox="0 0 300 260" aria-hidden="true">
      <circle className="jewelry-art__halo" cx="150" cy="130" r="102" />
      {type === "minimal" && (
        <>
          <circle cx="150" cy="129" r="58" />
          <circle className="jewelry-art__gem" cx="150" cy="68" r="11" />
          <path d="M112 175c11 13 24 20 38 20s27-7 38-20" />
        </>
      )}
      {type === "stack" && (
        <>
          <path d="M105 73c65 17 80 101 26 136M132 54c67 28 75 121 7 166M162 52c58 43 49 130-19 169" />
          <circle className="jewelry-art__gem" cx="108" cy="74" r="10" />
          <circle className="jewelry-art__gem" cx="133" cy="55" r="8" />
          <circle className="jewelry-art__gem" cx="162" cy="52" r="6" />
        </>
      )}
      {type === "statement" && (
        <>
          <path d="m150 52 49 60-49 98-49-98 49-60Z" />
          <path d="m150 52-18 60 18 98 18-98-18-60Zm-49 60h98" />
          <circle className="jewelry-art__gem" cx="150" cy="52" r="8" />
        </>
      )}
    </svg>
  );
}

export default function Home() {
  const [style, setStyle] = useState("Minimal");
  const [metal, setMetal] = useState("Titanium");

  return (
    <>
      <main>
        <section className="hero" id="home">
          <div className="hero__texture" />
          <Sigil className="hero__sigil hero__sigil--left" />
          <Sigil className="hero__sigil hero__sigil--right" />

          <div className="hero__content">
            <p className="eyebrow"><span /> Independent Piercing · Angeles City</p>
            <h1>
              Pierce
              <em>the</em>
              Veil
            </h1>
            <p className="hero__lede">
              "ako lang ba pinaka niche at esoteric na piercer sa angeles city??"
            </p>
            <div className="hero__actions">
              <a className="button button--light" href="#collection">
                Explore the collection <Icon type="arrow" />
              </a>
              <a className="text-link" href="#recommendation">Meet your AI stylist</a>
            </div>
          </div>

          <div className="hero__art" aria-label="Pierce the Veil brand illustration">
            <div className="hero__orbit hero__orbit--one" />
            <div className="hero__orbit hero__orbit--two" />
            <div className="hero__logo-wrap">
              <img src={logo} alt="Pierce the Veil illustrated logo" />
            </div>
            <span className="hero__note hero__note--top">Curated for you</span>
            <span className="hero__note hero__note--bottom">Est. in Angeles</span>
          </div>

          <a className="hero__scroll" href="#about" aria-label="Scroll to about Pierce the Veil">
            <span>Discover</span><i />
          </a>
        </section>

        <section className="experience section" id="about">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow eyebrow--dark"><span /> About Pierce the Veil</p>
              <h2>Small business,<br /><em>personal service.</em></h2>
            </div>
            <p>
              There is no permanent studio. Pierce the Veil serves select client
              addresses and joins occasional pop-ups around Angeles City.
            </p>
          </div>

          <div className="experience-grid">
            {experiences.map((item) => (
              <article className="experience-card" key={item.number}>
                <span className="experience-card__number">{item.number}</span>
                <span className="experience-card__icon"><Icon type={item.icon} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <a href={item.href}>
                  Learn more <Icon type="arrow" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <ServicesGuide />

        <section className="collection section" id="collection">
          <Sigil className="collection__sigil" />
          <div className="section-heading section-heading--center">
            <p className="eyebrow eyebrow--dark"><span /> Find your language</p>
            <h2>Jewelry with a <em>point of view.</em></h2>
            <p>Three directions, one collection shaped around self-expression.</p>
          </div>

          <div className="collection-grid">
            {collection.map((item, index) => (
              <article className="collection-card" key={item.title}>
                <div className="collection-card__visual">
                  <span>0{index + 1}</span>
                  <JewelryArt type={item.art} />
                </div>
                <div className="collection-card__copy">
                  <p>{item.label}</p>
                  <h3>{item.title}</h3>
                  <span>{item.note}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="collection__note">Collection imagery is an artistic preview; the live catalog reflects available shop inventory.</p>
          <p className="collection__cta"><Link className="button button--dark" to="/catalog">Browse the live catalog</Link></p>
        </section>

        <GallerySection />

        <CareGuide />

        <section className="recommendation section" id="recommendation">
          <div className="recommendation__copy">
            <p className="eyebrow"><span /> PierceWise · AI jewelry stylist</p>
            <h2>Your taste,<br /><em>translated.</em></h2>
            <p className="recommendation__lede">
              Tell us what feels like you. PierceWise is designed to use browser-side
              semantic similarity to rank available jewelry—not just filter a list.
            </p>
            <ol className="recommendation__steps">
              <li><span>01</span> Share your aesthetic, material, color, and budget.</li>
              <li><span>02</span> The on-device model compares meaning across the catalog.</li>
              <li><span>03</span> Explore three strong matches and why they fit.</li>
            </ol>
            <p className="privacy-note">Private by design · the model runs in your browser</p>
            <p><Link className="button button--light" to="/recommend">Try the AI stylist</Link></p>
          </div>

          <div className="stylist-card">
            <div className="stylist-card__header">
              <div>
                <span>Preference preview</span>
                <strong>Shape your profile</strong>
              </div>
              <span className="status-dot">UI demo</span>
            </div>

            <fieldset>
              <legend>What is your style?</legend>
              <div className="chip-row">
                {["Minimal", "Romantic", "Bold"].map((item) => (
                  <button
                    type="button"
                    className={style === item ? "active" : ""}
                    onClick={() => setStyle(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Choose a material</legend>
              <div className="chip-row">
                {["Titanium", "Gold tone", "Steel"].map((item) => (
                  <button
                    type="button"
                    className={metal === item ? "active" : ""}
                    onClick={() => setMetal(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="profile-preview">
              <div className="profile-preview__sigil"><Icon type="spark" /></div>
              <div>
                <span>Your starting profile</span>
                <strong>{style} · {metal}</strong>
                <p>The final tool will add color, budget, placement, and model-ranked matches.</p>
              </div>
            </div>

            <p className="stylist-card__disclaimer">
              This is a preview. The live AI stylist, with real catalog matches, is on its own page.
            </p>
          </div>
        </section>

        <section className="closing section">
          <div className="closing__line" />
          <Sigil className="closing__sigil" />
          <p className="eyebrow eyebrow--dark"><span /> Your next chapter</p>
          <h2>Wear what moves you.</h2>
          <p>Explore the concept today. The full catalog and appointment experience are next.</p>
          <a className="button button--dark" href="#collection">Begin with the collection <Icon type="arrow" /></a>
        </section>

        <InstagramSection />
      </main>
    </>
  );
}
