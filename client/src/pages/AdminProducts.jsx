import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  fetchAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/adminProducts";
import { fetchCollections } from "../api/collections";
import { TYPE_ORDER } from "../utils/variants";
import AdminNav from "../components/AdminNav";
import ProductForm from "../components/ProductForm";
import ProductGallery from "../components/ProductGallery";

const SORT_LABELS = {
  "name-asc": "Namn (A–Ö)",
  "name-desc": "Namn (Ö–A)",
  "price-asc": "Pris (lägst först)",
  "price-desc": "Pris (högst först)",
  "stock-asc": "Lagersaldo (lägst först)",
  "stock-desc": "Lagersaldo (högst först)",
  collection: "Kollektion",
  type: "Typ",
  newest: "Nyast först",
};

function sortProducts(list, key, collectionName) {
  const text = (a, b) => (a || "").localeCompare(b || "", "sv");
  const byName = (a, b) => text(a.name, b.name);
  const typeRank = (p) => {
    const i = TYPE_ORDER.indexOf(p.category);
    return i === -1 ? 99 : i;
  };
  const sorted = [...list];

  switch (key) {
    case "name-desc":
      return sorted.sort((a, b) => byName(b, a));
    case "price-asc":
      return sorted.sort(
        (a, b) => Number(a.price) - Number(b.price) || byName(a, b),
      );
    case "price-desc":
      return sorted.sort(
        (a, b) => Number(b.price) - Number(a.price) || byName(a, b),
      );
    case "stock-asc":
      return sorted.sort((a, b) => a.stock - b.stock || byName(a, b));
    case "stock-desc":
      return sorted.sort((a, b) => b.stock - a.stock || byName(a, b));
    case "collection":
      return sorted.sort((a, b) => {
        const ca = collectionName(a);
        const cb = collectionName(b);
        if (!ca !== !cb) return ca ? -1 : 1; // produkter utan kollektion hamnar sist
        return (
          text(ca, cb) ||
          typeRank(a) - typeRank(b) ||
          text(a.color, b.color) ||
          byName(a, b)
        );
      });
    case "type":
      return sorted.sort(
        (a, b) =>
          typeRank(a) - typeRank(b) || text(a.color, b.color) || byName(a, b),
      );
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    case "name-asc":
    default:
      return sorted.sort(byName);
  }
}

