import { apiFetch } from "./apiClient";

export function createOrder(token, shippingAddress) {
  return apiFetch("/api/orders", {
    method: "POST",
    token,
    body: JSON.stringify({ shipping_address: shippingAddress }),
  });
}
