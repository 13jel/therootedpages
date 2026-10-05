import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabaseClient";
import { uploadProductImage } from "../utils/image";
import {
  fetchGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from "../api/gallery";

export default function AdminGallery() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  function loadItems() {
    setLoading(true);
    fetchGallery()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Välj en bild först");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const image_url = await uploadProductImage(supabase, file);
      await createGalleryItem(token, { title, description, image_url });
      setTitle("");
      setDescription("");
      setFile(null);
      setPreview(null);
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Ta bort detta galleriexempel?")) return;
    try {
      await deleteGalleryItem(token, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-products">
      <nav className="admin-subnav">
        <Link to="/admin/products">Produkter</Link>
        <Link to="/admin/collections">Kollektioner</Link>
        <Link to="/admin/orders">Ordrar</Link>
        <Link to="/admin/gallery" className="active">
          Galleri
        </Link>
      </nav>

      <h1>Admin – Galleri</h1>

      <section>
        <h2>Lägg till exempel</h2>
        <form onSubmit={handleSubmit} className="product-form">
          <label>
            Titel
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <label>
            Bild
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </label>

          {preview && (
            <img
              src={preview}
              alt="Förhandsvisning"
              style={{
                width: 120,
                height: 120,
                objectFit: "contain",
                border: "2.5px solid var(--color-ink)",
                borderRadius: 8,
                background: "var(--color-paper)",
              }}
            />
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Sparar..." : "Lägg till"}
          </button>
        </form>
      </section>

      <section>
        <h2>Befintliga exempel</h2>
        {loading && <p>Laddar...</p>}
        <div className="gallery-grid">
          {items.map((item) =>
            editingId === item.id ? (
              <GalleryEditForm
                key={item.id}
                item={item}
                token={token}
                onSaved={(updated) => {
                  setItems((prev) =>
                    prev.map((i) => (i.id === updated.id ? updated : i)),
                  );
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={item.id} className="gallery-item admin-gallery-item">
                <img src={item.image_url} alt={item.title} />
                <h3>{item.title}</h3>
                {item.description && (
                  <p className="admin-gallery-description">
                    {item.description}
                  </p>
                )}
                <div className="admin-gallery-actions">
                  <button type="button" onClick={() => setEditingId(item.id)}>
                    Redigera
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="danger-button"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function GalleryEditForm({ item, token, onSaved, onCancel }) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(item.image_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let image_url = item.image_url;
      if (file) {
        image_url = await uploadProductImage(supabase, file);
      }
      const updated = await updateGalleryItem(token, item.id, {
        title,
        description,
        image_url,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="product-form gallery-edit-form">
      <label>
        Titel
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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

      <label>
        Byt bild (valfritt)
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </label>

      {preview && (
        <img
          src={preview}
          alt="Förhandsvisning"
          style={{
            width: 120,
            height: 120,
            objectFit: "contain",
            border: "2.5px solid var(--color-ink)",
            borderRadius: 8,
            background: "var(--color-paper)",
          }}
        />
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Sparar..." : "Spara ändringar"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Avbryt
        </button>
      </div>
    </form>
  );
}