export default function AdminProducts() {
  usePageTitle("Admin – Produkter");

  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [justCreated, setJustCreated] = useState(null);
  const [sortKey, setSortKey] = useState("name-asc");
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const formHeadingRef = useRef(null);
  const createdRef = useRef(null);
  const listHeadingRef = useRef(null);
  const editButtons = useRef({});

  useEffect(() => {
    if (!token) return;

    fetchAllProductsAdmin(token)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => {});
  }, []);

  // Flyttar fokus till nästa logiska ställe när knappen man tryckte på har försvunnit
  useEffect(() => {
    if (!focusRequest) return;
    const { target, id } = focusRequest;
    const element = {
      created: createdRef.current,
      form: formHeadingRef.current,
      list: listHeadingRef.current,
      "edit-button": editButtons.current[id],
    }[target];
    element?.focus();
  }, [focusRequest]);

  function requestFocus(target, id) {
    setFocusRequest({ target, id });
  }

  const collectionNames = Object.fromEntries(
    collections.map((c) => [c.id, c.name]),
  );
  const collectionName = (p) => collectionNames[p.collection_id] || null;
  const sortedProducts = sortProducts(products, sortKey, collectionName);

  async function handleCreate(product) {
    const newProduct = await createProduct(token, product);
    setProducts((prev) => [...prev, newProduct]);
    setDuplicateSource(null);
    setJustCreated(newProduct);
    requestFocus("created");
  }

  async function handleUpdate(id, updates) {
    const updated = await updateProduct(token, id, updates);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    );
    setEditingId(null);
    setAnnouncement(`Ändringarna i ${updates.name} sparades`);
    requestFocus("edit-button", id);
  }

  function handleDuplicate(product) {
    setJustCreated(null);
    setDuplicateSource({
      name: `${product.name} (kopia)`,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      category: product.category,
      theme: product.theme,
      collection_id: product.collection_id,
      color: "",
    });
    requestFocus("form");
  }

  async function handleDelete(product) {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Ta bort "${product.name}"? Produkten döljs från butiken men gamla ordrar påverkas inte.`,
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    setError(null);
    try {
      await deleteProduct(token, product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setAnnouncement(`${product.name} togs bort`);
      requestFocus("list");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-products">
      <AdminNav />

      <h1>Admin – Produkter</h1>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      <section>
        {justCreated ? (
          <div className="created-confirmation">
            <div className="created-banner" ref={createdRef} tabIndex={-1}>
              <span className="created-check" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>{justCreated.name}</strong> sparad i butiken.
                <p>
                  Bilder du laddar upp här nedan sparas direkt till{" "}
                  <strong>{justCreated.name}</strong> — ingen extra sparaknapp
                  behövs. Lägg till så många du vill, eller gå vidare direkt.
                </p>
              </div>
            </div>

            <ProductGallery productId={justCreated.id} headingLevel={2} />

            <button
              type="button"
              className="finish-button"
              onClick={() => {
                setJustCreated(null);
                requestFocus("form");
              }}
            >
              Klar med {justCreated.name} – lägg till nästa produkt
            </button>
          </div>
        ) : (
          <>
            <h2 ref={formHeadingRef} tabIndex={-1}>
              {duplicateSource ? "Duplicerar produkt" : "Lägg till ny produkt"}
            </h2>
            {duplicateSource && (
              <p className="duplicate-hint">
                Fälten är förifyllda från originalet, inklusive bilden och
                kollektionen. Ange ny färg (och ändra typ vid behov), byt bild
                och namn.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateSource(null);
                    requestFocus("form");
                  }}
                >
                  Avbryt duplicering
                </button>
              </p>
            )}
            <ProductForm
              key={duplicateSource ? duplicateSource.name : "new"}
              initialProduct={duplicateSource}
              mode="create"
              onSubmit={handleCreate}
            />
          </>
        )}
      </section>

      <section>
        <h2 ref={listHeadingRef} tabIndex={-1}>
          Befintliga produkter
        </h2>
        {loading && <p role="status">Laddar...</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {products.length > 1 && (
          <label className="theme-select admin-sort">
            Sortera
            <select
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setAnnouncement(`Sorterar efter ${SORT_LABELS[e.target.value]}`);
              }}
            >
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}

        <ul className="admin-product-list">
          {sortedProducts.map((product) => {
            const meta = [
              product.category,
              product.color,
              collectionName(product),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={product.id}>
                {editingId === product.id ? (
                  <div
                    className="admin-edit-block"
                    role="group"
                    aria-label={`Redigerar ${product.name}`}
                  >
                    <ProductForm
                      focusOnMount
                      initialProduct={product}
                      mode="edit"
                      onSubmit={(updates) => handleUpdate(product.id, updates)}
                      onCancel={() => {
                        setEditingId(null);
                        requestFocus("edit-button", product.id);
                      }}
                    />
                    <ProductGallery productId={product.id} />
                  </div>
                ) : (
                  <div className="admin-product-row">
                    <span>
                      {product.name}
                      {meta && (
                        <small className="admin-product-meta">{meta}</small>
                      )}
                    </span>
                    <span>{product.price} slantar</span>
                    <span>{product.stock} st</span>
                    <button
                      type="button"
                      ref={(el) => {
                        editButtons.current[product.id] = el;
                      }}
                      onClick={() => setEditingId(product.id)}
                    >
                      Redigera
                      <span className="sr-only"> {product.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(product)}
                    >
                      Duplicera
                      <span className="sr-only"> {product.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product)}
                      aria-disabled={deletingId === product.id}
                      className="danger-button"
                    >
                      {deletingId === product.id ? "Tar bort..." : "Ta bort"}
                      <span className="sr-only"> {product.name}</span>
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}