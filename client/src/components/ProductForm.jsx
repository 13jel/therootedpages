import { useEffect, useRef, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { uploadProductImage } from "../utils/image";
import { fetchCollections } from "../api/collections";

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  stock: "",
  image_url: "",
  category: "",
  color: "",
  theme: "",
  collection_id: "",
};

export default function ProductForm({
  initialProduct,
  mode = "create",
  onSubmit,
  onCancel,
  focusOnMount = false,
  defaultCollectionId = "",
}) {
  const [form, setForm] = useState(
    () =>
      initialProduct || { ...emptyProduct, collection_id: defaultCollectionId },
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialProduct?.image_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);
  const nameRef = useRef(null);

  const isEditing = mode === "edit";

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (focusOnMount) nameRef.current?.focus();
  }, [focusOnMount]);

  // Följer kollektionsfiltret i admin utan att nollställa resten av formuläret
  useEffect(() => {
    if (isEditing || initialProduct) return;
    setForm((prev) => ({ ...prev, collection_id: defaultCollectionId }));
  }, [defaultCollectionId, isEditing, initialProduct]);

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
    if (saving) return;
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
        color: form.color || null,
      });

      if (!isEditing) {
        setForm({ ...emptyProduct, collection_id: defaultCollectionId });
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
        <input
          ref={nameRef}
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
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
          alt="Förhandsvisning av vald omslagsbild"
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
        Färg (valfritt)
        <input
          name="color"
          value={form.color || ""}
          onChange={handleChange}
          placeholder="t.ex. Grön, Blå, Senap"
        />
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
        Kollektion / mönstergrupp (valfritt)
        <select
          name="collection_id"
          value={form.collection_id || ""}
          onChange={handleChange}
          aria-describedby={form.collection_id ? "collection-hint" : undefined}
        >
          <option value="">Ingen kollektion</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {form.collection_id && (
        <p id="collection-hint" className="form-hint">
          Produkter i samma kollektion visas som ett kort i butiken, där kunden
          väljer typ och färg. Namnet visas i varukorg och på ordrar, så döp
          gärna varianten till t.ex. "Mönstret – Färg – Typ".
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" aria-disabled={saving}>
          {uploading
            ? "Laddar upp bild..."
            : saving
              ? "Sparar..."
              : isEditing
                ? "Spara ändringar"
                : "Lägg till produkt"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-disabled={saving}>
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
