import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/adminProducts";
import ProductForm from "../components/ProductForm";
import ProductGallery from "../components/ProductGallery";

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [justCreated, setJustCreated] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetchAllProductsAdmin(token)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(product) {
    const newProduct = await createProduct(token, product);
    setProducts((prev) => [...prev, newProduct]);
    setDuplicateSource(null);
    setJustCreated(newProduct); // öppnar galleri-hanteraren för den nya produkten
  }

  async function handleUpdate(id, updates) {
    const updated = await updateProduct(token, id, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
        <Link to="/admin/collections">Kollektioner</Link>
        <Link to="/admin/orders">Ordrar</Link>
        <Link to="/admin/gallery">Galleri</Link>
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
                Fälten är förifyllda från originalet, inklusive bilden. Ändra
                typ (t.ex. Tyg → Tapet), justera pris/lager, eller ladda upp en
                ny bild vid behov.{" "}
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

        <ul className="admin-product-list">
          {products.map((product) => (
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
                  <span>{product.name}</span>
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
          ))}
        </ul>
      </section>
    </div>
  );
}
