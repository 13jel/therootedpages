import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../api/apiClient";
import { CURRENCIES, formatMoney } from "../utils/currency";

const CurrencyContext = createContext(null);
const STORAGE_KEY = "trp_currency";

function readStoredCurrency() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return CURRENCIES.includes(stored) ? stored : "SEK";
  } catch {
    return "SEK";
  }
}

export function CurrencyProvider({ children }) {
  const [chosen, setChosen] = useState(readStoredCurrency);
  const [rates, setRates] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [ratesError, setRatesError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/currency/rates")
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates);
        setRatesDate(data.date);
      })
      .catch((err) => {
        if (!cancelled) setRatesError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Går kurserna inte att hämta visas kronor, men valet sparas till nästa gång
  const currency = ratesError ? "SEK" : chosen;

  const setCurrency = useCallback((next) => {
    if (!CURRENCIES.includes(next)) return;
    setChosen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage blockerat, valet gäller bara tills sidan laddas om
    }
  }, []);

  const formatPrice = useCallback(
    (amount) => formatMoney(amount, currency, rates?.[currency]),
    [currency, rates],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, formatPrice, ratesDate, ratesError }),
    [currency, setCurrency, formatPrice, ratesDate, ratesError],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
