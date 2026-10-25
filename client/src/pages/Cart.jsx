import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { CURRENCY_LABELS, formatSek } from "../utils/currency";
import { startCheckout } from "../api/orders";
import { fetchMyProfile } from "../api/account";

export default function Cart() {
  usePageTitle("Varukorg");

  const { user, token, session } = useAuth();
  const { items, loading, setQuantity, removeItem } = useCart();
  const { currency, formatPrice } = useCurrency();
  const userId = user?.id;

  const [error, setError] = useState(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [placing, setPlacing] = useState(false);
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

  // Skickar bara produkt-id och antal. Servern räknar priset, sparar ordern som
  // obetald och ger tillbaka adressen till Stripes betalsida.
  async function handleConfirmPurchase() {
    if (placing) return;
    setPlacing(true);
    setError(null);
    try {
      const { url } = await startCheckout(token, {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        shipping_address: shippingAddress,
      });
      window.location.assign(url); // placing förblir true tills sidan lämnas
    } catch (err) {
      setError(err.message);
      setConfirming(false);
      setPlacing(false);
      requestFocus("pay");
    }
  }

  // Trycker kunden på "tillbaka" i webbläsaren från Stripe kan sidan återställas
  // från cache med knappen låst, så vi låser upp den igen.
  useEffect(() => {
    function onPageShow(e) {
      if (e.persisted) setPlacing(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);

  if (loading) return <p role="status">Laddar...</p>;

  return (
    <div className="cart-page">
      <p className="sr-only" role="status">
        {announcement}
      </p>

      {items.length === 0 ? (
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
                  <span className="sr-only">
                    {" "}
                    {item.product.name} ur varukorgen
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="cart-total">Totalt: {formatPrice(total)}</p>
          {currency !== "SEK" && (
            <p className="currency-note">
              Priserna visas som en uppskattning i {CURRENCY_LABELS[currency]}.
              Du betalar i svenska kronor ({formatSek(total)}).
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
            <section
              className="confirm-dialog"
              aria-labelledby="confirm-heading"
            >
              <h2 id="confirm-heading" ref={confirmHeadingRef} tabIndex={-1}>
                Bekräfta köp
              </h2>
              <p>
                Du köper {items.length} {items.length === 1 ? "vara" : "varor"}{" "}
                för <strong>{formatSek(total)}</strong>. Du skickas vidare till
                Stripe för att betala.
              </p>
              <p>Levereras till: {shippingAddress}</p>

              <div className="confirm-actions">
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  aria-disabled={placing}
                >
                  {placing
                    ? "Skickar till betalning..."
                    : "Bekräfta och betala"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (placing) return;
                    setConfirming(false);
                    requestFocus("pay");
                  }}
                  aria-disabled={placing}
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
