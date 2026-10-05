import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { uploadProductImage } from "../utils/image";

export default function ProductGallery({ productId }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadImages();
  }, [productId]);

  async function loadImages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    if (error) setError(error.message);
    else setImages(data);
    setLoading(false);
  }

  async function handleAdd(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const url = await uploadProductImage(supabase, file);
      const { error } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: url,
          sort_order: images.length,
        });
      if (error) throw new Error(error.message);
      await loadImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(imageId) {
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId);
    if (error) {
      setError(error.message);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  return (
    <div className="product-gallery-manager">
      <h4>Fler bilder (t.ex. i miljö)</h4>
      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Laddar bilder...</p>
      ) : (
        <div className="gallery-thumbs">
          {images.map((img) => (
            <div key={img.id} className="gallery-thumb">
              <img src={img.image_url} alt="" />
              <button type="button" onClick={() => handleDelete(img.id)}>
                Ta bort
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="gallery-add">
        {uploading ? "Laddar upp..." : "+ Lägg till bild"}
        <input
          type="file"
          accept="image/*"
          onChange={handleAdd}
          disabled={uploading}
          hidden
        />
      </label>
    </div>
  );
}
