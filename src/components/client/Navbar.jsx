import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/PTV-logo.webp";

const links = [
  { label: "Home", href: "/#home" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#price-guide" },
  { label: "Gallery", href: "/#gallery" },
  { label: "Aftercare", href: "/#care-guide" },
  { label: "AI Stylist", to: "/recommend" },
  { label: "My booking", to: "/booking" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onResize = () => {
      if (window.innerWidth > 820) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <Link className="brand" to="/" aria-label="piercetheveil.ac home">
        <span className="brand__mark">
          <img src={logo} alt="" />
        </span>
        <span className="brand__name">
          piercetheveil.ac
          <small>Angeles City</small>
        </span>
      </Link>

      <button
        className={`menu-toggle ${open ? "menu-toggle--open" : ""}`}
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-controls="primary-navigation"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
      </button>

      <nav
        className={`main-nav ${open ? "main-nav--open" : ""}`}
        id="primary-navigation"
        aria-label="Primary navigation"
      >
        {links.map((link) =>
          link.to ? (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ) : (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ),
        )}
        <Link className="nav-cta" to="/availability" onClick={() => setOpen(false)}>
          Check availability
        </Link>
      </nav>
    </header>
  );
}
