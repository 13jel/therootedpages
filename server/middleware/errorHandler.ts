import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { CurrencyServiceError } from "../integrations/currencyAdapter.js";
import { SupplierError } from "../integrations/supplierAdapter.js";
import { SearchServiceError } from "../integrations/searchAdapter.js";

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
  if (
    err instanceof CurrencyServiceError ||
    err instanceof SupplierError ||
    err instanceof SearchServiceError
  ) {
    console.warn(`${err.name}: ${err.message}`);
    return res.status(err.status).json({ error: err.message });
  }

  console.error("Oväntat fel:", err);
  return res.status(500).json({ error: "Något gick fel på servern." });
}
