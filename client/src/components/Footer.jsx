import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p>
        The Rooted Pages © {year} All artwork by Julia Lindström. All rights
        reserved.
      </p>
      <p className="footer-disclaimer">
        Skolprojekt — <Link to="/about">läs mer</Link>
      </p>
    </footer>
  );
}
