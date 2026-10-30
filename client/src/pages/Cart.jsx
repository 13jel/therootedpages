import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { CURRENCY_LABELS, formatSek } from "../utils/currency";
import { startCheckout } from "../api/orders";
import { getShippingQuote } from "../api/shipping";
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

  const [postalCode, setPostalCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [shippingMethod, setShippingMethod] = useState("");
  const [servicePointId, setServicePointId] = useState("");

  const headingRef = useRef(null);
  const confirmHeadingRef = useRef(null);
  const payButtonRef = useRef(null);

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

  useEffect(() => {
    if (!userId) return;
    fetchMyProfile(userId)
      .then((profile) => {
        if (profile.address) setShippingAddress(profile.address);
      })
      .catch(() => {});
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
    if (!shippingReady) {
      setError(
        !quoteIsCurrent
          ? "Ange postnummer och hämta frakt innan du går vidare."
          : shippingMethod === ""
            ? "Välj hur du vill ha din leverans."
            : "Välj ett ombud i listan.",
      );
      return;
    }
    setError(null);
    setConfirming(true);
    requestFocus("confirm");
  }

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
        shipping: {
          method: shippingMethod,
          postalCode: quote.postalCode,
          servicePointId:
            shippingMethod === "ombud" ? servicePointId : undefined,
        },
      });
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
      setPlacing(false);
      requestFocus("pay");
    }
  }

  useEffect(() => {
    function onPageShow(e) {
      if (e.persisted) setPlacing(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);

  const cartKey = items.map((i) => `${i.product.id}x${i.quantity}`).join(",");
  const quoteIsCurrent = quote !== null && quote.cartKey === cartKey;
  const chosenOption = quoteIsCurrent
    ? quote.options.find((o) => o.method === shippingMethod)
    : undefined;
  const chosenPoint =
    quoteIsCurrent && shippingMethod === "ombud"
      ? quote.servicePoints.find((p) => p.id === servicePointId)
      : undefined;
  const shippingReady =
    chosenOption !== undefined &&
    (shippingMethod !== "ombud" || chosenPoint !== undefined);
  const grandTotal = chosenOption ? total + chosenOption.price : null;

  async function handleFetchShipping() {
    if (quoteLoading) return;
    setQuoteError(null);
    setQuoteLoading(true);
    try {
      const q = await getShippingQuote(token, {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        postalCode,
      });
      setQuote({ ...q, cartKey });
      setServicePointId((cur) =>
        q.servicePoints.some((p) => p.id === cur) ? cur : "",
      );
      setAnnouncement(
        `Frakt uppdaterad för postnummer ${q.postalCodeFormatted}. ${q.servicePoints.length} ombud hittades.`,
      );
    } catch (err) {
      setQuote(null);
      setQuoteError(err.message);
    } finally {
      setQuoteLoading(false);
    }
  }

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

              <fieldset className="shipping-section">
                <legend>Frakt</legend>

                <label htmlFor="postal-code">Postnummer</label>
                <div className="postal-row">
                  <input
                    id="postal-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    placeholder="123 45"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleFetchShipping();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleFetchShipping}
                    aria-disabled={quoteLoading}
                  >
                    {quoteLoading ? "Hämtar..." : "Visa frakt"}
                  </button>
                </div>

                {quoteError && (
                  <p className="form-error" role="alert">
                    {quoteError}
                  </p>
                )}
                {quote && !quoteIsCurrent && (
                  <p role="status">
                    Varukorgen har ändrats. Tryck på "Visa frakt" för att
                    uppdatera priserna.
                  </p>
                )}

                {quoteIsCurrent && (
                  <>
                    <p className="shipping-hint">
                      {quote.options[0].free
                        ? `Du har fri frakt, ordervärdet når ${formatSek(quote.freeShippingThreshold)}.`
                        : `Fri frakt när du handlar för ${formatSek(quote.freeShippingThreshold)} eller mer. Du saknar ${formatSek(quote.freeShippingThreshold - quote.goods)}.`}
                    </p>

                    <fieldset className="shipping-options">
                      <legend>
                        Leveranssätt för {quote.postalCodeFormatted}
                      </legend>
                      {quote.options.map((o) => (
                        <label key={o.method} className="shipping-option">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={o.method}
                            checked={shippingMethod === o.method}
                            onChange={() => setShippingMethod(o.method)}
                          />
                          <span>
                            {o.label},{" "}
                            {o.free ? "0 kr (fri frakt)" : formatSek(o.price)}
                            <br />
                            <small>
                              {o.estimatedDelivery
                                ? `Beräknad leverans: ${o.estimatedDelivery.label}`
                                : "Beräknad leverans kan inte visas just nu"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </fieldset>

                    {shippingMethod === "ombud" && (
                      <fieldset className="service-points">
                        <legend>Välj ombud</legend>
                        {quote.servicePointsError ? (
                          <p role="alert">{quote.servicePointsError}</p>
                        ) : (
                          quote.servicePoints.map((p) => (
                            <label key={p.id} className="service-point">
                              <input
                                type="radio"
                                name="servicePoint"
                                value={p.id}
                                checked={servicePointId === p.id}
                                onChange={() => setServicePointId(p.id)}
                              />
                              <span>
                                {p.name}
                                <br />
                                <small>
                                  {[
                                    p.street,
                                    [p.postalCode, p.city]
                                      .filter(Boolean)
                                      .join(" "),
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                  {p.distanceMeters !== null &&
                                    ` (${p.distanceMeters < 1000 ? `${Math.round(p.distanceMeters)} m` : `${(p.distanceMeters / 1000).toFixed(1)} km`})`}
                                </small>
                              </span>
                            </label>
                          ))
                        )}
                      </fieldset>
                    )}

                    {grandTotal !== null && (
                      <p className="shipping-total" aria-live="polite">
                        Varor {formatSek(total)}, frakt{" "}
                        {chosenOption.free
                          ? "0 kr"
                          : formatSek(chosenOption.price)}
                        . <strong>Att betala: {formatSek(grandTotal)}</strong>
                      </p>
                    )}
                  </>
                )}
              </fieldset>

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
                för <strong>{formatSek(total)}</strong> plus frakt{" "}
                {chosenOption?.free
                  ? "0 kr"
                  : formatSek(chosenOption?.price ?? 0)}
                . Totalt <strong>{formatSek(grandTotal ?? total)}</strong>. Du
                skickas vidare till Stripe för att betala.
              </p>
              <p>Levereras till: {shippingAddress}</p>
              <p>
                Frakt: {chosenOption?.label}
                {chosenPoint &&
                  `, ombud ${chosenPoint.name} (${chosenPoint.street}, ${chosenPoint.city})`}
              </p>
              {chosenOption?.estimatedDelivery && (
                <p>Beräknad leverans: {chosenOption.estimatedDelivery.label}</p>
              )}

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
