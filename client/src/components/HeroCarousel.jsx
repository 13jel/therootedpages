import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";

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

  const slides = useMemo(() => {
    const withImages = products.filter((p) => p.image_url);
    return shuffle(withImages).slice(0, MAX_SLIDES);
  }, [products]);

  if (loading || slides.length === 0) return null;

  // Loopens hastighet skalas efter antal bilder, så det känns lika lugnt oavsett hur många produkter som finns
  const duration = Math.max(slides.length * 3, 20);

  // Listan dubbleras så att loopen blir sömlös (när första kopian glidit ut har andra redan tagit vid)
  const track = [...slides, ...slides];

  return (
    <div className="hero-marquee">
      <div
        className="hero-marquee-track"
        style={{
          "--marquee-duration": `${duration}s`,
          "--marquee-count": slides.length,
        }}
      >
        {track.map((product, i) => (
          <Link
            to={`/products/${product.id}`}
            className="hero-marquee-slide"
            key={`${product.id}-${i}`}
          >
            <img src={product.image_url} alt={product.name} />
          </Link>
        ))}
      </div>
    </div>
  );
}
