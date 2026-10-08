import { useEffect, useState } from "react";
import { fetchGallery } from "../api/gallery";
import { usePageTitle } from "../hooks/usePageTitle";
import Lightbox from "../components/Lightbox";

const CONTACT_EMAIL = "juliaelindstrom@outlook.com";

export default function Gallery() {
  usePageTitle("Galleri");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    fetchGallery()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="gallery-page">
      <h1>Logotypgalleri</h1>
      <p className="gallery-intro">
        Ett urval av logotyper jag designat på beställning. Dessa är inte till
        försäljning som de är, men jag tar gärna emot nya uppdrag.
      </p>

      {loading && <p role="status">Laddar...</p>}
      {error && <p role="alert">Kunde inte hämta galleriet: {error}</p>}

      {!loading && !error && items.length === 0 && (
        <p>Inga exempel uppladdade än.</p>
      )}

      <div className="gallery-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="gallery-item"
            aria-haspopup="dialog"
            onClick={() => setActiveItem(item)}
          >
            <img src={item.image_url} alt="" loading="lazy" />
            <span className="gallery-item-title">{item.title}</span>
          </button>
        ))}
      </div>

      <section className="gallery-cta">
        <h2>Vill du beställa en logotyp till dig eller ditt företag?</h2>
        <p>Hör av dig, så pratar vi vidare om stil, tidsram och pris.</p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Logotypbeställning`}
          className="cta-button"
        >
          Mejla mig
        </a>
      </section>

      {activeItem && (
        <Lightbox
          src={activeItem.image_url}
          alt=""
          title={activeItem.title}
          description={activeItem.description}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
