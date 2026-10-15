import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["SEK", "EUR", "USD", "GBP"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type Rates = {
  base: Currency;
  date: string;
  rates: Record<string, number>;
  stale?: boolean;
};

const DEFAULT_BASE_URL = "https://api.frankfurter.dev/v2";
const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2; 
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000; 

export class CurrencyServiceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "CurrencyServiceError";
    this.status = status;
  }
}

const RateRowSchema = z.object({
  date: z.string().min(1),
  quote: z.string().min(1),
  rate: z.number().finite().positive(),
});
const RatesResponseSchema = z.array(RateRowSchema).min(1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


const cache = new Map<Currency, { rates: Rates; fetchedAt: number }>();
const inFlight = new Map<Currency, Promise<Rates>>();

export function clearRatesCache() {
  cache.clear();
  inFlight.clear();
}


async function fetchFromService(base: Currency): Promise<Rates> {
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

  const parsed = RatesResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new CurrencyServiceError(
      "Oväntat format på svaret från valutatjänsten",
      502,
    );
  }

  const rates: Record<string, number> = { [base]: 1 };
  let date = "";
  for (const row of parsed.data) {
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

async function fetchWithRetry(base: Currency): Promise<Rates> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchFromService(base);
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof CurrencyServiceError &&
        (err.status === 504 ||
          err.message === "Kunde inte nå valutatjänsten" ||
          err.message.startsWith("Valutatjänsten svarade med status 5"));
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(300);
    }
  }
  throw lastError;
}

export async function getRates(base: Currency = "SEK"): Promise<Rates> {
  const cached = cache.get(base);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  let pending = inFlight.get(base);
  if (!pending) {
    pending = fetchWithRetry(base)
      .then((rates) => {
        cache.set(base, { rates, fetchedAt: Date.now() });
        return rates;
      })
      .finally(() => inFlight.delete(base));
    inFlight.set(base, pending);
  }

  try {
    return await pending;
  } catch (err) {
    if (cached && now - cached.fetchedAt < MAX_STALE_MS) {
      return { ...cached.rates, stale: true };
    }
    throw err;
  }
}