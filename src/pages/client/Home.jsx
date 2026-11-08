import { useState } from "react";
import CareGuide from "../../components/client/CareGuide";
import GallerySection from "../../components/client/GallerySection";
import InstagramSection from "../../components/client/InstagramSection";
import { Link } from "react-router-dom";
import ServicesGuide from "../../components/client/ServicesGuide";
import logo from "../../assets/PTV-logo.webp";
import jewelryOptions from "../../assets/images/jewelries-ptv.jpg";
import boothSetup from "../../assets/images/booth-setup.jpg";
import ptvPiercers from "../../assets/images/ptv-piercers.jpg";

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
            <h1>piercetheveil.ac</h1>
            <p className="hero__lede">
              "ako lang ba pinaka niche at esoteric na piercer sa angeles city??"
            </p>
            <div className="hero__actions">
              <a className="button button--light" href="#collection">
                View jewelry options <Icon type="arrow" />
              </a>
              <a className="text-link" href="#recommendation">Meet your AI stylist</a>
            </div>
          </div>

          <div className="hero__art" aria-label="piercetheveil.ac brand illustration">
            <div className="hero__orbit hero__orbit--one" />
            <div className="hero__orbit hero__orbit--two" />
            <div className="hero__logo-wrap">
              <img src={logo} alt="piercetheveil.ac illustrated logo" />
            </div>
            <span className="hero__note hero__note--top">Curated for you</span>
            <span className="hero__note hero__note--bottom">Est. in Angeles</span>
          </div>

          <a className="hero__scroll" href="#about" aria-label="Scroll to about piercetheveil.ac">
            <span>Discover</span><i />
          </a>
        </section>

        <section className="experience about-editorial section" id="about">
          <div className="about-editorial__intro">
            <div>
              <p className="eyebrow eyebrow--dark"><span /> About piercetheveil.ac</p>
              <h2>Small business,<br /><em>personal service.</em></h2>
            </div>

            <div className="about-editorial__story">
              <p className="about-editorial__lead">Independent piercing, made personal.</p>
              <div>
                <p>
                  piercetheveil.ac is a small independent piercing business serving
                  select client addresses around Angeles City. Every appointment is
                  planned with the client's anatomy, comfort, and individual style in mind.
                </p>
                <p>
                  There is no permanent studio. The setup and location are confirmed
                  before booking, while occasional booths bring the business to different
                  events and spaces around the city.
                </p>
              </div>
            </div>
          </div>

          <figure className="about-editorial__booth">
            <img src={boothSetup} alt="piercetheveil.ac pop-up booth setup with jewelry and hand-drawn piercing references" />
            <figcaption><span>01</span> The pop-up setup · Angeles City</figcaption>
          </figure>

          <div className="about-editorial__people">
            <figure>
              <img src={ptvPiercers} alt="The people behind piercetheveil.ac at their booth" />
            </figure>

            <div className="about-editorial__people-copy">
              <p className="eyebrow eyebrow--dark"><span /> Behind the booth</p>
              <h3>Hindi lang tenga ang<br /><em>binubutasan dito.</em></h3>
              <p>
                Pati katahimikan, kasi madaldal ang piercer mo.
              </p>
              <p>
                Independent piercer sa Angeles City na willing makinig sa buong lore mo habang pumipili tayo ng jewelry.
              </p>
              <p>
                Small piercing booth lang tayo rito sa Angeles City. By appointment, walang minamadali, at may kasamang chika kung bet mo.
              </p>
              <ul aria-label="piercetheveil.ac service format">
                <li>BY APPOINTMENT LANG, BEH</li>
                <li>POP-UP KAPAG SINIPAG ANG UNIVERSE</li>
                <li>ANGELES CITY REPRESENT!</li>
              </ul>
              <a className="text-link" href="#price-guide">PA-BUTAS KA NA</a>
            </div>
          </div>
        </section>

        <ServicesGuide />

        <section className="collection section" id="collection">
          <Sigil className="collection__sigil" />
          <div className="jewelry-options">
            <figure className="jewelry-options__visual">
              <img src={jewelryOptions} alt="Standard and premium piercing jewelry currently available from piercetheveil.ac" />
              <figcaption>Current selection · availability may vary</figcaption>
            </figure>

            <div className="jewelry-options__copy">
              <p className="eyebrow"><span /> A few clear choices</p>
              <h2>Choose your <em>finish.</em></h2>
              <p className="jewelry-options__intro">
                Let the piercer know which earring option you want to avail for when
                confirming your appointment.
              </p>

              <div className="jewelry-options__prices" aria-label="Jewelry pricing options">
                <article>
                  <span>01</span>
                  <div><h3>Standard silver</h3><p>Included in the piercing price</p></div>
                  <strong>Included</strong>
                </article>
                <article>
                  <span>02</span>
                  <div><h3>Standard gold</h3><p>A warm-toned standard option</p></div>
                  <strong>+₱50</strong>
                </article>
                <article>
                  <span>03</span>
                  <div><h3>Premium silver or gold</h3><p>For a more detailed jewelry option</p></div>
                  <strong>+₱100</strong>
                </article>
              </div>

              <p className="jewelry-options__note">
                Styles and quantities are limited. Confirm your preferred piece with
                the piercer before the appointment.
              </p>
              <Link className="button button--light" to="/availability">Ask about jewelry</Link>
            </div>
          </div>
        </section>

        <GallerySection />

        <CareGuide />

        <section className="recommendation section" id="recommendation">
          <div className="recommendation__copy">
            <p className="eyebrow"><span /> PierceWise · AI jewelry stylist</p>
            <h2>Your taste,<br /><em>translated.</em></h2>
            <p className="recommendation__lede">
              Tell us what feels like you. PierceWise is designed to use browser-side
              semantic similarity to rank the piercer's available jewelry options.
            </p>
            <ol className="recommendation__steps">
              <li><span>01</span> Share your aesthetic, material, color, and budget.</li>
              <li><span>02</span> The on-device model compares meaning across available pieces.</li>
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
              This is a preview. The live AI stylist uses jewelry options recorded by the piercer.
            </p>
          </div>
        </section>

        <section className="closing section">
          <div className="closing__line" />
          <Sigil className="closing__sigil" />
          <p className="eyebrow eyebrow--dark"><span /> Your next chapter</p>
          <h2>Wear what moves you.</h2>
          <p>Review the current jewelry options, then check availability for your preferred piercing.</p>
          <a className="button button--dark" href="#collection">See jewelry options <Icon type="arrow" /></a>
        </section>

        <InstagramSection />
      </main>
    </>
  );
}
