import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyProfile, updateMyProfile } from "../api/account";
import { apiFetch } from "../api/apiClient";

export default function Account() {
  const { user, token } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchMyProfile(user.id)
      .then((data) =>
        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          address: data.address || "",
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));

    apiFetch("/api/orders/mine", { token })
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingOrders(false));
  }, [user, token]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile(user.id, form);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="account-page">
      <h1>Mina sidor</h1>

      <section className="account-section">
        <h2>Mina uppgifter</h2>
        {loadingProfile ? (
          <p>Laddar...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Förnamn
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
              />
            </label>

            <label>
              Efternamn
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
              />
            </label>

            <label>
              Telefonnummer
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
              />
            </label>

            <label>
              Standardadress
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" disabled={saving}>
              {saving ? "Sparar..." : "Spara uppgifter"}
            </button>
            {saved && <p className="save-confirmation">Sparat!</p>}
          </form>
        )}
      </section>

      <section className="account-section">
        <h2>Mina beställningar</h2>
        {loadingOrders ? (
          <p>Laddar...</p>
        ) : orders.length === 0 ? (
          <p>Du har inte lagt några beställningar än.</p>
        ) : (
          <ul className="my-order-list">
            {orders.map((order) => (
              <li key={order.id} className="my-order-row">
                <div className="my-order-header">
                  <span>Order #{order.id}</span>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status}
                  </span>
                  <span>{order.total} slantar</span>
                  <span>
                    {new Date(order.created_at).toLocaleDateString("sv-SE")}
                  </span>
                </div>
                <ul className="order-items-list">
                  {order.order_items.map((item) => (
                    <li key={item.id}>
                      {item.products?.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
