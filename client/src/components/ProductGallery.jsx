import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { uploadProductImage } from "../utils/image";

async function fetchProductImages(productId) {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export default function ProductGallery({ productId, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const headingId = useId();

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const fileInputRef = useRef(null);
  const deleteButtons = useRef({});

  useEffect(() => {
    let cancelled = false;
    fetchProductImages(productId)
      .then((data) => {
        if (!cancelled) setImages(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Fokus på rätt ställe när knappen man tryckte på har försvunnit
  useEffect(() => {
    if (!focusRequest) return;
    const element =
      focusRequest.id === "input"
        ? fileInputRef.current
        : deleteButtons.current[focusRequest.id];
    element?.focus();
  }, [focusRequest]);

  async function handleAdd(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || uploading) {
      input.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    setAnnouncement("Laddar upp bild...");
    try {
      const url = await uploadProductImage(supabase, file);
      const { error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: url,
          sort_order: images.length,
        });
      if (insertError) throw new Error(insertError.message);
      setImages(await fetchProductImages(productId));
      setAnnouncement("Bilden laddades upp");
    } catch (err) {
      setError(err.message);
      setAnnouncement("");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function handleDelete(img, index) {
    if (!window.confirm(`Ta bort bild ${index + 1} av ${images.length}?`)) {
      return;
    }

    setError(null);
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", img.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const neighbour = images[index + 1] || images[index - 1];
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    setAnnouncement(`Bild ${index + 1} togs bort`);
    setFocusRequest({ id: neighbour ? neighbour.id : "input" });
  }

  return (
    <div
      className="product-gallery-manager"
      role="group"
      aria-labelledby={headingId}
    >
      <Heading id={headingId}>Fler bilder (t.ex. i miljö)</Heading>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status">Laddar bilder...</p>
      ) : images.length === 0 ? (
        <p className="form-hint">Inga extra bilder än.</p>
      ) : (
        <div className="gallery-thumbs" role="list">
          {images.map((img, index) => (
            <div key={img.id} className="gallery-thumb" role="listitem">
              <img src={img.image_url} alt="" />
              <button
                type="button"
                ref={(el) => {
                  deleteButtons.current[img.id] = el;
                }}
                onClick={() => handleDelete(img, index)}
              >
                Ta bort
                <span className="sr-only">
                  {" "}
                  bild {index + 1} av {images.length}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <label className={`gallery-add${uploading ? " is-busy" : ""}`}>
        {uploading ? (
          "Laddar upp..."
        ) : (
          <>
            <span aria-hidden="true">+ </span>Lägg till bild
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleAdd}
          aria-disabled={uploading}
        />
      </label>
    </div>
  );
}