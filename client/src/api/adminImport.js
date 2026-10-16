const API_URL = import.meta.env.VITE_API_URL;

async function post(token, path) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Något gick fel.");
  return body;
}

export function runImport(token, format, bransch) {
  const qs = bransch ? `?bransch=${encodeURIComponent(bransch)}` : "";
  return post(token, `/api/admin/import/${format}${qs}`);
}

export function reindexSearch(token) {
  return post(token, "/api/admin/search/reindex");
}
