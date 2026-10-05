import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const [status, setStatus] = useState("idle");

  async function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();

    setStatus("loading");
    try {
      await addItem(product, 1);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Link to={`/products/${product.id}`} className="product-card">
      {product.image_url && <img src={product.image_url} alt={product.name} />}

      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="price">{formatPrice(product.price)}</p>
        <p className="stock">
          {product.stock > 0 ? `${product.stock} i lager` : "Slut i lager"}
        </p>

        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || status === "loading"}
        >
          {status === "loading" && "Lägger till..."}
          {status === "done" && "Tillagd!"}
          {status === "idle" && "Lägg i varukorg"}
          {status === "error" && "Något gick fel"}
        </button>
      </div>
    </Link>
  );
}
