import { CURRENCIES, CURRENCY_LABELS } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

export default function CurrencySelect() {
  const { currency, setCurrency, ratesDate, ratesError } = useCurrency();

  const title = ratesError
    ? 'Valutakurserna kunde inte hämtas just nu'
    : ratesDate
      ? `Kurser från ${ratesDate} (Frankfurter)`
      : 'Hämtar valutakurser...';

  return (
    <select
      className="currency-select"
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      aria-label="Valuta"
      title={title}
    >
      {CURRENCIES.map((code) => (
        <option key={code} value={code} disabled={Boolean(ratesError) && code !== 'SLANTAR'}>
          {CURRENCY_LABELS[code]}
        </option>
      ))}
    </select>
  );
}