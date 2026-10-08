import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useProducts from '../hooks/useProducts';
import { usePageTitle } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard';
import { parseThemes } from '../utils/theme';
import { buildGroups } from '../utils/variants';

const TYPES = ['Posters', 'Tyg', 'Tapet'];

const SORT_OPTIONS = {
  'name-asc': { label: 'Namn (A–Ö)', compare: (a, b) => a.name.localeCompare(b.name, 'sv') },
  'name-desc': { label: 'Namn (Ö–A)', compare: (a, b) => b.name.localeCompare(a.name, 'sv') },
  'price-asc': { label: 'Pris (lägst först)', compare: (a, b) => a.minPrice - b.minPrice },
  'price-desc': { label: 'Pris (högst först)', compare: (a, b) => b.minPrice - a.minPrice },
  newest: { label: 'Nyast', compare: (a, b) => b.createdAt - a.createdAt },
};

export default function ProductList() {
  usePageTitle('Produkter');

  const { products, loading, error } = useProducts();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeType, setActiveType] = useState('Alla');
  const [activeTheme, setActiveTheme] = useState('Alla');
  const [sortKey, setSortKey] = useState('name-asc');
  const [view, setView] = useState('grid');

  const themes = useMemo(() => {
    const unique = new Set(products.flatMap((p) => parseThemes(p.theme)));
    return ['Alla', ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'sv'))];
  }, [products]);

  const filtered = products.filter((p) => {
    const query = search.trim().toLowerCase();
    const searchMatch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.color && p.color.toLowerCase().includes(query)) ||
      (p.collections?.name && p.collections.name.toLowerCase().includes(query)) ||
      parseThemes(p.theme).some((t) => t.toLowerCase().includes(query));

    const typeMatch = activeType === 'Alla' || p.category === activeType;
    const themeMatch = activeTheme === 'Alla' || parseThemes(p.theme).includes(activeTheme);

    return searchMatch && typeMatch && themeMatch;
  });

  const sorted = buildGroups(filtered).sort(SORT_OPTIONS[sortKey].compare);

  if (loading) return <p role="status">Laddar produkter...</p>;
  if (error) return <p role="alert">Kunde inte hämta produkter: {error}</p>;
  if (products.length === 0) return <p>Inga produkter tillgängliga än.</p>;

  return (
    <div className="product-list">
      <h1>Produkter</h1>

      <div role="search">
        <label htmlFor="product-search" className="sr-only">
          Sök bland produkter
        </label>
        <input
          id="product-search"
          type="search"
          className="product-search"
          placeholder="Sök bland produkter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <div className="filter-group" role="group" aria-label="Filtrera på typ">
          <button
            type="button"
            className={activeType === 'Alla' ? 'active' : ''}
            aria-pressed={activeType === 'Alla'}
            onClick={() => setActiveType('Alla')}
          >
            Alla
          </button>
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={activeType === type ? 'active' : ''}
              aria-pressed={activeType === type}
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
              <select value={activeTheme} onChange={(e) => setActiveTheme(e.target.value)}>
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
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="view-toggle" role="group" aria-label="Visningsläge">
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
              aria-label="Visa som rutor"
              title="Rutor"
            >
              <span aria-hidden="true">▦</span>
            </button>
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              aria-label="Visa som lista"
              title="Lista"
            >
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
      </div>

      <p className="sr-only" role="status">
        {sorted.length} {sorted.length === 1 ? 'produkt' : 'produkter'} visas
      </p>

      {sorted.length === 0 ? (
        <p>Inga produkter matchar din sökning/filter.</p>
      ) : (
        <>
          <h2 className="sr-only">Produktlista</h2>
          <div className={`product-grid view-${view}`}>
            {sorted.map((group) => (
              <ProductCard key={group.key} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}