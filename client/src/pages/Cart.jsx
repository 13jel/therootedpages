import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCY_LABELS } from '../utils/currency';
import { createOrder } from '../api/orders';
import { fetchMyProfile } from '../api/account';

export default function Cart() {
  const { user, token, session } = useAuth();
  const { items, loading, setQuantity, removeItem, refresh } = useCart();
  const { currency, formatPrice } = useCurrency();
  const userId = user?.id;

  const [error, setError] = useState(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

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
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuantityChange(item, newQuantity) {
    if (newQuantity > item.product.stock) {
      setError(`Endast ${item.product.stock} st av "${item.product.name}" finns i lager.`);
      return;
    }
    setUpdatingId(item.id);
    try {
      await setQuantity(item, newQuantity);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleGoToConfirm(e) {
    e.preventDefault();
    setConfirming(true);
  }

  async function handleConfirmPurchase() {
    setPlacing(true);
    setError(null);
    try {
      const order = await createOrder(token, shippingAddress);
      setOrderDone(order);
      setConfirming(false);
      refresh().catch(() => {});
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    } finally {
      setPlacing(false);
    }
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);

  if (loading) return <p>Laddar...</p>;

  if (orderDone) {
    return (
      <div className="cart-page">
        <h1>Tack för din beställning!</h1>
        <p>Order #{orderDone.id} har lagts. En faktura skickas till din e-post.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <h1>Varukorg</h1>
        <p>Din varukorg är tom.</p>
        <Link to="/products" className="cta-button">Se produkter</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Varukorg</h1>

      {error && <p className="form-error">{error}</p>}

      <ul className="cart-items">
        {items.map((item) => (
          <li key={item.id} className="cart-item">
            <Link to={`/products/${item.product.id}`} className="cart-item-name">
              {item.product.name}
            </Link>

            <div className="quantity-control">
              <button
                type="button"
                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                disabled={updatingId === item.id}
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                disabled={updatingId === item.id}
              >
                +
              </button>
            </div>

            <span>{formatPrice(item.quantity * item.product.price)}</span>
            <button onClick={() => handleRemove(item)}>Ta bort</button>
          </li>
        ))}
      </ul>

      <p className="cart-total">Totalt: {formatPrice(total)}</p>
      {currency !== 'SLANTAR' && (
        <p className="currency-note">
          Priserna visas som en uppskattning i {CURRENCY_LABELS[currency]}. Ordern och
          fakturan registreras i slantar ({total} slantar).
        </p>
      )}

      {!session ? (
        <div className="cart-login-prompt">
          <h2>Nästan klart</h2>
          <p>
            Logga in eller skapa ett konto för att slutföra köpet. Din varukorg sparas och
            följer med.
          </p>
          <div className="confirm-actions">
            <Link to="/login" state={{ from: { pathname: '/cart' } }} className="cta-button">
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
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              required
            />
          </label>

          <button type="submit">Betala</button>
        </form>
      ) : (
        <div className="confirm-dialog">
          <h2>Bekräfta köp</h2>
          <p>
            Du köper {items.length} {items.length === 1 ? 'vara' : 'varor'} för{' '}
            <strong>{total} slantar</strong>.
          </p>
          <p>Levereras till: {shippingAddress}</p>

          <div className="confirm-actions">
            <button onClick={handleConfirmPurchase} disabled={placing}>
              {placing ? 'Bearbetar...' : 'Bekräfta köp'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={placing}>
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}