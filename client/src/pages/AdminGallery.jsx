import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { supabase } from "../api/supabaseClient";
import { uploadProductImage } from "../utils/image";
import {
  fetchGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from "../api/gallery";
import AdminNav from "../components/AdminNav";

export default function AdminGallery() {
  usePageTitle("Admin – Galleri");

  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const fileInputRef = useRef(null);
  const listHeadingRef = useRef(null);
  const editButtons = useRef({});

  useEffect(() => {
    loadItems();
  }, []);

  // Fokus på rätt ställe när knappen man tryckte på har försvunnit
  useEffect(() => {
    if (!focusRequest) return;
    const { target, id } = focusRequest;
    const element = {
      list: listHeadingRef.current,
      "edit-button": editButtons.current[id],
    }[target];
    element?.focus();
  }, [focusRequest]);

  function requestFocus(target, id) {
    setFocusRequest({ target, id });
  }

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
    if (saving) return;
    if (!file) {
      setError("Välj en bild först");
      fileInputRef.current?.focus();
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
      setFileInputKey((k) => k + 1);
      setAnnouncement("Exemplet lades till i galleriet");
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Ta bort "${item.title}" från galleriet?`)) return;
    try {
      await deleteGalleryItem(token, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setAnnouncement(`${item.title} togs bort`);
      requestFocus("list");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-products">
      <AdminNav />

      <h1>Admin – Galleri</h1>

      <p className="sr-only" role="status">
        {announcement}
      </p>

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
              key={fileInputKey}
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </label>

          {preview && (
            <img
              src={preview}
              alt="Förhandsvisning av vald bild"
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

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" aria-disabled={saving}>
            {saving ? "Sparar..." : "Lägg till"}
          </button>
        </form>
      </section>

      <section>
        <h2 ref={listHeadingRef} tabIndex={-1}>
          Befintliga exempel
        </h2>
        {loading && <p role="status">Laddar...</p>}
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
                  setAnnouncement(`${updated.title} sparades`);
                  requestFocus("edit-button", updated.id);
                }}
                onCancel={() => {
                  setEditingId(null);
                  requestFocus("edit-button", item.id);
                }}
              />
            ) : (
              <div key={item.id} className="gallery-item admin-gallery-item">
                <img src={item.image_url} alt="" loading="lazy" />
                <h3 className="gallery-item-title">{item.title}</h3>
                {item.description && (
                  <p className="admin-gallery-description">
                    {item.description}
                  </p>
                )}
                <div className="admin-gallery-actions">
                  <button
                    type="button"
                    ref={(el) => {
                      editButtons.current[item.id] = el;
                    }}
                    onClick={() => setEditingId(item.id)}
                  >
                    Redigera
                    <span className="sr-only"> {item.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="danger-button"
                  >
                    Ta bort
                    <span className="sr-only"> {item.title}</span>
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
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
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
          ref={titleRef}
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
          alt="Förhandsvisning av bilden"
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

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" aria-disabled={saving}>
          {saving ? "Sparar..." : "Spara ändringar"}
        </button>
        <button type="button" onClick={onCancel} aria-disabled={saving}>
          Avbryt
        </button>
      </div>
    </form>
  );
}