import { apiFetch } from "./apiClient";

export function fetchGallery() {
  return apiFetch("/api/gallery");
}

export function createGalleryItem(token, item) {
  return apiFetch("/api/gallery", {
    method: "POST",
    token,
    body: JSON.stringify(item),
  });
}

export function updateGalleryItem(token, id, updates) {
  return apiFetch(`/api/gallery/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(updates),
  });
}

export function deleteGalleryItem(token, id) {
  return apiFetch(`/api/gallery/${id}`, {
    method: "DELETE",
    token,
  });
}
