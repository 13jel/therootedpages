import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from "../api/collections";

export default function AdminCollections() {
  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    fetchCollections()
      .then(setCollections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createCollection(token, { name, description });
      setName("");
      setDescription("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDescription(c.description || "");
  }

  async function handleUpdate(id) {
    try {
      await updateCollection(token, id, {
        name: editName,
        description: editDescription,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        "Ta bort kollektionen? Produkter kopplade till den blir kvar men förlorar kollektionstillhörigheten.",
      )
    )
      return;
    try {
      await deleteCollection(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-products">
      <nav className="admin-subnav">
        <Link to="/admin/products">Produkter</Link>
        <Link to="/admin/orders">Ordrar</Link>
        <Link to="/admin/gallery">Galleri</Link>
        <Link to="/admin/collections" className="active">
          Kollektioner
        </Link>
      </nav>

      <h1>Admin – Kollektioner</h1>

      <section>
        <h2>Skapa ny kollektion</h2>
        <form onSubmit={handleCreate} className="product-form">
          <label>
            Namn
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Beskrivning
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? "Sparar..." : "Skapa kollektion"}
          </button>
        </form>
      </section>

      <section>
        <h2>Befintliga kollektioner</h2>
        {loading && <p>Laddar...</p>}
        <ul className="admin-product-list">
          {collections.map((c) => (
            <li key={c.id}>
              {editingId === c.id ? (
                <div className="product-form">
                  <label>
                    Namn
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </label>
                  <label>
                    Beskrivning
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </label>
                  <div className="form-actions">
                    <button type="button" onClick={() => handleUpdate(c.id)}>
                      Spara
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-product-row">
                  <span>{c.name}</span>
                  <span>{c.description || "—"}</span>
                  <button onClick={() => startEdit(c)}>Redigera</button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="danger-button"
                  >
                    Ta bort
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
