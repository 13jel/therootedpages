import { apiFetch } from "./apiClient";

export function fetchAllProductsAdmin(token) {
  return apiFetch("/api/products", { token });
}

export function createProduct(token, product) {
  return apiFetch("/api/products", {
    method: "POST",
    token,
    body: JSON.stringify(product),
  });
}

export function updateProduct(token, id, updates) {
  return apiFetch(`/api/products/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(updates),
  });
}

export function deleteProduct(token, id) {
  return apiFetch(`/api/products/${id}`, {
    method: "DELETE",
    token,
  });
}
