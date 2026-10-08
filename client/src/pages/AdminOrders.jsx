import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { fetchAllOrders, updateOrderStatus } from "../api/adminOrders";
import AdminNav from "../components/AdminNav";

const STATUSES = ["Beställd", "Behandlas", "Levererad", "Återbetald"];

export default function AdminOrders() {
  usePageTitle("Admin – Ordrar");

  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    fetchAllOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleStatusChange(orderId, newStatus) {
    if (updatingId === orderId) return;
    setUpdatingId(orderId);
    setError(null);
    try {
      const updated = await updateOrderStatus(token, orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: updated.status } : o,
        ),
      );
      setAnnouncement(`Order #${orderId} är nu ${updated.status}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-orders">
      <AdminNav />

      <h1>Admin – Ordrar</h1>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {loading && <p role="status">Laddar...</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loading && orders.length === 0 && <p>Inga ordrar än.</p>}

      <ul className="admin-order-list">
        {orders.map((order) => (
          <li key={order.id} className="admin-order-row">
            <div className="order-header">
              <span>Order #{order.id}</span>
              <span>
                <span className="sr-only">Kund: </span>
                {order.profiles?.email}
              </span>
              <span>
                <span className="sr-only">Totalt: </span>
                {order.total} slantar
              </span>
              <span>
                <span className="sr-only">Beställd: </span>
                <time dateTime={order.created_at}>
                  {new Date(order.created_at).toLocaleString("sv-SE")}
                </time>
              </span>
            </div>

            <ul className="order-items-list">
              {order.order_items.map((item) => (
                <li key={item.id}>
                  {item.products?.name} <span aria-hidden="true">×</span>
                  <span className="sr-only">, antal </span>
                  {item.quantity} ({item.unit_price} slantar/st)
                </li>
              ))}
            </ul>

            <label>
              Status:
              <select
                aria-label={`Status för order #${order.id}`}
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                aria-disabled={updatingId === order.id}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
