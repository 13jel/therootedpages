import { z } from "zod";

export class PostnordError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "PostnordError";
  }
}

function cfg() {
  const key = process.env.POSTNORD_API_KEY;
  if (!key) throw new PostnordError("Frakttjänsten är inte konfigurerad.", 500);
  return {
    key,
    base: (
      process.env.POSTNORD_BASE_URL ?? "https://atapi2.postnord.com"
    ).replace(/\/+$/, ""),
    servicePointsPath:
      process.env.POSTNORD_SERVICEPOINTS_PATH ??
      "/rest/businesslocation/v5/servicepoints/nearest/byaddress",
    transitPath:
      process.env.POSTNORD_TRANSIT_PATH ??
      "/rest/transport/v2/transittime/addresstoaddress",
    shopPostalCode: process.env.SHOP_POSTAL_CODE ?? "11122",
    serviceCodePickup: process.env.POSTNORD_SERVICE_CODE_PICKUP ?? "19",
    serviceCodeHome: process.env.POSTNORD_SERVICE_CODE_HOME ?? "17",
    timeoutMs: Number(process.env.POSTNORD_TIMEOUT_MS ?? 6000),
  };
}

export function normalizePostalCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\s+/g, "");
  return /^\d{5}$/.test(digits) ? digits : null;
}

export function formatPostalCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

async function getJson(
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const c = cfg();
  const url = new URL(c.base + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", c.key);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(c.timeoutMs),
    });
  } catch (err) {
    console.warn("PostNord svarar inte:", (err as Error).name);
    throw new PostnordError(
      "PostNord svarar inte just nu. Försök igen om en stund.",
      503,
    );
  }

  if (res.status === 401 || res.status === 403) {
    console.error(
      "PostNord nekade anropet (HTTP " +
        res.status +
        "). Kontrollera POSTNORD_API_KEY.",
    );
    throw new PostnordError("Frakttjänsten är inte tillgänglig just nu.", 502);
  }
  if (res.status === 429) {
    console.warn("PostNord: för många anrop (HTTP 429).");
    throw new PostnordError(
      "Frakttjänsten är upptagen just nu. Försök igen om en stund.",
      503,
    );
  }
  if (res.status === 400 || res.status === 404) {
    console.warn("PostNord svarade HTTP " + res.status + " på " + path);
    throw new PostnordError("PostNord hittade inget för det postnumret.", 404);
  }
  if (!res.ok) {
    console.warn("PostNord svarade HTTP " + res.status);
    throw new PostnordError(
      "Frakttjänsten svarar inte just nu. Försök igen om en stund.",
      503,
    );
  }

  try {
    return await res.json();
  } catch {
    console.error("PostNord gav svar som inte är JSON.");
    throw new PostnordError("Frakttjänsten gav ett oväntat svar.", 502);
  }
}

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 5 * 60 * 1000;

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
}

export function clearPostnordCache() {
  cache.clear();
}

export interface ServicePoint {
  id: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  distanceMeters: number | null;
}

const AddressSchema = z
  .object({
    streetName: z.string().nullish(),
    streetNumber: z.string().nullish(),
    postalCode: z.union([z.string(), z.number()]).nullish(),
    city: z.string().nullish(),
  })
  .passthrough();

const RawServicePointSchema = z
  .object({
    servicePointId: z.union([z.string(), z.number()]),
    name: z.string().min(1),
    visitingAddress: AddressSchema.nullish(),
    deliveryAddress: AddressSchema.nullish(),
    routeDistance: z.union([z.number(), z.string()]).nullish(),
  })
  .passthrough();

const ServicePointsResponseSchema = z.object({
  servicePointInformationResponse: z.object({
    servicePoints: z.array(z.unknown()).default([]),
  }),
});

