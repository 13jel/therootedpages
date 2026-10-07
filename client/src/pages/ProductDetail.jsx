import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useProduct } from "../hooks/useProduct";
import { supabase } from "../api/supabaseClient";
import { parseThemes } from "../utils/theme";
import { findVariant, sortTypes, variantLabel } from "../utils/variants";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(id);
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const [status, setStatus] = useState("idle");
  const [activeImage, setActiveImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [variantState, setVariantState] = useState({
    collectionId: null,
    items: [],
  });

  const collectionId = product?.collection_id ?? null;

  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    supabase
      .from("products")
      .select("id, name, image_url, category, color, price, stock")
      .eq("collection_id", collectionId)
      .eq("is_active", true)
      .order("id", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setVariantState({ collectionId, items: data || [] });
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  const variants =
    collectionId && variantState.collectionId === collectionId
      ? variantState.items
      : [];

  async function handleAddToCart() {
    setStatus("loading");
    try {
      await addItem(product, 1);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  if (loading && !product) return <p>Laddar produkt...</p>;
  if (error || !product) return <p>Produkten kunde inte hittas.</p>;

  const gallery = [
    product.image_url,
    ...(product.product_images?.map((i) => i.image_url) || []),
  ].filter(Boolean);
  const mainImage =
    activeImage && gallery.includes(activeImage) ? activeImage : gallery[0];

  const isGroup = variants.length > 1;
  const types = sortTypes([
    ...new Set(variants.map((v) => v.category).filter(Boolean)),
  ]);
  const colorOptions = variants.filter((v) => v.category === product.category);
  const title = isGroup
    ? product.collections?.name || product.name
    : product.name;
  const selected = variantLabel(product);

  function goToVariant(variant) {
    if (variant && variant.id !== product.id) {
      navigate(`/products/${variant.id}`, { replace: true });
    }
  }

  return (
    <div className="product-detail">
      <Link to="/products" className="back-link">
        ← Tillbaka till produkter
      </Link>

      {mainImage && (
        <button
          type="button"
          className="product-detail-main-image-wrap"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={mainImage}
            alt={title}
            className="product-detail-main-image"
          />
          <span className="zoom-hint">Klicka för att förstora</span>
        </button>
      )}

      {gallery.length > 1 && (
        <div className="product-detail-thumbs">
          {gallery.map((url) => (
            <button
              key={url}
              type="button"
              className={url === mainImage ? "active" : ""}
              onClick={() => setActiveImage(url)}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}

      <div className="product-detail-info">
        <h1>{title}</h1>

        {isGroup && selected && (
          <p className="variant-meta">Vald variant: {selected}</p>
        )}

        {!isGroup && product.category && (
          <p className="category-tag">{product.category}</p>
        )}

        {parseThemes(product.theme).length > 0 && (
          <div className="theme-tags">
            {parseThemes(product.theme).map((theme) => (
              <span key={theme} className="theme-tag">
                {theme}
              </span>
            ))}
          </div>
        )}

        {isGroup && (
          <div className="variant-picker">
            {types.length > 1 && (
              <div className="variant-group">
                <span className="variant-label">Typ</span>
                <div className="variant-options">
                  {types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={type === product.category ? "active" : ""}
                      onClick={() =>
                        goToVariant(findVariant(variants, type, product.color))
                      }
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorOptions.length > 1 && (
              <div className="variant-group">
                <span className="variant-label">
                  Färg{product.color ? `: ${product.color}` : ""}
                </span>
                <div className="variant-options">
                  {colorOptions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`variant-swatch${v.id === product.id ? " active" : ""}`}
                      onClick={() => goToVariant(v)}
                      title={v.color || v.name}
                    >
                      {v.image_url && <img src={v.image_url} alt="" />}
                      <span>{v.color || "Standard"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {product.description && (
          <p className="description">{product.description}</p>
        )}

        <p className="price">{formatPrice(product.price)}</p>
        <p className="stock">
          {product.stock > 0 ? `${product.stock} i lager` : "Slut i lager"}
        </p>

        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || status === "loading" || loading}
        >
          {status === "loading" && "Lägger till..."}
          {status === "done" && "Tillagd!"}
          {status === "idle" && "Lägg i varukorg"}
          {status === "error" && "Något gick fel"}
        </button>
      </div>

      {lightboxOpen && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Stäng"
          >
            ×
          </button>
          <img src={mainImage} alt={title} className="lightbox-image" />
        </div>
      )}
    </div>
  );
}
