import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatSek } from "../utils/currency";
import { fetchOrder } from "../api/orders";
import { usePageTitle } from "../hooks/usePageTitle";
import ShippingSummary from "../components/ShippingSummary";

const POLL_MS = 2000;
const MAX_POLLS = 15; 

const PAID = ["Beställd", "Behandlas", "Levererad"];

export default function OrderConfirmation() {
  usePageTitle("Orderbekräftelse");
  const { token } = useAuth();
  const { refresh } = useCart();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const isPaid = order ? PAID.includes(order.status) : false;
  useEffect(() => {
    if (isPaid) refresh().catch(() => {});
  }, [isPaid, refresh]);

  useEffect(() => {
    if (!token || !orderId) return;
    let cancelled = false;
    let timer;
    let polls = 0;

    async function load() {
      try {
        const o = await fetchOrder(token, orderId);
        if (cancelled) return;
        setOrder(o);
        setError(null);
        if (o.status === "Obetald") {
          if (++polls < MAX_POLLS) timer = setTimeout(load, POLL_MS);
          else setGaveUp(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, orderId, attempt]);

  if (!orderId) {
    return (
      <div className="order-confirmation">
        <h1 ref={headingRef} tabIndex={-1}>
          Orderbekräftelse
        </h1>
        <p role="alert">Ingen order angiven.</p>
        <Link to="/products">Till butiken</Link>
      </div>
    );
  }

  return (
    <div className="order-confirmation">
      <h1 ref={headingRef} tabIndex={-1}>
        Orderbekräftelse
      </h1>

      {error && <p role="alert">{error}</p>}
      {!order && !error && <p role="status">Hämtar din order…</p>}

      {order && <StatusMessage order={order} gaveUp={gaveUp} />}

      {order && gaveUp && order.status === "Obetald" && (
        <button
          type="button"
          onClick={() => {
            setGaveUp(false);
            setAttempt((n) => n + 1);
          }}
        >
          Kolla igen
        </button>
      )}

      {order && (
        <section aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Order #{order.id}</h2>
          <p>
            Status: <strong>{order.status}</strong>
          </p>
          <ul className="order-confirmation-items">
            {order.order_items?.map((item) => (
              <li key={item.id}>
                {item.product_name} <span aria-hidden="true">×</span>
                <span className="sr-only">, antal </span>
                {item.quantity}
                <span className="order-confirmation-price">
                  {formatSek(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <ShippingSummary order={order} />
          <p className="order-confirmation-total">
            Totalt inklusive frakt: <strong>{formatSek(order.total)}</strong>
          </p>
        </section>
      )}

      <p>
        <Link to="/products">Fortsätt handla</Link>
      </p>
    </div>
  );
}

function StatusMessage({ order, gaveUp }) {
  switch (order.status) {
    case "Obetald":
      return gaveUp ? (
        <p role="status">
          Vi har inte fått bekräftelse på betalningen än. Har du betalat
          uppdateras ordern så snart betalningen kommit fram.
        </p>
      ) : (
        <p role="status">Väntar på bekräftelse av betalningen…</p>
      );
    case "Avbruten":
      return (
        <p role="alert">
          Betalningen genomfördes inte och ordern är avbruten. Inget har dragits
          från ditt kort. <Link to="/cart">Tillbaka till varukorgen</Link>
        </p>
      );
    case "Återbetald":
      return <p role="status">Ordern är återbetald.</p>;
    default:
      return <p role="status">Tack för din beställning! Betalningen är genomförd.</p>;
  }
}
