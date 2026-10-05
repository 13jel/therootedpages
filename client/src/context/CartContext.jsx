import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity,
  removeFromCart,
} from '../api/cart';
import { readGuestCart, writeGuestCart, clearGuestCart } from '../utils/guestCart';

const CartContext = createContext(null);

// Flyttar gästens korg till databasen. Rensar localStorage först så att
// en dubbelkörning (React StrictMode i dev) inte lägger till samma varor två gånger.
async function mergeGuestCart(authToken) {
  const guest = readGuestCart();
  if (guest.length === 0) return false;
  clearGuestCart();

  try {
    const existing = await fetchCart(authToken);
    for (const g of guest) {
      const match = existing.find((e) => e.product.id === g.product.id);
      const stock = g.product.stock ?? Infinity;
      const qty = Math.min((match?.quantity || 0) + g.quantity, stock);
      if (qty < 1) continue;
      await apiAddToCart(authToken, g.product.id, qty);
    }
    return true;
  } catch {
    writeGuestCart(guest); // något gick fel, behåll gästkorgen så inget försvinner
    return false;
  }
}

export function CartProvider({ children }) {
  const { session, user, token, loading: authLoading } = useAuth();
  const [guestItems, setGuestItems] = useState(() => readGuestCart());
  const [db, setDb] = useState({ userId: null, items: [] });
  const syncRef = useRef(null);

  const userId = user?.id ?? null;
  const dbReady = !!userId && db.userId === userId;
  const items = session ? (dbReady ? db.items : []) : guestItems;
  const loading = authLoading || (!!session && !dbReady);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    if (authLoading) return;
    if (!userId || !token) {
      syncRef.current = null;
      return;
    }

    let cancelled = false;

    if (!syncRef.current || syncRef.current.userId !== userId) {
      syncRef.current = {
        userId,
        promise: mergeGuestCart(token).then((merged) => {
          if (merged) setGuestItems([]);
        }),
      };
    }

    syncRef.current.promise
      .then(() => fetchCart(token))
      .then((data) => {
        if (!cancelled) setDb({ userId, items: data });
      })
      .catch(() => {
        if (!cancelled) setDb({ userId, items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, token]);

  const addItem = useCallback(
    async (product, quantity = 1) => {
      const stock = product.stock ?? Infinity;

      if (session) {
        const current = await fetchCart(token);
        const existing = current.find((i) => i.product.id === product.id);
        const qty = Math.min((existing?.quantity || 0) + quantity, stock);
        if (qty < 1) return;
        await apiAddToCart(token, product.id, qty);
        const data = await fetchCart(token);
        setDb({ userId, items: data });
        return;
      }

      const existing = guestItems.find((i) => i.product.id === product.id);
      const qty = Math.min((existing?.quantity || 0) + quantity, stock);
      if (qty < 1) return;

      const next = existing
        ? guestItems.map((i) => (i.product.id === product.id ? { ...i, quantity: qty } : i))
        : [
            ...guestItems,
            {
              id: `guest-${product.id}`,
              quantity: qty,
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                stock: product.stock,
              },
            },
          ];
      setGuestItems(next);
      writeGuestCart(next);
    },
    [session, token, userId, guestItems]
  );

  const removeItem = useCallback(
    async (item) => {
      if (session) {
        await removeFromCart(token, item.id);
        setDb((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== item.id) }));
        return;
      }
      const next = guestItems.filter((i) => i.id !== item.id);
      setGuestItems(next);
      writeGuestCart(next);
    },
    [session, token, guestItems]
  );

  const setQuantity = useCallback(
    async (item, quantity) => {
      if (quantity < 1) {
        await removeItem(item);
        return;
      }
      if (session) {
        await updateCartItemQuantity(token, item.product.id, quantity);
        setDb((prev) => ({
          ...prev,
          items: prev.items.map((i) => (i.id === item.id ? { ...i, quantity } : i)),
        }));
        return;
      }
      const next = guestItems.map((i) => (i.id === item.id ? { ...i, quantity } : i));
      setGuestItems(next);
      writeGuestCart(next);
    },
    [session, token, guestItems, removeItem]
  );

  const refresh = useCallback(async () => {
    if (!session || !userId) return;
    const data = await fetchCart(token);
    setDb({ userId, items: data });
  }, [session, token, userId]);

  const value = { items, loading, itemCount, addItem, removeItem, setQuantity, refresh };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}