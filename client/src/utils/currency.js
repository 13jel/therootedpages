// "SLANTAR" är sidans egen valuta och visas utan omräkning.
// Vid omräkning till riktiga valutor räknas ett pris i databasen som SEK (1 slant = 1 SEK).
export const CURRENCIES = ['SLANTAR', 'SEK', 'EUR', 'USD', 'GBP'];

export const CURRENCY_LABELS = {
  SLANTAR: 'Slantar',
  SEK: 'SEK',
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP',
};

export function formatMoney(amount, currency, rate) {
  const value = Number(amount);
  if (currency === 'SLANTAR' || !rate) {
    return `${value} slantar`;
  }
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(value * rate);
}