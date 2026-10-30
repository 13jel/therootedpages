const API_URL = import.meta.env.VITE_API_URL;

export async function getShippingQuote(token, { items, postalCode }) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/shipping/quote`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        postalCode,
      }),
    });
  } catch {
    throw new Error("Det gick inte att nå servern. Försök igen om en stund.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Kunde inte hämta frakt.");
  return body;
}
