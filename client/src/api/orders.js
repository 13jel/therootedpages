const API_URL = import.meta.env.VITE_API_URL;

async function request(token, path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch {
    throw new Error("Det gick inte att nå servern. Försök igen om en stund.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Något gick fel.");
  return body;
}

export function startCheckout(token, { items, shipping_address }) {
  return request(token, "/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      shipping_address,
    }),
  });
}

export function fetchOrder(token, orderId) {
  return request(token, `/api/orders/${encodeURIComponent(orderId)}`);
}