import { z } from "zod";
import { parse as parseCsv } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";

export type ImportFormat = "csv" | "xml";

export interface MappedProduct {
  sku: string;
  ean: string | null;
  name: string;
  category: string;
  price: number;
  stock: number;
  variants: string[];
  supplier_updated_at: string | null;
  source: "supplier";
}

export interface SkippedRow {
  sku: string;
  reason: string;
}

export interface ParseResult {
  products: MappedProduct[];
  skipped: SkippedRow[];
  total: number;
}

export class SupplierError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "SupplierError";
  }
}

const emptyToNull = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "")
    ? null
    : v;

const RawRow = z.object({
  artNr: z
    .string({ error: "artNr saknas" })
    .trim()
    .regex(/^LEV-\d+$/, "ogiltigt artikelnummer"),
  ean: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .regex(/^\d{13}$/, "EAN måste vara 13 siffror")
      .nullable(),
  ),
  benamning: z
    .string({ error: "benämning saknas" })
    .trim()
    .min(1, "benämning saknas"),
  kategori: z
    .string({ error: "kategori saknas" })
    .trim()
    .min(1, "kategori saknas"),
  prisKr: z
    .number({ error: "pris saknas eller är inte ett tal" })
    .finite("pris är inte ett tal")
    .min(0, "negativt pris"),
  lagersaldo: z.preprocess(
    emptyToNull,
    z
      .number({ error: "lagersaldo är inte ett tal" })
      .int("lagersaldo är inte ett heltal")
      .min(0, "negativt lagersaldo")
      .nullable(),
  ),
  varianter: z.array(z.string()),
  uppdaterad: z.preprocess(
    emptyToNull,
    z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), "ogiltigt datum")
      .nullable(),
  ),
});

export function parseDecimal(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

function parseIntOrNull(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  return /^-?\d+$/.test(s) ? Number(s) : NaN;
}

function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object") {
    const inner = (value as Record<string, unknown>)["#text"];
    return inner === undefined ? "" : String(inner);
  }
  return String(value);
}

function rawToMapped(raw: z.infer<typeof RawRow>): MappedProduct {
  return {
    sku: raw.artNr,
    ean: raw.ean,
    name: raw.benamning,
    category: raw.kategori,
    price: Math.round(raw.prisKr),
    stock: raw.lagersaldo ?? 0,
    variants: raw.varianter,
    supplier_updated_at: raw.uppdaterad,
    source: "supplier",
  };
}

function validateRows(rows: Record<string, unknown>[]): ParseResult {
  const products: MappedProduct[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const sku = text(row.artNr)?.trim() || "(saknar artikelnummer)";
    const parsed = RawRow.safeParse(row);
    if (!parsed.success) {
      const reason = parsed.error.issues.map((i) => i.message).join("; ");
      skipped.push({ sku, reason });
      continue;
    }
    if (seen.has(parsed.data.artNr)) {
      skipped.push({ sku, reason: "dubblett i filen" });
      continue;
    }
    seen.add(parsed.data.artNr);
    products.push(rawToMapped(parsed.data));
  }
  return { products, skipped, total: rows.length };
}

export function parseSupplierCsv(buffer: Buffer): ParseResult {
  let content = new TextDecoder("windows-1252").decode(buffer);
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  let records: Record<string, string>[];
  try {
    records = parseCsv(content, {
      delimiter: ";",
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      cast: false,
    });
  } catch (err) {
    throw new SupplierError(
      `Kunde inte tolka CSV-filen: ${(err as Error).message}`,
    );
  }

  const rows = records.map((r) => ({
    artNr: r.artNr,
    ean: r.ean,
    benamning: r.benamning,
    kategori: r.kategori,
    prisKr: parseDecimal(r.pris),
    lagersaldo: parseIntOrNull(r.lagersaldo),
    varianter: (r.varianter ?? "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean),
    uppdaterad: r.uppdaterad,
  }));
  return validateRows(rows);
}

export function parseSupplierXml(buffer: Buffer): ParseResult {
  const xml = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => name === "produkt" || name === "variant",
  });

  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch (err) {
    throw new SupplierError(
      `Kunde inte tolka XML-filen: ${(err as Error).message}`,
    );
  }
  if (!doc?.katalog) {
    throw new SupplierError("XML-filen saknar rotelementet <katalog>.");
  }

  const items: any[] = doc.katalog.produkt ?? [];
  const rows = items.map((p) => {
    const variantList: unknown[] = p.varianter?.variant ?? [];
    return {
      artNr: text(p["@_artNr"]),
      ean: text(p.ean),
      benamning: text(p.benamning),
      kategori: text(p.kategori),
      prisKr: parseDecimal(text(p.pris)),
      lagersaldo: parseIntOrNull(p.lagersaldo),
      varianter: variantList
        .map((v) => String(typeof v === "object" ? "" : v).trim())
        .filter(Boolean),
      uppdaterad: text(p.uppdaterad),
    };
  });
  return validateRows(rows);
}

export function parseSupplierFile(
  format: ImportFormat,
  buffer: Buffer,
): ParseResult {
  return format === "csv" ? parseSupplierCsv(buffer) : parseSupplierXml(buffer);
}

/* ------------------------------------------------------------------ */
/* Hämtning med timeout, retry och vänliga fel                         */
/* ------------------------------------------------------------------ */

const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function config() {
  const baseUrl = process.env.SUPPLIER_API_URL;
  const apiKey = process.env.SUPPLIER_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new SupplierError(
      "Leverantörens API är inte konfigurerat (SUPPLIER_API_URL / SUPPLIER_API_KEY saknas).",
      500,
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function fetchBuffer(path: string): Promise<Buffer> {
  const { baseUrl, apiKey } = config();
  let lastProblem = "okänt fel";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { "X-Api-Key": apiKey },
        signal: controller.signal,
      });

      if (res.ok) return Buffer.from(await res.arrayBuffer());

      if (res.status === 401) {
        throw new SupplierError(
          "Leverantören nekade åtkomst. Kontrollera API-nyckeln.",
          502,
        );
      }
      if (res.status === 429) {
        const wait = Number(res.headers.get("Retry-After")) || 10;
        lastProblem = "för många anrop till leverantören";
        await sleep(Math.min(wait, 15) * 1000);
        continue;
      }
      if (res.status >= 500) {
        lastProblem = `leverantören svarade ${res.status}`;
        await sleep(300 * 2 ** (attempt - 1));
        continue;
      }
      throw new SupplierError(
        `Leverantören svarade med oväntad status ${res.status}.`,
      );
    } catch (err) {
      if (err instanceof SupplierError) throw err;
      lastProblem =
        (err as Error).name === "AbortError"
          ? "leverantören svarade inte i tid"
          : "kunde inte nå leverantören";
      await sleep(300 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new SupplierError(
    `Leverantören är inte tillgänglig just nu (${lastProblem}). Försök igen om en stund.`,
    503,
  );
}

export async function fetchSupplierCatalog(
  format: ImportFormat,
  bransch: string,
): Promise<ParseResult> {
  const buffer = await fetchBuffer(
    `/export/products.${format}?bransch=${encodeURIComponent(bransch)}`,
  );
  return parseSupplierFile(format, buffer);
}
