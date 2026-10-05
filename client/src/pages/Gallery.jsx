import { useEffect, useState } from 'react';
import { fetchGallery } from '../api/gallery';

const CONTACT_EMAIL = 'juliaelindstrom@outlook.com';

export default function Gallery() {
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
        Ett urval av logotyper jag designat på beställning. Dessa är inte till försäljning som de
        är, men jag tar gärna emot nya uppdrag.
      </p>

      {loading && <p>Laddar...</p>}
      {error && <p>Kunde inte hämta galleriet: {error}</p>}

      {!loading && items.length === 0 && <p>Inga exempel uppladdade än.</p>}

      <div className="gallery-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="gallery-item"
            onClick={() => setActiveItem(item)}
          >
            <img src={item.image_url} alt={item.title} />
            <h3>{item.title}</h3>
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
        <div className="lightbox-overlay" onClick={() => setActiveItem(null)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setActiveItem(null)}
            aria-label="Stäng"
          >
            ×
          </button>
          <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={activeItem.image_url} alt={activeItem.title} className="lightbox-image" />
            <div className="gallery-lightbox-info">
              <h3>{activeItem.title}</h3>
              {activeItem.description && <p>{activeItem.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}