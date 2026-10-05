import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel";

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>The Rooted Pages</h1>
        <p>
          Handtecknade posters, tapeter och tyger - allt designat av
          hobbyillustratör Julia Lindström. Ofta med djur och natur i
          huvudrollen, illustrerade ett mönster i taget.
        </p>
        <p>
          Jag tar även emot beställningar, till exempel logotyper till dig eller
          ditt företag. Kika in i <Link to="/gallery">galleriet</Link> för
          exempel och hör av dig!
        </p>
        <HeroCarousel />
        <Link to="/products" className="cta-button">
          Se produkter
        </Link>
      </section>
    </div>
  );
}
