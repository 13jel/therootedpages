const API_URL = import.meta.env.VITE_API_URL;

export async function uploadProductCover(token, productId, file) {
  const body = new FormData();
  body.append("image", file);

  let res;
  try {
    res = await fetch(
      `${API_URL}/api/products/${encodeURIComponent(productId)}/image`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      },
    );
  } catch {
    throw new Error("Det gick inte att nå servern. Bilden laddades inte upp.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Bilden kunde inte laddas upp.");
  return data;
}
