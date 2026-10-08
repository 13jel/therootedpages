import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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

  const cartSummary = itemCount === 1 ? "1 vara" : `${itemCount} varor`;

  return (
    <nav className="navbar" aria-label="Huvudmeny">
      <Link
        to="/"
        className="navbar-brand"
        aria-label="TRP, The Rooted Pages startsida"
      >
        TRP
      </Link>

      <form
        onSubmit={handleQuickSearch}
        className="navbar-search"
        role="search"
      >
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
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      <div className="navbar-links">
        <NavLink to="/products">Produkter</NavLink>
        <NavLink to="/gallery">Galleri</NavLink>

        <NavLink to="/cart">
          Varukorg
          {itemCount > 0 && (
            <>
              <span className="cart-count" aria-hidden="true">
                {itemCount}
              </span>
              <span className="sr-only"> ({cartSummary})</span>
            </>
          )}
        </NavLink>

        {session && <NavLink to="/account">Mina sidor</NavLink>}
        {isAdmin && <NavLink to="/admin/products">Admin</NavLink>}

        <CurrencySelect />

        {session ? (
          <button type="button" onClick={handleSignOut}>
            Logga ut
          </button>
        ) : (
          <NavLink to="/login">Logga in</NavLink>
        )}
      </div>
    </nav>
  );
}
