import { apiFetch } from "./apiClient";

export function fetchCart(token) {
  return apiFetch("/api/cart", { token });
}

export function addToCart(token, productId, quantity = 1) {
  return apiFetch("/api/cart", {
    method: "POST",
    token,
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export function updateCartItemQuantity(token, productId, quantity) {
  return apiFetch("/api/cart", {
    method: "POST",
    token,
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export function removeFromCart(token, cartItemId) {
  return apiFetch(`/api/cart/${cartItemId}`, {
    method: "DELETE",
    token,
  });
}
