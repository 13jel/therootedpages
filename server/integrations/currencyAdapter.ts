export const SUPPORTED_CURRENCIES = ["SEK", "EUR", "USD", "GBP"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type Rates = {
  base: Currency;
  date: string;
  rates: Record<string, number>;
};

const DEFAULT_BASE_URL = "https://api.frankfurter.dev/v2";
const TIMEOUT_MS = 5000;

export class CurrencyServiceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "CurrencyServiceError";
    this.status = status;
  }
}

type RateRow = { date: string; quote: string; rate: number };

function isRateRow(value: unknown): value is RateRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.date === "string" &&
    typeof row.quote === "string" &&
    typeof row.rate === "number" &&
    Number.isFinite(row.rate) &&
    row.rate > 0
  );
}

export async function getRates(base: Currency = "SEK"): Promise<Rates> {
  const baseUrl = process.env.FRANKFURTER_URL ?? DEFAULT_BASE_URL;
  const quotes = SUPPORTED_CURRENCIES.filter((c) => c !== base);
  const url = `${baseUrl}/rates?base=${base}&quotes=${quotes.join(",")}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new CurrencyServiceError("Valutatjänsten svarade inte i tid", 504);
    }
    throw new CurrencyServiceError("Kunde inte nå valutatjänsten", 502);
  }

  if (!response.ok) {
    throw new CurrencyServiceError(
      `Valutatjänsten svarade med status ${response.status}`,
      502,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CurrencyServiceError("Ogiltigt svar från valutatjänsten", 502);
  }

  if (!Array.isArray(body) || !body.every(isRateRow)) {
    throw new CurrencyServiceError(
      "Oväntat format på svaret från valutatjänsten",
      502,
    );
  }

  const rates: Record<string, number> = { [base]: 1 };
  let date = "";
  for (const row of body) {
    rates[row.quote] = row.rate;
    if (row.date > date) date = row.date;
  }

  const missing = quotes.filter((q) => rates[q] === undefined);
  if (missing.length > 0) {
    throw new CurrencyServiceError(
      `Valutatjänsten saknar kurs för ${missing.join(", ")}`,
      502,
    );
  }

  return { base, date, rates };
}
