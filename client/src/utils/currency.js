export const CURRENCIES = ["SEK", "EUR", "USD", "GBP"];

export const CURRENCY_LABELS = {
  SEK: "Svenska kronor (SEK)",
  EUR: "Euro (EUR)",
  USD: "Amerikanska dollar (USD)",
  GBP: "Brittiska pund (GBP)",
};

function format(value, currency) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMoney(amount, currency = "SEK", rate) {
  if (currency === "SEK" || !rate) return format(Number(amount), "SEK");
  return format(Number(amount) * rate, currency);
}

export function formatSek(amount) {
  return format(Number(amount), "SEK");
}
