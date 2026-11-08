const instagramUrl = "https://www.instagram.com/piercetheveil.ac/";

const instagramPosts = [
  {
    src: "/gallery/price-list-ear-piercings.webp",
    alt: "piercetheveil.ac ear piercing price guide",
    title: "Ear piercings",
  },
  {
    src: "/gallery/price-list-oral-facial-body.webp",
    alt: "piercetheveil.ac oral, facial, and body piercing price guide",
    title: "More placements",
  },
  {
    src: "/gallery/dos-donts.webp",
    alt: "piercetheveil.ac appointment do's and don'ts",
    title: "Before your visit",
  },
  {
    src: "/gallery/aftercare.webp",
    alt: "piercetheveil.ac piercing aftercare guide",
    title: "Aftercare",
  },
  {
    src: "/gallery/healing-process.webp",
    alt: "piercetheveil.ac piercing healing timeline",
    title: "Healing process",
  },
  {
    src: "/gallery/reminders.webp",
    alt: "piercetheveil.ac piercing reminders",
    title: "Reminders",
  },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle className="instagram-icon__dot" cx="17.4" cy="6.7" r="1" />
    </svg>
  );
}

export default function InstagramSection() {
  return (
    <section className="instagram-feed" id="instagram" aria-labelledby="instagram-heading">
      <div className="instagram-feed__heading">
        <div>
          <p className="eyebrow"><span /> Updates & pop-up announcements</p>
          <h2 id="instagram-heading">
            Follow the niche <em>on Instagram.</em>
          </h2>
        </div>

        <a
          className="instagram-feed__profile"
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open piercetheveil.ac on Instagram"
        >
          <span className="instagram-feed__avatar"><InstagramIcon /></span>
          <span>
            <strong>@piercetheveil.ac</strong>
            <small>Open the full profile ↗</small>
          </span>
        </a>
      </div>

      <div className="instagram-feed__grid" aria-label="Featured piercetheveil.ac posts">
        {instagramPosts.map((post, index) => (
          <a
            className="instagram-tile"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${post.title} — open @piercetheveil.ac on Instagram`}
            key={post.src}
          >
            <img src={post.src} alt={post.alt} loading="lazy" />
            <span className="instagram-tile__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="instagram-tile__overlay">
              <InstagramIcon />
              <strong>{post.title}</strong>
              <small>View @piercetheveil.ac ↗</small>
            </span>
          </a>
        ))}
      </div>

      <a
        className="button button--light instagram-feed__mobile-cta"
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open @piercetheveil.ac ↗
      </a>
    </section>
  );
}
