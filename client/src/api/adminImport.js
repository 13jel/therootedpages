const API_URL = import.meta.env.VITE_API_URL;

export async function runImport(token, format, bransch) {
  const qs = bransch ? `?bransch=${encodeURIComponent(bransch)}` : "";
  const res = await fetch(`${API_URL}/api/admin/import/${format}${qs}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Importen misslyckades.");
  }
  return body;
}
