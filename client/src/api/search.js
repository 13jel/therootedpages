const API_URL = import.meta.env.VITE_API_URL;

export async function searchProducts({ q, page, pageSize, signal }) {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
  });
  let res;
  try {
    res = await fetch(`${API_URL}/api/search?${params}`, { signal });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Kunde inte nå servern. Försök igen om en stund.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body.details?.join(". ");
    throw new Error(detail || body.error || "Sökningen misslyckades.");
  }
  return body;
}
