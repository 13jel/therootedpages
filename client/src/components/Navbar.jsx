import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import CurrencySelect from "./CurrencySelect";

export default function Navbar() {
  const { session, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState("");

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  function handleQuickSearch(e) {
    e.preventDefault();
    const query = quickSearch.trim();
    navigate(
      query ? `/products?search=${encodeURIComponent(query)}` : "/products",
    );
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        TRP
      </Link>

      <form onSubmit={handleQuickSearch} className="navbar-search">
        <input
          type="search"
          placeholder="Sök..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          aria-label="Sök bland produkter"
        />
        <button type="submit" aria-label="Sök">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      <div className="navbar-links">
        <Link to="/products">Produkter</Link>
        <Link to="/gallery">Galleri</Link>

        <Link to="/cart">
          Varukorg
          {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
        </Link>

        {session && <Link to="/account">Mina sidor</Link>}
        {isAdmin && <Link to="/admin/products">Admin</Link>}

        <CurrencySelect />

        {session ? (
          <button onClick={handleSignOut}>Logga ut</button>
        ) : (
          <Link to="/login">Logga in</Link>
        )}
      </div>
    </nav>
  );
}
