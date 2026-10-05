import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchAllOrders, updateOrderStatus } from "../api/adminOrders";

const STATUSES = ["Beställd", "Behandlas", "Levererad", "Återbetald"];

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAllOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleStatusChange(orderId, newStatus) {
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(token, orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: updated.status } : o,
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-orders">
      <nav className="admin-subnav">
        <Link to="/admin/products">Produkter</Link>
        <Link to="/admin/collections">Kollektioner</Link>
        <Link to="/admin/orders" className="active">
          Ordrar
        </Link>
        <Link to="/admin/gallery">Galleri</Link>
      </nav>

      <h1>Admin – Ordrar</h1>

      {loading && <p>Laddar...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && orders.length === 0 && <p>Inga ordrar än.</p>}

      <ul className="admin-order-list">
        {orders.map((order) => (
          <li key={order.id} className="admin-order-row">
            <div className="order-header">
              <span>Order #{order.id}</span>
              <span>{order.profiles?.email}</span>
              <span>{order.total} slantar</span>
              <span>{new Date(order.created_at).toLocaleString("sv-SE")}</span>
            </div>

            <ul className="order-items-list">
              {order.order_items.map((item) => (
                <li key={item.id}>
                  {item.products?.name} × {item.quantity} ({item.unit_price}{" "}
                  slantar/st)
                </li>
              ))}
            </ul>

            <label>
              Status:
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                disabled={updatingId === order.id}
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
