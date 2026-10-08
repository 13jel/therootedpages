import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useProducts from "../hooks/useProducts";
import { buildGroups } from "../utils/variants";

const MAX_SLIDES = 12;

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function HeroCarousel() {
  const { products, loading } = useProducts();
  const [paused, setPaused] = useState(false);

  const slides = useMemo(() => {
    const withImages = products.filter((p) => p.image_url);
    return shuffle(buildGroups(withImages)).slice(0, MAX_SLIDES);
  }, [products]);

  if (loading || slides.length === 0) return null;

  // Loopens hastighet skalas efter antal bilder, så det känns lika lugnt oavsett hur många produkter som finns
  const duration = Math.max(slides.length * 3, 20);

  return (
    <section className="hero-marquee" aria-label="Utvalda produkter">
      <button
        type="button"
        className="hero-marquee-toggle"
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? "Starta rörelse" : "Pausa rörelse"}
      </button>

      <div
        className={`hero-marquee-track${paused ? " is-paused" : ""}`}
        style={{
          "--marquee-duration": `${duration}s`,
          "--marquee-count": slides.length,
        }}
      >
        {/* Listan dubbleras för en sömlös loop; kopia 2 är dold för hjälpmedel */}
        {[0, 1].map((copy) =>
          slides.map((group) => (
            <Link
              to={`/products/${group.rep.id}`}
              className="hero-marquee-slide"
              key={`${copy}-${group.key}`}
              aria-hidden={copy === 1 ? "true" : undefined}
              tabIndex={copy === 1 ? -1 : undefined}
            >
              <img
                src={group.rep.image_url}
                alt={copy === 0 ? group.name : ""}
              />
            </Link>
          )),
        )}
      </div>
    </section>
  );
}
