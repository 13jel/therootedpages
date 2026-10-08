import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { sortTypes, variantLabel } from '../utils/variants';

export default function ProductCard({ group }) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const [status, setStatus] = useState('idle');

  const { rep: product, variants, isGroup } = group;
  const detailPath = `/products/${product.id}`;

  let metaLine = '';
  if (isGroup) {
    const types = sortTypes([...new Set(variants.map((v) => v.category).filter(Boolean))]);
    const colorCount = new Set(variants.map((v) => v.color).filter(Boolean)).size;
    metaLine =
      [types.join(' / '), colorCount > 1 ? `${colorCount} färger` : null]
        .filter(Boolean)
        .join(' · ') || `${variants.length} varianter`;
  } else if (product.collection_id) {
    metaLine = variantLabel(product);
  }

  let stockText;
  if (isGroup) {
    stockText = group.inStock ? '' : 'Slut i lager';
  } else {
    stockText = product.stock > 0 ? `${product.stock} i lager` : 'Slut i lager';
  }

  const priceText =
    isGroup && group.minPrice !== group.maxPrice
      ? `Från ${formatPrice(group.minPrice)}`
      : formatPrice(group.minPrice);

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

  return (
    <article className="product-card">
      {product.image_url && <img src={product.image_url} alt="" loading="lazy" />}

      <div className="product-card-body">
        <h3>
          <Link to={detailPath}>{group.name}</Link>
        </h3>
        {metaLine && <p className="variant-meta">{metaLine}</p>}
        <p className="price">{priceText}</p>
        {stockText && <p className="stock">{stockText}</p>}

        {isGroup ? (
          <button type="button" tabIndex={-1} aria-hidden="true">
            Välj typ och färg
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || status === 'loading'}
          >
            {status === 'loading' && 'Lägger till...'}
            {status === 'done' && 'Tillagd!'}
            {status === 'idle' && 'Lägg i varukorg'}
            {status === 'error' && 'Något gick fel'}
            <span className="sr-only"> {product.name}</span>
          </button>
        )}

        <p className="sr-only" role="status">
          {status === 'done' ? `${product.name} lades i varukorgen` : ''}
        </p>
      </div>
    </article>
  );
}