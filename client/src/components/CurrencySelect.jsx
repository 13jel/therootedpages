import { useState } from "react";
import { CURRENCIES, CURRENCY_LABELS } from "../utils/currency";
import { useCurrency } from "../context/CurrencyContext";

export default function CurrencySelect() {
  const { currency, setCurrency, ratesDate, ratesError } = useCurrency();
  const [announcement, setAnnouncement] = useState("");

  const info = ratesError
    ? "Valutakurserna kunde inte hämtas just nu"
    : ratesDate
      ? `Kurser från ${ratesDate} (Frankfurter)`
      : "Hämtar valutakurser...";

  function handleChange(e) {
    const code = e.target.value;
    setCurrency(code);
    setAnnouncement(`Priserna visas nu i ${CURRENCY_LABELS[code]}`);
  }

  return (
    <>
      <select
        className="currency-select"
        value={currency}
        onChange={handleChange}
        aria-label="Valuta"
        aria-describedby="currency-info"
        title={info}
      >
        {CURRENCIES.map((code) => (
          <option
            key={code}
            value={code}
            disabled={Boolean(ratesError) && code !== "SLANTAR"}
          >
            {CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
      <span id="currency-info" className="sr-only">
        {info}
      </span>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </>
  );
}