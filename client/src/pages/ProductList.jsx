import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import ProductCard from "../components/ProductCard";
import { parseThemes } from "../utils/theme";

const TYPES = ["Posters", "Tyg", "Tapet"];

const SORT_OPTIONS = {
  "name-asc": {
    label: "Namn (A–Ö)",
    compare: (a, b) => a.name.localeCompare(b.name, "sv"),
  },
  "name-desc": {
    label: "Namn (Ö–A)",
    compare: (a, b) => b.name.localeCompare(a.name, "sv"),
  },
  "price-asc": {
    label: "Pris (lägst först)",
    compare: (a, b) => a.price - b.price,
  },
  "price-desc": {
    label: "Pris (högst först)",
    compare: (a, b) => b.price - a.price,
  },
  newest: {
    label: "Nyast",
    compare: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  },
};

export default function ProductList() {
  const { products, loading, error } = useProducts();
  const [activeType, setActiveType] = useState("Alla");
  const [activeTheme, setActiveTheme] = useState("Alla");
  const [sortKey, setSortKey] = useState("name-asc");
  const [view, setView] = useState("grid");
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const themes = useMemo(() => {
    const unique = new Set(products.flatMap((p) => parseThemes(p.theme)));
    return [
      "Alla",
      ...Array.from(unique).sort((a, b) => a.localeCompare(b, "sv")),
    ];
  }, [products]);

  const filtered = products.filter((p) => {
    const query = search.trim().toLowerCase();
    const searchMatch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      parseThemes(p.theme).some((t) => t.toLowerCase().includes(query));

    const typeMatch = activeType === "Alla" || p.category === activeType;
    const themeMatch =
      activeTheme === "Alla" || parseThemes(p.theme).includes(activeTheme);

    return searchMatch && typeMatch && themeMatch;
  });

  const sorted = [...filtered].sort(SORT_OPTIONS[sortKey].compare);

  if (loading) return <p>Laddar produkter...</p>;
  if (error) return <p>Kunde inte hämta produkter: {error}</p>;
  if (products.length === 0) return <p>Inga produkter tillgängliga än.</p>;

  return (
    <div className="product-list">
      <h1>Produkter</h1>

      <input
        type="search"
        className="product-search"
        placeholder="Sök bland produkter..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="filter-bar">
        <div className="filter-group">
          <button
            className={activeType === "Alla" ? "active" : ""}
            onClick={() => setActiveType("Alla")}
          >
            Alla
          </button>
          {TYPES.map((type) => (
            <button
              key={type}
              className={activeType === type ? "active" : ""}
              onClick={() => setActiveType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="filter-bar-right">
          {themes.length > 1 && (
            <label className="theme-select">
              Tema
              <select
                value={activeTheme}
                onChange={(e) => setActiveTheme(e.target.value)}
              >
                {themes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="theme-select">
            Sortera
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="view-toggle">
            <button
              type="button"
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="Visa som rutor"
              title="Rutor"
            >
              ▦
            </button>
            <button
              type="button"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="Visa som lista"
              title="Lista"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p>Inga produkter matchar din sökning/filter.</p>
      ) : (
        <div className={`product-grid view-${view}`}>
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
