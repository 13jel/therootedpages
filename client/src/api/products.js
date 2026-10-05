import { apiFetch } from "./apiClient";

export function fetchProducts() {
  return apiFetch("/api/products");
}

export function fetchProductById(id) {
  return apiFetch(`/api/products/${id}`);
}