export async function findServicePoints(
  postalCodeInput: string,
  limit = 5,
): Promise<ServicePoint[]> {
  const postalCode = normalizePostalCode(postalCodeInput);
  if (!postalCode) {
    throw new PostnordError(
      "Ange ett svenskt postnummer med fem siffror.",
      400,
    );
  }

  return cached(`sp:${postalCode}:${limit}`, async () => {
    const raw = await getJson(cfg().servicePointsPath, {
      returnType: "json",
      countryCode: "SE",
      postalCode,
      numberOfServicePoints: String(limit),
    });

    const parsed = ServicePointsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(
        "Oväntat svarsformat för ombud från PostNord:",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
      throw new PostnordError("Frakttjänsten gav ett oväntat svar.", 502);
    }

    const points: ServicePoint[] = [];
    for (const item of parsed.data.servicePointInformationResponse
      .servicePoints) {
      const sp = RawServicePointSchema.safeParse(item);
      if (!sp.success) {
        console.warn("Hoppar över ett ombud med oväntat format.");
        continue;
      }
      const a = sp.data.visitingAddress ?? sp.data.deliveryAddress ?? {};
      const dist = Number(sp.data.routeDistance);
      points.push({
        id: String(sp.data.servicePointId),
        name: sp.data.name,
        street: [a.streetName, a.streetNumber].filter(Boolean).join(" "),
        postalCode: a.postalCode != null ? String(a.postalCode) : "",
        city: a.city ?? "",
        distanceMeters: Number.isFinite(dist) ? dist : null,
      });
    }
    return points;
  });
}

export async function verifyServicePoint(
  postalCodeInput: string,
  servicePointId: string,
): Promise<ServicePoint | null> {
  const points = await findServicePoints(postalCodeInput);
  return points.find((p) => p.id === String(servicePointId)) ?? null;
}

export type DeliveryService = "pickup" | "home";

export interface DeliveryEstimate {
  date: string;
  label: string;
}

const TransitItemSchema = z
  .object({
    service: z
      .object({ basicServiceCode: z.union([z.string(), z.number()]) })
      .passthrough(),
    estimatedTimeOfArrival: z
      .object({ timeOfArrival: z.string().nullish() })
      .passthrough()
      .nullish(),
    errorMessage: z.string().nullish(),
  })
  .passthrough();

export function toIsoDate(value: string | number): string | null {
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  if (
    d.getUTCFullYear() !== +m[1] ||
    d.getUTCMonth() !== +m[2] - 1 ||
    d.getUTCDate() !== +m[3]
  ) {
    return null;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function formatDeliveryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
}

function localStartTime(): string {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })
    .replace(" ", "T")
    .slice(0, 16);
}

export async function estimateDelivery(
  toPostalCodeInput: string,
  service: DeliveryService,
): Promise<DeliveryEstimate> {
  const to = normalizePostalCode(toPostalCodeInput);
  if (!to)
    throw new PostnordError(
      "Ange ett svenskt postnummer med fem siffror.",
      400,
    );

  const c = cfg();
  const from = normalizePostalCode(c.shopPostalCode);
  if (!from)
    throw new PostnordError("Frakttjänsten är inte konfigurerad.", 500);
  const serviceCode =
    service === "pickup" ? c.serviceCodePickup : c.serviceCodeHome;
  const startTime = localStartTime();

  return cached(
    `tt:${from}:${to}:${serviceCode}:${startTime.slice(0, 10)}`,
    async () => {
      const raw = await getJson(c.transitPath, {
        startTime,
        serviceCodes: serviceCode,
        originPostalCode: from,
        originCountryCode: "SE",
        destinationPostalCode: to,
        destinationCountryCode: "SE",
      });

      if (!Array.isArray(raw)) {
        console.error("Oväntat svarsformat för leveranstid från PostNord.");
        throw new PostnordError("Frakttjänsten gav ett oväntat svar.", 502);
      }
      const dates: string[] = [];
      for (const item of raw) {
        const t = TransitItemSchema.safeParse(item);
        if (!t.success) continue;
        if (String(t.data.service.basicServiceCode) !== serviceCode) continue;
        if (t.data.errorMessage) continue;
        const arrival = t.data.estimatedTimeOfArrival?.timeOfArrival;
        const iso = arrival ? toIsoDate(arrival) : null;
        if (iso) dates.push(iso);
      }
      dates.sort();
      if (dates.length === 0) {
        throw new PostnordError(
          "PostNord kunde inte beräkna någon leveranstid.",
          502,
        );
      }
      return { date: dates[0], label: formatDeliveryDate(dates[0]) };
    },
  );
}
