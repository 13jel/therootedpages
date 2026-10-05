import { apiFetch } from "./apiClient";

export function fetchAllOrders(token) {
  return apiFetch("/api/orders", { token });
}

export function updateOrderStatus(token, orderId, status) {
  return apiFetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}
