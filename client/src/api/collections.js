import { apiFetch } from "./apiClient";

export function fetchCollections() {
  return apiFetch("/api/collections");
}

export function createCollection(token, collection) {
  return apiFetch("/api/collections", {
    method: "POST",
    token,
    body: JSON.stringify(collection),
  });
}

export function updateCollection(token, id, updates) {
  return apiFetch(`/api/collections/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(updates),
  });
}

export function deleteCollection(token, id) {
  return apiFetch(`/api/collections/${id}`, {
    method: "DELETE",
    token,
  });
}
