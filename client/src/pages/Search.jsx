import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts, fetchSearchCategories } from "../api/search";
import { useCurrency } from "../context/CurrencyContext";
import { usePageTitle } from "../hooks/usePageTitle";
import ProductImage from "../components/ProductImage";

const PAGE_SIZE = 12;

const SORT_OPTIONS = {
  relevance: "Bäst träff",
  price_asc: "Pris (lägst först)",
  price_desc: "Pris (högst först)",
};

export default function Search() {
  usePageTitle("Sök");
  const { formatPrice } = useCurrency();
  const [params, setParams] = useSearchParams();

  // Allt sökläge ligger i adressen, så att länkar och bakåtknappen fungerar
  const urlQuery = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const category = params.get("category") || "";
  const inStock = params.get("inStock") === "true";
  const sortParam = params.get("sort") || "relevance";
  const sort = sortParam in SORT_OPTIONS ? sortParam : "relevance";

  const [text, setText] = useState(urlQuery);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultsRef = useRef(null);

  // Ändrar en eller flera delar av sökläget. Allt som ändras utom sidnumret återgår till sida 1.
  function updateParams(changes, { replace = false } = {}) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value === null || value === false) next.delete(key);
      else next.set(key, String(value));
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace });
  }

  // Kategorierna till filtret hämtas en gång
  useEffect(() => {
    const controller = new AbortController();
    fetchSearchCategories(controller.signal)
      .then(setCategories)
      .catch(() => {
        // Filtret är en bonus. Misslyckas det går sökningen ändå att använda.
      });
    return () => controller.abort();
  }, []);

  // Vänta 350 ms efter sista tangenttryckningen innan sökningen uppdateras
  useEffect(() => {
    if (text === urlQuery) return;
    const t = setTimeout(
      () => updateParams({ q: text }, { replace: true }),
      350,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, urlQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    searchProducts({
      q: urlQuery,
      page,
      pageSize: PAGE_SIZE,
      category,
      inStock,
      sort,
      signal: controller.signal,
    })
      .then(setResult)
      .catch((err) => {
        if (err.name === "AbortError") return;
        setResult(null);
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [urlQuery, page, category, inStock, sort]);

  function goToPage(next) {
    updateParams({ page: next });
    // flytta fokus till resultaten så tangentbords- och skärmläsaranvändare hamnar rätt
    setTimeout(() => resultsRef.current?.focus(), 0);
  }

  function clearFilters() {
    setText("");
    setParams({});
  }

  const meta = result?.meta;
  const hasFilters = Boolean(
    urlQuery || category || inStock || sort !== "relevance",
  );

  return (
    <div className="search-page">
      <h1>Sök</h1>

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="search-form"
      >
        <label htmlFor="search-input">Sök bland produkterna</label>
        <input
          id="search-input"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
          autoComplete="off"
        />

        <div className="search-filters">
          {categories.length > 0 && (
            <label>
              Kategori
              <select
                value={category}
                onChange={(e) => updateParams({ category: e.target.value })}
              >
                <option value="">Alla kategorier</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Sortera
            <select
              value={sort}
              onChange={(e) =>
                updateParams({
                  sort: e.target.value === "relevance" ? "" : e.target.value,
                })
              }
            >
              {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="search-checkbox">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => updateParams({ inStock: e.target.checked })}
            />
            Bara varor i lager
          </label>

          {hasFilters && (
            <button type="button" onClick={clearFilters}>
              Rensa sökning och filter
            </button>
          )}
        </div>
      </form>

      <div ref={resultsRef} tabIndex={-1} className="search-results">
        <p role="status" className="search-status">
          {loading
            ? "Söker…"
            : error
              ? ""
              : meta
                ? meta.total === 0
                  ? "Inga träffar."
                  : `${meta.total} ${meta.total === 1 ? "träff" : "träffar"}, sida ${meta.page} av ${meta.totalPages}`
                : ""}
        </p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {result && result.data.length > 0 && (
          <ul className="search-list">
            {result.data.map((p) => (
              <li key={p.id} className="search-item">
                <ProductImage
                  src={p.image_url}
                  alt=""
                  size="small"
                  loading="lazy"
                />
                <div>
                  <h2>
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </h2>
                  {p.category && (
                    <p className="search-meta">
                      {p.category}
                      {p.color ? ` · ${p.color}` : ""}
                    </p>
                  )}
                  <p>
                    {formatPrice(p.price)}
                    {p.inStock ? "" : " · Slut i lager"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <nav aria-label="Sidor i sökresultatet" className="search-pagination">
          <button
            type="button"
            aria-disabled={meta.page <= 1}
            onClick={() => meta.page > 1 && goToPage(meta.page - 1)}
          >
            Föregående
          </button>
          <span aria-current="page">
            Sida {meta.page} av {meta.totalPages}
          </span>
          <button
            type="button"
            aria-disabled={meta.page >= meta.totalPages}
            onClick={() =>
              meta.page < meta.totalPages && goToPage(meta.page + 1)
            }
          >
            Nästa
          </button>
        </nav>
      )}
    </div>
  );
}
