import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { fetchCollections } from "../api/collections";
import { uploadProductImage } from "../utils/image";

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  stock: "",
  image_url: "",
  category: "",
  theme: "",
};

export default function ProductForm({
  initialProduct,
  mode = "create",
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(initialProduct || emptyProduct);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialProduct?.image_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);

  const isEditing = mode === "edit";

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

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
      let image_url = form.image_url;
      if (file) {
        setUploading(true);
        image_url = await uploadProductImage(supabase, file);
        setUploading(false);
      }

      await onSubmit({
        ...form,
        image_url,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
        collection_id: form.collection_id || null,
      });

      if (!isEditing) {
        setForm(emptyProduct);
        setFile(null);
        setPreview(null);
      }
    } catch (err) {
      setError(err.message);
      setUploading(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <label>
        Namn
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>

      <label>
        Beskrivning
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </label>

      <label>
        Pris (slantar)
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Lagersaldo
        <input
          name="stock"
          type="number"
          min="0"
          value={form.stock}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Omslagsbild
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </label>

      {preview && (
        <img
          src={preview}
          alt="Förhandsvisning"
          style={{
            width: 120,
            height: 150,
            objectFit: "contain",
            border: "2.5px solid var(--color-ink)",
            borderRadius: 8,
            background: "var(--color-paper)",
          }}
        />
      )}

      <label>
        Typ
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        >
          <option value="">Välj typ</option>
          <option value="Posters">Posters</option>
          <option value="Tyg">Tyg</option>
          <option value="Tapet">Tapet</option>
        </select>
      </label>

      <label>
        Tema
        <input
          name="theme"
          value={form.theme || ""}
          onChange={handleChange}
          placeholder="t.ex. Djur, Musik, Botanik"
        />
      </label>

      <label>
        Kollektion (valfritt)
        <select
          name="collection_id"
          value={form.collection_id || ""}
          onChange={handleChange}
        >
          <option value="">Ingen kollektion</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {uploading
            ? "Laddar upp bild..."
            : saving
              ? "Sparar..."
              : isEditing
                ? "Spara ändringar"
                : "Lägg till produkt"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving}>
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
