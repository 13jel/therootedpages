import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { CURRENCY_LABELS } from "../utils/currency";
import { createOrder } from "../api/orders";
import { fetchMyProfile } from "../api/account";

export default function Cart() {
  usePageTitle("Varukorg");

  const { user, token, session } = useAuth();
  const { items, loading, setQuantity, removeItem, refresh } = useCart();
  const { currency, formatPrice } = useCurrency();
  const userId = user?.id;

  const [error, setError] = useState(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const headingRef = useRef(null);
  const confirmHeadingRef = useRef(null);
  const payButtonRef = useRef(null);

  // Flyttar fokus efter en ändring som annars skulle lämna fokus på ett element som försvunnit
  useEffect(() => {
    if (!focusRequest) return;
    const target = {
      heading: headingRef,
      confirm: confirmHeadingRef,
      pay: payButtonRef,
    }[focusRequest.name];
    target?.current?.focus();
  }, [focusRequest]);

  function requestFocus(name) {
    setFocusRequest({ name });
  }

  // Förifyll leveransadress med kundens sparade standardadress, om den finns
  useEffect(() => {
    if (!userId) return;
    fetchMyProfile(userId)
      .then((profile) => {
        if (profile.address) setShippingAddress(profile.address);
      })
      .catch(() => {
        // ingen sparad adress, fältet får vara tomt
      });
  }, [userId]);

  async function handleRemove(item) {
    try {
      await removeItem(item);
      setError(null);
      setAnnouncement(`${item.product.name} togs bort ur varukorgen`);
      requestFocus("heading");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuantityChange(item, newQuantity) {
    if (updatingId === item.id) return;

    if (newQuantity > item.product.stock) {
      setError(
        `Endast ${item.product.stock} st av "${item.product.name}" finns i lager.`,
      );
      return;
    }
    setUpdatingId(item.id);
    try {
      await setQuantity(item, newQuantity);
      setError(null);
      if (newQuantity < 1) {
        setAnnouncement(`${item.product.name} togs bort ur varukorgen`);
        requestFocus("heading");
      } else {
        setAnnouncement(`${item.product.name}: antal ${newQuantity}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleGoToConfirm(e) {
    e.preventDefault();
    setConfirming(true);
    requestFocus("confirm");
  }

  async function handleConfirmPurchase() {
    setPlacing(true);
    setError(null);
    try {
      const order = await createOrder(token, shippingAddress);
      setOrderDone(order);
      setConfirming(false);
      requestFocus("heading");
      refresh().catch(() => {});
    } catch (err) {
      setError(err.message);
      setConfirming(false);
      requestFocus("pay");
    } finally {
      setPlacing(false);
    }
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);

  if (loading) return <p role="status">Laddar...</p>;

  return (
    <div className="cart-page">
      <p className="sr-only" role="status">
        {announcement}
      </p>

      {orderDone ? (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Tack för din beställning!
          </h1>
          <p>Order #{orderDone.id} har lagts. Du hittar den under Mina sidor.</p>
        </>
      ) : items.length === 0 ? (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Varukorg
          </h1>
          <p>Din varukorg är tom.</p>
          <Link to="/products" className="cta-button">
            Se produkter
          </Link>
        </>
      ) : (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Varukorg
          </h1>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <ul className="cart-items" aria-label="Varor i varukorgen">
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <Link
                  to={`/products/${item.product.id}`}
                  className="cart-item-name"
                >
                  {item.product.name}
                </Link>

                <div
                  className="quantity-control"
                  role="group"
                  aria-label={`Antal: ${item.product.name}`}
                >
                  <button
                    type="button"
                    aria-label={`Minska antal: ${item.product.name}`}
                    aria-disabled={updatingId === item.id}
                    onClick={() =>
                      handleQuantityChange(item, item.quantity - 1)
                    }
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Öka antal: ${item.product.name}`}
                    aria-disabled={updatingId === item.id}
                    onClick={() =>
                      handleQuantityChange(item, item.quantity + 1)
                    }
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>

                <span>{formatPrice(item.quantity * item.product.price)}</span>
                <button type="button" onClick={() => handleRemove(item)}>
                  Ta bort
                  <span className="sr-only"> {item.product.name} ur varukorgen</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="cart-total">Totalt: {formatPrice(total)}</p>
          {currency !== "SLANTAR" && (
            <p className="currency-note">
              Priserna visas som en uppskattning i {CURRENCY_LABELS[currency]}.
              Ordern registreras i slantar ({total} slantar).
            </p>
          )}

          {!session ? (
            <div className="cart-login-prompt">
              <h2>Nästan klart</h2>
              <p>
                Logga in eller skapa ett konto för att slutföra köpet. Din
                varukorg sparas och följer med.
              </p>
              <div className="confirm-actions">
                <Link
                  to="/login"
                  state={{ from: { pathname: "/cart" } }}
                  className="cta-button"
                >
                  Logga in
                </Link>
                <Link to="/register" className="cta-button">
                  Skapa konto
                </Link>
              </div>
            </div>
          ) : !confirming ? (
            <form onSubmit={handleGoToConfirm} className="checkout-form">
              <label>
                Leveransadress
                <textarea
                  autoComplete="street-address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                />
              </label>

              <button type="submit" ref={payButtonRef}>
                Betala
              </button>
            </form>
          ) : (
            <section className="confirm-dialog" aria-labelledby="confirm-heading">
              <h2 id="confirm-heading" ref={confirmHeadingRef} tabIndex={-1}>
                Bekräfta köp
              </h2>
              <p>
                Du köper {items.length} {items.length === 1 ? "vara" : "varor"}{" "}
                för <strong>{total} slantar</strong>.
              </p>
              <p>Levereras till: {shippingAddress}</p>

              <div className="confirm-actions">
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={placing}
                >
                  {placing ? "Bearbetar..." : "Bekräfta köp"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    requestFocus("pay");
                  }}
                  disabled={placing}
                >
                  Avbryt
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}