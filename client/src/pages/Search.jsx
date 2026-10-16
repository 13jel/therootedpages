import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts } from "../api/search";
import { useCurrency } from "../context/CurrencyContext";
import { usePageTitle } from "../hooks/usePageTitle";

const PAGE_SIZE = 12;

export default function Search() {
  usePageTitle("Sök");
  const { formatPrice } = useCurrency();
  const [params, setParams] = useSearchParams();

  const urlQuery = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [text, setText] = useState(urlQuery);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultsRef = useRef(null);

  // Vänta 350 ms efter sista tangenttryckningen innan URL:en (och sökningen) uppdateras
  useEffect(() => {
    if (text === urlQuery) return;
    const t = setTimeout(() => {
      setParams(text ? { q: text } : {}, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [text, urlQuery, setParams]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    searchProducts({
      q: urlQuery,
      page,
      pageSize: PAGE_SIZE,
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
  }, [urlQuery, page]);

  function goToPage(next) {
    const p = new URLSearchParams(params);
    p.set("page", String(next));
    setParams(p);
    // flytta fokus till resultaten så tangentbords- och skärmläsaranvändare hamnar rätt
    setTimeout(() => resultsRef.current?.focus(), 0);
  }

  const meta = result?.meta;

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
                {p.image_url && <img src={p.image_url} alt="" />}
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
