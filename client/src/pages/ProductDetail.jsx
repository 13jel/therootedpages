import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useProduct } from '../hooks/useProduct';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../api/supabaseClient';
import { parseThemes } from '../utils/theme';
import { findVariant, sortTypes, variantLabel } from '../utils/variants';
import Lightbox from '../components/Lightbox';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(id);
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const [status, setStatus] = useState('idle');
  const [activeImage, setActiveImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [variantState, setVariantState] = useState({ collectionId: null, items: [] });

  const collectionId = product?.collection_id ?? null;

  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    supabase
      .from('products')
      .select('id, name, image_url, category, color, price, stock')
      .eq('collection_id', collectionId)
      .eq('is_active', true)
      .order('id', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setVariantState({ collectionId, items: data || [] });
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  const variants =
    collectionId && variantState.collectionId === collectionId ? variantState.items : [];
  const isGroup = variants.length > 1;
  const title = product
    ? isGroup
      ? product.collections?.name || product.name
      : product.name
    : '';

  usePageTitle(title);

  async function handleAddToCart() {
    setStatus('loading');
    try {
      await addItem(product, 1);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
    }
  }

  if (loading && !product) return <p role="status">Laddar produkt...</p>;
  if (error || !product) return <p role="alert">Produkten kunde inte hittas.</p>;

  const gallery = [
    product.image_url,
    ...(product.product_images?.map((i) => i.image_url) || []),
  ].filter(Boolean);
  const mainImage = activeImage && gallery.includes(activeImage) ? activeImage : gallery[0];

  const types = sortTypes([...new Set(variants.map((v) => v.category).filter(Boolean))]);
  const colorOptions = variants.filter((v) => v.category === product.category);
  const selected = variantLabel(product);
  const stockText = product.stock > 0 ? `${product.stock} i lager` : 'Slut i lager';

  function goToVariant(variant) {
    if (variant && variant.id !== product.id) {
      navigate(`/products/${variant.id}`, { replace: true });
    }
  }

  return (
    <div className="product-detail">
      <Link to="/products" className="back-link">
        <span aria-hidden="true">←</span> Tillbaka till produkter
      </Link>

      {mainImage && (
        <button
          type="button"
          className="product-detail-main-image-wrap"
          aria-haspopup="dialog"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={mainImage}
            alt={selected ? `${title}, ${selected}` : title}
            className="product-detail-main-image"
          />
          <span className="zoom-hint">Klicka för att förstora</span>
        </button>
      )}

      {gallery.length > 1 && (
        <div className="product-detail-thumbs" role="group" aria-label="Produktbilder">
          {gallery.map((url, i) => (
            <button
              key={url}
              type="button"
              className={url === mainImage ? 'active' : ''}
              aria-label={`Visa bild ${i + 1} av ${gallery.length}`}
              aria-pressed={url === mainImage}
              onClick={() => setActiveImage(url)}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}

      <div className="product-detail-info">
        <h1>{title}</h1>

        {isGroup && selected && <p className="variant-meta">Vald variant: {selected}</p>}

        {!isGroup && product.category && <p className="category-tag">{product.category}</p>}

        {parseThemes(product.theme).length > 0 && (
          <div className="theme-tags">
            {parseThemes(product.theme).map((theme) => (
              <span key={theme} className="theme-tag">{theme}</span>
            ))}
          </div>
        )}

        {isGroup && (
          <div className="variant-picker">
            {types.length > 1 && (
              <div className="variant-group" role="group" aria-labelledby="variant-type-label">
                <span id="variant-type-label" className="variant-label">Typ</span>
                <div className="variant-options">
                  {types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={type === product.category ? 'active' : ''}
                      aria-pressed={type === product.category}
                      onClick={() => goToVariant(findVariant(variants, type, product.color))}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorOptions.length > 1 && (
              <div className="variant-group" role="group" aria-labelledby="variant-color-label">
                <span id="variant-color-label" className="variant-label">
                  Färg{product.color ? `: ${product.color}` : ''}
                </span>
                <div className="variant-options">
                  {colorOptions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`variant-swatch${v.id === product.id ? ' active' : ''}`}
                      aria-pressed={v.id === product.id}
                      onClick={() => goToVariant(v)}
                    >
                      {v.image_url && <img src={v.image_url} alt="" />}
                      <span>{v.color || 'Standard'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="sr-only" role="status">
          {isGroup
            ? `Vald variant: ${selected || product.name}. ${formatPrice(product.price)}. ${stockText}.`
            : ''}
        </p>

        {product.description && <p className="description">{product.description}</p>}

        <p className="price">{formatPrice(product.price)}</p>
        <p className="stock">{stockText}</p>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock === 0 || status === 'loading' || loading}
        >
          {status === 'loading' && 'Lägger till...'}
          {status === 'done' && 'Tillagd!'}
          {status === 'idle' && 'Lägg i varukorg'}
          {status === 'error' && 'Något gick fel'}
        </button>

        <p className="sr-only" role="status">
          {status === 'done' && `${product.name} lades i varukorgen`}
          {status === 'error' && 'Något gick fel när varan skulle läggas i varukorgen'}
        </p>
      </div>

      {lightboxOpen && (
        <Lightbox
          src={mainImage}
          alt={selected ? `${title}, ${selected}` : title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}