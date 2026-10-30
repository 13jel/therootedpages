import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { CurrencyServiceError } from "../integrations/currencyAdapter.js";
import { SupplierError } from "../integrations/supplierAdapter.js";
import { SearchServiceError } from "../integrations/searchAdapter.js";
import { PaymentError } from "../integrations/paymentAdapter.js";
import {
  StorageError,
  MAX_IMAGE_BYTES,
} from "../integrations/storageAdapter.js";
import { PostnordError } from "../integrations/postnordAdapter.js";
import { CartError } from "../integrations/cartPricing.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Ogiltiga värden i anropet.",
      details: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  if (err instanceof Error && err.name === "MulterError") {
    const code = (err as Error & { code?: string }).code;
    return res.status(400).json({
      error:
        code === "LIMIT_FILE_SIZE"
          ? `Bilden är för stor. Största tillåtna storlek är ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`
          : 'Ogiltig uppladdning. Skicka en enda bild i fältet "image".',
    });
  }

  if (
    err instanceof CurrencyServiceError ||
    err instanceof SupplierError ||
    err instanceof SearchServiceError ||
    err instanceof PaymentError ||
    err instanceof StorageError ||
    err instanceof PostnordError ||
    err instanceof CartError
  ) {
    console.warn(`${err.name}: ${err.message}`);
    return res.status(err.status).json({ error: err.message });
  }

  console.error("Oväntat fel:", err);
  return res.status(500).json({ error: "Något gick fel på servern." });
}
