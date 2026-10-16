const API_URL = import.meta.env.VITE_API_URL;

async function getJson(path, signal) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { signal });
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

export function searchProducts({
  q,
  page,
  pageSize,
  category,
  inStock,
  sort,
  signal,
}) {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category) params.set("category", category);
  if (inStock) params.set("inStock", "true");
  if (sort && sort !== "relevance") params.set("sort", sort);
  return getJson(`/api/search?${params}`, signal);
}

export async function fetchSearchCategories(signal) {
  const body = await getJson("/api/search/categories", signal);
  return body.data;
}
