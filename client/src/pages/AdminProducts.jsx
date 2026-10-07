import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/adminProducts";
import { fetchCollections } from "../api/collections";
import { TYPE_ORDER } from "../utils/variants";
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
  }

  async function handleUpdate(id, updates) {
    const updated = await updateProduct(token, id, updates);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    );
    setEditingId(null);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Ta bort "${product.name}"? Produkten döljs från butiken men gamla ordrar påverkas inte.`,
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      await deleteProduct(token, product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-products">
      <nav className="admin-subnav">
        <Link to="/admin/products" className="active">
          Produkter
        </Link>
        <Link to="/admin/orders">Ordrar</Link>
        <Link to="/admin/gallery">Galleri</Link>
        <Link to="/admin/collections">Kollektioner</Link>
      </nav>

      <h1>Admin – Produkter</h1>

      <section>
        {justCreated ? (
          <div className="created-confirmation">
            <div className="created-banner">
              <span className="created-check">✓</span>
              <div>
                <strong>{justCreated.name}</strong> sparad i butiken.
                <p>
                  Bilder du laddar upp här nedan sparas direkt till{" "}
                  <strong>{justCreated.name}</strong> — ingen extra sparaknapp
                  behövs. Lägg till så många du vill, eller gå vidare direkt.
                </p>
              </div>
            </div>

            <ProductGallery productId={justCreated.id} />

            <button
              type="button"
              className="finish-button"
              onClick={() => setJustCreated(null)}
            >
              Klar med {justCreated.name} – lägg till nästa produkt
            </button>
          </div>
        ) : (
          <>
            <h2>
              {duplicateSource ? "Duplicerar produkt" : "Lägg till ny produkt"}
            </h2>
            {duplicateSource && (
              <p className="duplicate-hint">
                Fälten är förifyllda från originalet, inklusive bilden och
                kollektionen. Ange ny färg (och ändra typ vid behov), byt bild
                och namn.{" "}
                <button type="button" onClick={() => setDuplicateSource(null)}>
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
        <h2>Befintliga produkter</h2>
        {loading && <p>Laddar...</p>}
        {error && <p className="form-error">{error}</p>}

        {products.length > 1 && (
          <label className="theme-select admin-sort">
            Sortera
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
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
                  <div className="admin-edit-block">
                    <ProductForm
                      initialProduct={product}
                      mode="edit"
                      onSubmit={(updates) => handleUpdate(product.id, updates)}
                      onCancel={() => setEditingId(null)}
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
                    <button onClick={() => setEditingId(product.id)}>
                      Redigera
                    </button>
                    <button onClick={() => handleDuplicate(product)}>
                      Duplicera
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.id}
                      className="danger-button"
                    >
                      {deletingId === product.id ? "Tar bort..." : "Ta bort"}
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
