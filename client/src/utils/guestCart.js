const KEY = 'trp_guest_cart';

export function readGuestCart() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // localStorage kan vara blockerat (t.ex. privat läge), korgen blir då bara tillfällig
  }
}

export function clearGuestCart() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignoreras
  }
}