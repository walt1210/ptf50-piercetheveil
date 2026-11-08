import logo from "../../assets/PTV-logo.webp";

export default function Footer() {
  return (
    <footer className="site-footer" id="visit">
      <div className="site-footer__brand">
        <img src={logo} alt="Pierce the Veil logo" />
        <div>
          <p>Pierce the Veil</p>
          <span>Independent piercer and curated jewelry</span>
        </div>
      </div>

      <div className="site-footer__location">
        <span className="footer-label">Serving</span>
        <strong>Angeles City, Pampanga</strong>
        <p>Client-address appointments and occasional pop-up booths. Locations are announced online.</p>
      </div>

      <div className="site-footer__end">
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to the top ↑</a>
        <small>© {new Date().getFullYear()} Pierce the Veil</small>
      </div>
    </footer>
  );
}
